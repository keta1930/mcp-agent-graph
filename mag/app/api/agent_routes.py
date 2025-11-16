import json
import logging
import asyncio
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from app.infrastructure.database.mongodb.client import mongodb_client
from app.services.agent.agent_stream_executor import AgentStreamExecutor
from app.utils.sse_helper import TrajectoryCollector
from app.models.agent_schema import (
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentListItem,
    AgentListResponse,
    AgentCategoryItem,
    AgentCategoryResponse,
    AgentInCategoryItem,
    AgentInCategoryResponse,
    AgentRunRequest
)
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])

# Agent 流式执行器实例
agent_stream_executor = AgentStreamExecutor()

# ======= Agent 列表和查询 API接口 =======
@router.get("/list", response_model=AgentListResponse)
async def list_agents(
    category: str = None,
    limit: int = 100,
    skip: int = 0,
    current_user: CurrentUser = Depends(get_current_user)
):
    """列出 Agents（支持分页和分类过滤）"""
    try:
        user_id = current_user.user_id

        # 获取 Agent 列表
        agents = await mongodb_client.agent_repository.list_agents(
            user_id=user_id,
            category=category,
            limit=limit,
            skip=skip
        )

        # 转换为响应格式
        agent_items = []
        for agent in agents:
            agent_config = agent.get("agent_config", {})

            # 处理时间格式
            created_at = agent.get("created_at", "")
            updated_at = agent.get("updated_at", "")

            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            elif created_at:
                created_at = str(created_at)

            if isinstance(updated_at, datetime):
                updated_at = updated_at.isoformat()
            elif updated_at:
                updated_at = str(updated_at)

            agent_items.append(AgentListItem(
                name=agent_config.get("name", ""),
                category=agent_config.get("category", ""),
                tags=agent_config.get("tags", []),
                model=agent_config.get("model", ""),
                created_at=created_at,
                updated_at=updated_at
            ))

        return AgentListResponse(
            agents=agent_items,
            total_count=len(agent_items)
        )

    except Exception as e:
        logger.error(f"列出 Agents 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出 Agents 出错: {str(e)}"
        )


@router.get("/categories", response_model=AgentCategoryResponse)
async def list_categories(
    current_user: CurrentUser = Depends(get_current_user)
):
    """列出所有 Agent 分类"""
    try:
        user_id = current_user.user_id

        # 获取分类列表
        categories = await mongodb_client.agent_repository.list_categories(user_id)

        # 转换为响应格式
        category_items = []
        for cat in categories:
            category_items.append(AgentCategoryItem(
                category=cat.get("category", ""),
                agent_count=cat.get("agent_count", 0)
            ))

        return AgentCategoryResponse(
            success=True,
            categories=category_items,
            total_categories=len(category_items)
        )

    except Exception as e:
        logger.error(f"列出分类出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出分类出错: {str(e)}"
        )


@router.get("/category/{category}", response_model=AgentInCategoryResponse)
async def list_agents_in_category(
    category: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """列出指定分类下的所有 Agents"""
    try:
        user_id = current_user.user_id

        # 获取分类下的 Agents
        agents = await mongodb_client.agent_repository.list_agents_in_category(
            user_id=user_id,
            category=category
        )

        # 转换为响应格式
        agent_items = []
        for agent in agents:
            agent_config = agent.get("agent_config", {})
            agent_items.append(AgentInCategoryItem(
                name=agent_config.get("name", ""),
                tags=agent_config.get("tags", [])
            ))

        return AgentInCategoryResponse(
            success=True,
            category=category,
            agents=agent_items,
            total_count=len(agent_items)
        )

    except Exception as e:
        logger.error(f"列出分类下 Agents 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出分类下 Agents 出错: {str(e)}"
        )


# ======= Agent CRUD API接口 =======
@router.post("")
async def create_agent(
    request: CreateAgentRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """创建 Agent"""
    try:
        # 从token获取user_id，覆盖请求体中的user_id
        user_id = current_user.user_id

        # 验证 Agent 名称唯一性
        existing_agent = await mongodb_client.agent_repository.get_agent(
            request.agent_config.name,
            user_id
        )

        if existing_agent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent 已存在: {request.agent_config.name}"
            )

        # 使用 agent_service 创建 Agent（包含记忆文档创建）
        from app.services.agent.agent_service import agent_service
        result = await agent_service.create_agent(
            agent_config=request.agent_config.dict(),
            user_id=user_id
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "创建 Agent 失败")
            )

        return {
            "status": "success",
            "message": f"Agent '{request.agent_config.name}' 创建成功",
            "agent_name": result.get("agent_name"),
            "agent_id": result.get("agent_id")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建 Agent 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建 Agent 出错: {str(e)}"
        )


