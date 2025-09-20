
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Dict, List, Any
from app.services.model_service import model_service
from app.services.chat_service import chat_service
from app.services.mongodb_service import mongodb_service
from app.utils.sse_helper import SSEHelper, TrajectoryCollector
from app.models.chat_schema import (
    ChatCompletionRequest, ChatMessage, ConversationListItem,
    ConversationListResponse, ConversationDetailResponse, ConversationRound,
    UpdateConversationTitleRequest, UpdateConversationTagsRequest,
    ConversationCompactRequest, ConversationCompactResponse,
    TokenUsage, UpdateConversationStatusRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# ======= Chat模式API接口=======
@router.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """Chat completions接口 - 支持流式和非流式响应，支持临时对话"""
    try:
        # 基本参数验证
        if not request.user_prompt.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户消息不能为空"
            )

        if not request.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须指定模型名称"
            )

        # 验证模型是否存在
        model_config = model_service.get_model(request.model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"找不到模型配置: {request.model_name}"
            )

        # 生成流式响应的生成器
        async def generate_stream():
            try:
                async for chunk in chat_service.chat_completions_stream(
                        conversation_id=request.conversation_id,
                        user_prompt=request.user_prompt,
                        system_prompt=request.system_prompt,
                        mcp_servers=request.mcp_servers,
                        model_name=request.model_name,
                        user_id=request.user_id
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"Chat流式响应生成出错: {str(e)}")
                error_chunk = {
                    "error": {
                        "message": str(e),
                        "type": "api_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"

        # 根据stream参数决定响应类型
        if request.stream:
            # 流式响应
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            # 非流式响应：收集所有数据后返回完整结果
            collector = TrajectoryCollector(
                user_prompt=request.user_prompt,
                system_prompt=request.system_prompt or ""
            )
            complete_response = await collector.collect_stream_data(generate_stream())

            # 添加模型信息
            complete_response["model"] = request.model_name

            return complete_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completions处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理Chat请求时出错: {str(e)}"
        )

@router.get("/chat/conversations", response_model=ConversationListResponse)
async def get_conversations_list(user_id: str = "default_user"):
    """获取对话列表（返回所有类型的对话）"""
    try:
        conversations = await mongodb_service.list_conversations(
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
                _id=conv["_id"],
                user_id=conv.get("user_id", "default_user"),
                type=conv.get("type", "chat"),
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


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetailResponse,response_model_exclude_none=True)
async def get_conversation_detail(conversation_id: str):
    """获取对话完整内容（支持所有类型的对话）"""
    try:
        # 直接调用mongodb_service的get_conversation_with_messages方法
        conversation = await mongodb_service.get_conversation_with_messages(conversation_id)

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 处理轮次数据 - 转换为OpenAI格式
        rounds = conversation.get("rounds", [])
        generation_type = conversation.get("generation_type")

        # 准备响应数据
        response_data = {
            "_id": conversation["_id"],
            "title": conversation.get("title", "新对话"),
            "rounds": rounds,
            "generation_type": generation_type,
        }

        # 根据generation_type添加相应的扩展字段
        if generation_type in ["graph", "mcp"]:
            # AI生成对话，添加parsed_results
            response_data["parsed_results"] = conversation.get("parsed_results")

        elif generation_type == "graph_run":
            # 图执行对话，添加execution_chain和final_result
            response_data["execution_chain"] = conversation.get("execution_chain")
            response_data["final_result"] = conversation.get("final_result")

        return ConversationDetailResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取对话详情出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取对话详情出错: {str(e)}"
        )

@router.put("/chat/conversations/{conversation_id}/status")
async def update_conversation_status(conversation_id: str, request: UpdateConversationStatusRequest):
    """更新对话状态（统一接口：活跃/软删除/收藏）"""
    try:
        # 调用mongodb_service更新对话状态
        success = await mongodb_service.update_conversation_status(
            conversation_id=conversation_id,
            status=request.status,
            user_id=request.user_id
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


@router.delete("/chat/conversations/{conversation_id}/permanent")
async def permanently_delete_conversation(conversation_id: str, user_id: str = "default_user"):
    """永久删除对话"""
    try:
        # 验证对话是否存在且属于该用户
        conversation = await mongodb_service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        if conversation.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此对话"
            )

        # 执行硬删除
        success = await mongodb_service.permanently_delete_conversation(conversation_id)

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



@router.put("/chat/conversations/{conversation_id}/title")
async def update_conversation_title(conversation_id: str, request: UpdateConversationTitleRequest):
    """更新对话标题"""
    try:
        # 验证标题不为空
        if not request.title.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="标题不能为空"
            )

        # 调用mongodb_service更新标题
        success = await mongodb_service.update_conversation_title(
            conversation_id=conversation_id,
            title=request.title.strip(),
            user_id=request.user_id
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


@router.put("/chat/conversations/{conversation_id}/tags")
async def update_conversation_tags(conversation_id: str, request: UpdateConversationTagsRequest):
    """更新对话标签"""
    try:
        # 调用mongodb_service更新标签
        success = await mongodb_service.update_conversation_tags(
            conversation_id=conversation_id,
            tags=request.tags,
            user_id=request.user_id
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

@router.post("/chat/conversations/{conversation_id}/compact", response_model=ConversationCompactResponse)
async def compact_conversation(conversation_id: str, request: ConversationCompactRequest):
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
        model_config = model_service.get_model(request.model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"找不到模型配置: {request.model_name}"
            )

        # 检查对话是否存在
        conversation = await chat_service.get_conversation_detail(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到对话 '{conversation_id}'"
            )

        # 验证对话所有权
        if conversation.get("user_id") != request.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此对话"
            )

        # 执行压缩
        result = await chat_service.compact_conversation(
            conversation_id=conversation_id,
            model_name=request.model_name,
            compact_type=request.compact_type,
            compact_threshold=request.compact_threshold,
            user_id=request.user_id
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