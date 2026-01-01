import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.infrastructure.database.mongodb import mongodb_client
from app.models.conversation_schema import (
    ConversationListItem, ConversationListResponse, ConversationDetailResponse,
    UpdateConversationTitleRequest, UpdateConversationTagsRequest,
    ConversationCompactRequest, ConversationCompactResponse,
    TokenUsage, UpdateConversationStatusRequest, UpdateInputConfigRequest
)
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations_list(current_user: CurrentUser = Depends(get_current_user)):
    """获取对话列表（返回所有类型的对话）"""
    try:
        user_id = current_user.user_id
        conversations = await mongodb_client.list_conversations(
            user_id=user_id,
            conversation_type=None,
            limit=200,
            skip=0
        )

        # 转换为完整格式
        conversation_items = []
        for conv in conversations:
            # 处理时间格式
            created_at = conv.get("created_at", "")
            updated_at = conv.get("updated_at", "")

            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            elif created_at:
                created_at = str(created_at)

            if isinstance(updated_at, datetime):
                updated_at = updated_at.isoformat()
            elif updated_at:
                updated_at = str(updated_at)

            # 处理token使用量统计
            total_token_usage = conv.get("total_token_usage", {})
            token_usage = TokenUsage(
                total_tokens=total_token_usage.get("total_tokens", 0),
                prompt_tokens=total_token_usage.get("prompt_tokens", 0),
                completion_tokens=total_token_usage.get("completion_tokens", 0)
            )

            conversation_items.append(ConversationListItem(
                conversation_id=conv["_id"],
                user_id=conv.get("user_id", "default_user"),
                type=conv.get("type", "agent"),
                title=conv.get("title", "新对话"),
                created_at=created_at,
                updated_at=updated_at,
                round_count=conv.get("round_count", 0),
                total_token_usage=token_usage,
                status=conv.get("status", "active"),
                tags=conv.get("tags", [])
            ))

        return ConversationListResponse(
            conversations=conversation_items,
            total_count=len(conversation_items)
        )

    except Exception as e:
        logger.error(f"获取对话列表出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取对话列表出错: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse,
            response_model_exclude_none=True)
async def get_conversation_detail(
        conversation_id: str,
        current_user: CurrentUser = Depends(get_current_user)
):
    """获取对话完整内容（支持所有类型的对话）"""
    try:
        # 直接调用mongodb_client的get_conversation_with_messages方法
        conversation = await mongodb_client.get_conversation_with_messages(conversation_id)

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以访问所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此对话"
            )

        # 处理轮次数据 - 转换为OpenAI格式
        rounds = conversation.get("rounds", [])
        conversation_type = conversation.get("type", "agent")

        # 准备响应数据
        response_data = {
            "conversation_id": conversation["_id"],
            "title": conversation.get("title", "新对话"),
            "rounds": rounds,
            "type": conversation_type,
        }

        # 添加文档/文件信息（如果存在）
        if "documents" in conversation:
            response_data["documents"] = conversation["documents"]

        # 添加输入配置（如果存在）
        if "input_config" in conversation:
            response_data["input_config"] = conversation["input_config"]

        # 根据type添加相应的扩展字段
        if conversation_type == "graph":
            # 图执行对话，添加 execution_chain、final_result 和 tasks
            response_data["execution_chain"] = conversation.get("execution_chain")
            response_data["final_result"] = conversation.get("final_result")
            response_data["tasks"] = conversation.get("tasks", [])
        
        elif conversation_type == "agent":
            # Agent 对话，添加 tasks 数据
            response_data["tasks"] = conversation.get("tasks", [])

        return ConversationDetailResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取对话详情出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取对话详情出错: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/status")
async def update_conversation_status(
        conversation_id: str,
        request: UpdateConversationStatusRequest,
        current_user: CurrentUser = Depends(get_current_user)
):
    """更新对话状态（统一接口：活跃/软删除/收藏）"""
    try:
        # 验证对话所有权
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以操作所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此对话"
            )

        # 调用mongodb_client更新对话状态
        success = await mongodb_client.update_conversation_status(
            conversation_id=conversation_id,
            status=request.status,
            user_id=current_user.user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}' 或状态更新失败"
            )

        # 根据状态返回不同的成功消息
        status_messages = {
            "active": "对话已恢复为活跃状态",
            "deleted": "对话已删除",
            "favorite": "对话已收藏"
        }

        return {
            "status": "success",
            "message": status_messages.get(request.status, "对话状态更新成功"),
            "conversation_id": conversation_id,
            "new_status": request.status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新对话状态出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新对话状态出错: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}/permanent")