@router.get("/{agent_name}")
async def get_agent(
    agent_name: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取 Agent 配置"""
    try:
        user_id = current_user.user_id

        agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到 Agent: {agent_name}"
            )

        # 验证所有权（管理员可以访问所有 Agent）
        if not current_user.is_admin() and agent.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此 Agent"
            )

        return {
            "status": "success",
            "agent": agent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 Agent 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 Agent 出错: {str(e)}"
        )


@router.put("/{agent_name}")
async def update_agent(
    agent_name: str,
    request: UpdateAgentRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """更新 Agent 配置"""
    try:
        user_id = current_user.user_id

        # 验证 Agent 是否存在
        existing_agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

        if not existing_agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到 Agent: {agent_name}"
            )

        # 验证所有权（管理员可以操作所有 Agent）
        if not current_user.is_admin() and existing_agent.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此 Agent"
            )

        # 验证名称一致性
        if request.agent_config.name != agent_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent 名称不能修改"
            )

        # 使用 agent_service 更新 Agent
        from app.services.agent.agent_service import agent_service
        result = await agent_service.update_agent(
            agent_name=agent_name,
            agent_config=request.agent_config.dict(),
            user_id=user_id
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "更新 Agent 失败")
            )

        return {
            "status": "success",
            "message": f"Agent '{agent_name}' 更新成功",
            "agent_name": agent_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新 Agent 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新 Agent 出错: {str(e)}"
        )


@router.delete("/{agent_name}")
async def delete_agent(
    agent_name: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """删除 Agent"""
    try:
        user_id = current_user.user_id

        # 验证 Agent 是否存在
        existing_agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

        if not existing_agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到 Agent: {agent_name}"
            )

        # 验证所有权（管理员可以操作所有 Agent）
        if not current_user.is_admin() and existing_agent.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限操作此 Agent"
            )

        # 使用 agent_service 删除 Agent（会同时删除记忆文档）
        from app.services.agent.agent_service import agent_service
        success = await agent_service.delete_agent(agent_name, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除 Agent 失败"
            )

        return {
            "status": "success",
            "message": f"Agent '{agent_name}' 删除成功",
            "agent_name": agent_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除 Agent 出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除 Agent 出错: {str(e)}"
        )


# ======= Agent 运行 API接口 =======
@router.post("/run")
async def agent_run(
    request: AgentRunRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Agent 运行（流式响应，SSE）- 支持配置覆盖"""
    try:
        # 从token获取user_id，覆盖请求体中的user_id
        user_id = current_user.user_id

        # 基本参数验证
        if not request.user_prompt.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户消息不能为空"
            )

        # 验证配置：必须提供 agent_name 或 model_name
        if not request.agent_name and not request.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须提供 agent_name 或 model_name"
            )

        # 如果提供了 agent_name，验证 Agent 是否存在
        if request.agent_name:
            agent = await mongodb_client.agent_repository.get_agent(
                request.agent_name,
                user_id
            )

            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到 Agent: {request.agent_name}"
                )

        # 生成或使用现有 conversation_id
        conversation_id = request.conversation_id or str(ObjectId())

        # 查询数据库判断是否为新对话
        existing_conversation = await mongodb_client.conversation_repository.get_conversation(
            conversation_id
        )
        is_new_conversation = (existing_conversation is None)

        if is_new_conversation:
            # 创建 conversation 记录（类型为 agent）
            await mongodb_client.conversation_repository.create_conversation(
                conversation_id=conversation_id,
                conversation_type="agent",
                user_id=user_id,
                title=f"{request.agent_name or 'Manual'} 对话"
            )

            # 创建 agent_invoke 记录
            await mongodb_client.agent_invoke_repository.create_agent_invoke(
                conversation_id=conversation_id
            )

        # 创建队列用于标题更新通知
        title_queue = asyncio.Queue()

        # 后台标题生成任务
        async def generate_title_background():
            from app.services.conversation.title_service import generate_title_and_tags
            try:
                title, tags = await generate_title_and_tags(user_id=user_id, user_prompt=request.user_prompt)

                # 更新数据库中的标题和标签
                await mongodb_client.conversation_repository.update_conversation_title_and_tags(
                    conversation_id=conversation_id,
                    title=title,
                    tags=tags
                )

                logger.info(f"✓ 后台生成标题成功: {title}")

                # 通知前端标题更新
                await title_queue.put({
                    "type": "title_update",
                    "title": title,
                    "tags": tags,
                    "conversation_id": conversation_id
                })

            except Exception as e:
                logger.error(f"后台生成标题出错: {str(e)}")

        # 如果是新会话，启动后台标题生成任务
        if is_new_conversation:
            asyncio.create_task(generate_title_background())

        # 生成流式响应的生成器
        async def generate_stream():
            stream_done = False
            try:
                # 创建agent执行流的异步任务
                async def agent_stream_wrapper():
                    nonlocal stream_done
                    async for chunk in agent_stream_executor.run_agent_stream(
                        agent_name=request.agent_name,
                        user_prompt=request.user_prompt,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        # 传递可选配置参数
                        model_name=request.model_name,
                        system_prompt=request.system_prompt,
                        mcp_servers=request.mcp_servers,
                        system_tools=request.system_tools,
                        max_iterations=request.max_iterations
                    ):
                        yield chunk
                    stream_done = True

                # 同时监听agent流和标题队列
                agent_stream = agent_stream_wrapper()
                async for chunk in agent_stream:
                    yield chunk

                    # 检查队列中是否有标题更新（非阻塞）
                    try:
                        while not title_queue.empty():
                            title_event = await asyncio.wait_for(title_queue.get(), timeout=0.01)
                            yield f"data: {json.dumps(title_event)}\n\n"
                    except asyncio.TimeoutError:
                        pass

                # agent流结束后，等待并发送可能延迟的标题更新
                if is_new_conversation:
                    try:
                        title_event = await asyncio.wait_for(title_queue.get(), timeout=3.0)
                        yield f"data: {json.dumps(title_event)}\n\n"
                    except asyncio.TimeoutError:
                        pass

            except Exception as e:
                logger.error(f"Agent 流式响应生成出错: {str(e)}")
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

            # 添加 conversation_id
            complete_response["conversation_id"] = conversation_id

            return complete_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent 运行处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理 Agent 运行时出错: {str(e)}"
        )