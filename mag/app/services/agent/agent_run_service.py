"""
Agent 运行服务
职责：处理 Agent 运行请求的业务逻辑
"""
import json
import logging
import asyncio
from typing import Optional, List, Dict, Any, Tuple
from bson import ObjectId
from fastapi import HTTPException, status, UploadFile
from app.services.agent.file_handler import file_handler
from app.infrastructure.database.mongodb.client import mongodb_client
from app.services.conversation.title_service import generate_title_and_tags

logger = logging.getLogger(__name__)


class AgentRunService:
    """Agent 运行服务 - 处理 Agent 运行请求的业务逻辑"""

    def __init__(self):
        """初始化 Agent 运行服务"""
        pass

    async def validate_request_params(
        self,
        user_prompt: str,
        agent_name: Optional[str],
        model_name: Optional[str],
        user_id: str,
        mcp_servers: Optional[str],
        system_tools: Optional[str]
    ) -> Tuple[Optional[str], Optional[List[str]], Optional[List[str]]]:
        """
        验证请求参数

        Args:
            user_prompt: 用户输入
            agent_name: Agent 名称
            model_name: 模型名称
            user_id: 用户 ID
            mcp_servers: MCP 服务器列表（JSON 字符串）
            system_tools: 系统工具列表（JSON 字符串）

        Returns:
            Tuple: (验证后的 agent_name, mcp_servers_list, system_tools_list)

        Raises:
            HTTPException: 参数验证失败
        """

        # 验证 user_prompt
        if not user_prompt or not user_prompt.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户消息不能为空"
            )

        # 验证配置：必须提供 agent_name 或 model_name
        if not agent_name and not model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须提供 agent_name 或 model_name"
            )

        # 如果提供了 agent_name，验证 Agent 是否存在
        if agent_name:
            agent = await mongodb_client.agent_repository.get_agent(
                agent_name,
                user_id
            )

            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到 Agent: {agent_name}"
                )

        # 解析 JSON 字符串参数
        mcp_servers_list = json.loads(mcp_servers) if mcp_servers else None
        system_tools_list = json.loads(system_tools) if system_tools else None

        return agent_name, mcp_servers_list, system_tools_list

    async def ensure_conversation_exists(
        self,
        conversation_id: Optional[str],
        user_id: str,
        agent_name: Optional[str],
        project_id: Optional[str] = None
    ) -> Tuple[str, bool]:
        """
        确保 Agent 会话存在（包括 conversation 和 agent_run 记录）

        Args:
            conversation_id: 会话 ID（可选，如果为 None 则自动生成）
            user_id: 用户 ID
            agent_name: Agent 名称（用于生成标题）

        Returns:
            Tuple: (conversation_id, is_new_conversation)

        Note:
            此方法专门用于 Agent 会话，会同时创建 conversation 和 agent_run 记录。
            对于其他类型的会话，请使用 conversation_repository.ensure_conversation_exists()
        """

        # 验证 project 权限（如有）
        if project_id:
            project = await mongodb_client.get_project(project_id, user_id)
            if not project:
                raise ValueError(f"Project 不存在或无权限访问: {project_id}")

        # 生成或使用现有 conversation_id
        conversation_id = conversation_id or str(ObjectId())

        # 检查对话是否已存在
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
                title=f"{agent_name or 'Manual'} 对话",
                tags=[],
                project_id=project_id
            )

            # 创建 agent_run 记录（Agent 专用）
            await mongodb_client.agent_run_repository.create_agent_run(
                conversation_id=conversation_id
            )

            if project_id:
                await mongodb_client.update_project_conversation_count(project_id, 1)

        return conversation_id, is_new_conversation

    async def process_files(
        self,
        files: Optional[List[UploadFile]],
        user_id: str,
        conversation_id: str
    ) -> List[Dict[str, Any]]:
        """
        处理上传的文件

        Args:
            files: 上传的文件列表
            user_id: 用户 ID
            conversation_id: 会话 ID

        Returns:
            List: 图片信息列表
        """
        images_info = []

        if files:
            result = await file_handler.process_uploaded_files(
                files=files,
                user_id=user_id,
                conversation_id=conversation_id
            )
            images_info = result.get("images_info", [])
            logger.info(
                f"处理文件完成: {len(images_info)} 个图片, "
                f"{len(result.get('files_uploaded', []))} 个文本文件"
            )

        return images_info

    def create_title_generator(
        self,
        user_id: str,
        user_prompt: str,
        conversation_id: str
    ) -> Tuple[asyncio.Queue, asyncio.Task]:
        """
        创建标题生成器

        Args:
            user_id: 用户 ID
            user_prompt: 用户输入
            conversation_id: 会话 ID

        Returns:
            Tuple: (title_queue, background_task)
        """
        # 创建队列用于标题更新通知
        title_queue = asyncio.Queue()

        # 后台标题生成任务
        async def generate_title_background():
            try:
                title, tags = await generate_title_and_tags(
                    user_id=user_id,
                    user_prompt=user_prompt
                )

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

        # 启动后台任务
        background_task = asyncio.create_task(generate_title_background())

        return title_queue, background_task

    async def create_stream_generator(
        self,
        agent_stream_executor,
        agent_name: Optional[str],
        user_prompt: str,
        user_id: str,
        conversation_id: str,
        images_info: List[Dict[str, Any]],
        model_name: Optional[str],
        system_prompt: Optional[str],
        mcp_servers_list: Optional[List[str]],
        system_tools_list: Optional[List[str]],
        max_iterations: Optional[int],
        title_queue: asyncio.Queue,
        is_new_conversation: bool
    ):
        """
        创建流式响应生成器

        Args:
            agent_stream_executor: Agent 流式执行器
            agent_name: Agent 名称
            user_prompt: 用户输入
            user_id: 用户 ID
            conversation_id: 会话 ID
            images_info: 图片信息列表
            model_name: 模型名称
            system_prompt: 系统提示词
            mcp_servers_list: MCP 服务器列表
            system_tools_list: 系统工具列表
            max_iterations: 最大迭代次数
            title_queue: 标题更新队列
            is_new_conversation: 是否为新会话

        Yields:
            str: SSE 格式的流式响应
        """
        stream_done = False
        try:
            # 创建 agent 执行流的异步任务
            async def agent_stream_wrapper():
                nonlocal stream_done
                async for chunk in agent_stream_executor.run_agent_stream(
                    agent_name=agent_name,
                    user_prompt=user_prompt,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    images_info=images_info,
                    model_name=model_name,
                    system_prompt=system_prompt,
                    mcp_servers=mcp_servers_list,
                    system_tools=system_tools_list,
                    max_iterations=max_iterations
                ):
                    yield chunk
                stream_done = True

            # 监听 agent 流和标题队列
            agent_stream = agent_stream_wrapper()
            async for chunk in agent_stream:
                yield chunk

                # 检查队列中是否有标题更新
                try:
                    while not title_queue.empty():
                        title_event = await asyncio.wait_for(title_queue.get(), timeout=0.01)
                        yield f"data: {json.dumps(title_event)}\n\n"
                except asyncio.TimeoutError:
                    pass

            # agent 流结束后，等待并发送可能延迟的标题更新
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


# 全局实例
agent_run_service = AgentRunService()