async def permanently_delete_conversation(
        conversation_id: str,
        current_user: CurrentUser = Depends(get_current_user)
):
    """永久删除对话"""
    try:
        # 验证对话是否存在且属于该用户
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以删除所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此对话"
            )

        # 执行硬删除
        success = await mongodb_client.permanently_delete_conversation(conversation_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"永久删除对话 '{conversation_id}' 失败"
            )

        return {
            "status": "success",
            "message": f"对话 '{conversation_id}' 已永久删除",
            "conversation_id": conversation_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"永久删除对话出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"永久删除对话出错: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/title")
async def update_conversation_title(
        conversation_id: str,
        request: UpdateConversationTitleRequest,
        current_user: CurrentUser = Depends(get_current_user)
):
    """更新对话标题"""
    try:
        # 验证标题不为空
        if not request.title.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="标题不能为空"
            )

        # 验证对话所有权
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以操作所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此对话"
            )

        # 调用mongodb_client更新标题
        success = await mongodb_client.update_conversation_title(
            conversation_id=conversation_id,
            title=request.title.strip(),
            user_id=current_user.user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}' 或更新失败"
            )

        return {
            "status": "success",
            "message": "对话标题更新成功",
            "conversation_id": conversation_id,
            "title": request.title.strip()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新对话标题出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新对话标题出错: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/tags")
async def update_conversation_tags(
        conversation_id: str,
        request: UpdateConversationTagsRequest,
        current_user: CurrentUser = Depends(get_current_user)
):
    """更新对话标签"""
    try:
        # 验证对话所有权
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以操作所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此对话"
            )

        # 调用mongodb_client更新标签
        success = await mongodb_client.update_conversation_tags(
            conversation_id=conversation_id,
            tags=request.tags,
            user_id=current_user.user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}' 或更新失败"
            )

        return {
            "status": "success",
            "message": "对话标签更新成功",
            "conversation_id": conversation_id,
            "tags": request.tags
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新对话标签出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新对话标签出错: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/input-config")
async def update_input_config(
        conversation_id: str,
        request: UpdateInputConfigRequest,
        current_user: CurrentUser = Depends(get_current_user)
):
    """更新对话的输入配置"""
    try:
        # 验证对话所有权
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证所有权（管理员可以操作所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此对话"
            )

        # 调用mongodb_client更新输入配置
        success = await mongodb_client.update_input_config(
            conversation_id=conversation_id,
            input_config=request.input_config.dict(exclude_none=True),
            user_id=current_user.user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}' 或更新失败"
            )

        return {
            "status": "success",
            "message": "输入配置更新成功",
            "conversation_id": conversation_id,
            "input_config": request.input_config.dict(exclude_none=True)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新输入配置出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新输入配置出错: {str(e)}"
        )


@router.post("/conversations/{conversation_id}/compact", response_model=ConversationCompactResponse)
async def compact_conversation(
        conversation_id: str,
        request: ConversationCompactRequest,
        current_user: CurrentUser = Depends(get_current_user)
):
    """
    压缩对话内容

    支持两种压缩类型：
    - brutal（暴力压缩）：保留每轮的系统提示词、用户消息和最后一个assistant消息
    - precise（精确压缩）：对长工具内容进行智能总结
    """
    try:
        # 验证对话ID是否匹配
        if request.conversation_id != conversation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请求路径中的对话ID与请求体中的对话ID不匹配"
            )

        # 验证模型名称
        from app.services.model.model_service import model_service
        model_config = await model_service.get_model(request.model_name, current_user.user_id)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"找不到模型配置: {request.model_name}"
            )

        # 检查对话是否存在
        conversation = await mongodb_client.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证对话所有权（管理员可以操作所有对话）
        if not current_user.is_admin() and conversation.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此对话"
            )

        # 创建总结回调函数（用于精确压缩）
        summarize_callback = None
        if request.compact_type == "precise":
            async def summarize_tool_content(content: str) -> Dict[str, Any]:
                """使用模型总结工具结果进行压缩内容"""
                try:
                    from app.utils.text_tool import detect_language
                    from app.services.conversation.prompts import get_summarize_prompt

                    language = detect_language(content)
                    prompt_template = get_summarize_prompt(language)
                    summary_prompt = prompt_template.format(content=content)

                    # 构建消息
                    messages = [{"role": "user", "content": summary_prompt}]

                    # 调用模型
                    result = await model_service.call_model(
                        model_name=request.model_name,
                        messages=messages,
                        user_id=current_user.user_id
                    )

                    if result.get("status") == "success":
                        summary_content = result.get("content", "").strip()
                        return {"status": "success", "content": summary_content}
                    else:
                        logger.warning(f"内容总结失败: {result.get('error', '未知错误')}")
                        return {"status": "error", "error": result.get("error", "总结失败")}

                except Exception as e:
                    logger.error(f"总结工具内容时出错: {str(e)}")
                    return {"status": "error", "error": str(e)}

            summarize_callback = summarize_tool_content

        # 执行压缩
        result = await mongodb_client.conversation_repository.compact_conversation(
            conversation_id=conversation_id,
            compact_type=request.compact_type,
            compact_threshold=request.compact_threshold,
            summarize_callback=summarize_callback,
            user_id=current_user.user_id
        )

        # 处理结果
        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "压缩失败")
            )

        return ConversationCompactResponse(
            status="success",
            message=result.get("message", "对话压缩成功"),
            conversation_id=conversation_id,
            compact_type=request.compact_type,
            statistics=result.get("statistics"),
            error=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"压缩对话出错: {str(e)}")
        return ConversationCompactResponse(
            status="error",
            message="压缩对话时发生未知错误",
            conversation_id=conversation_id,
            compact_type=request.compact_type,
            statistics=None,
            error=str(e)
        )