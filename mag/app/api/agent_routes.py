import json
import logging
import asyncio
import tempfile
import os
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from app.infrastructure.database.mongodb.client import mongodb_client
from app.services.agent.agent_stream_executor import AgentStreamExecutor
from app.services.agent.agent_import_service import agent_import_service
from app.services.agent.agent_service import agent_service
from app.services.agent.agent_run_service import agent_run_service
from app.utils.sse_helper import TrajectoryCollector
from app.models.agent_schema import (
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentListItem,
    AgentListResponse,
    AgentCategoryItem,
    AgentCategoryResponse,
    AgentInCategoryItem,
    AgentInCategoryResponse
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
    user_prompt: str = Form(...),
    agent_name: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    stream: bool = Form(True),
    model_name: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    mcp_servers: Optional[str] = Form(None),
    system_tools: Optional[str] = Form(None),
    max_iterations: Optional[int] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Agent 运行（流式响应，SSE）- 支持配置覆盖和文件上传"""
    try:
        user_id = current_user.user_id

        # 1. 验证请求参数
        agent_name, mcp_servers_list, system_tools_list = await agent_run_service.validate_request_params(
            user_prompt=user_prompt,
            agent_name=agent_name,
            model_name=model_name,
            user_id=user_id,
            mcp_servers=mcp_servers,
            system_tools=system_tools
        )

        # 2. 确保会话存在
        conversation_id, is_new_conversation = await agent_run_service.ensure_conversation_exists(
            conversation_id=conversation_id,
            user_id=user_id,
            agent_name=agent_name
        )

        # 3. 处理上传的文件
        images_info = await agent_run_service.process_files(
            files=files,
            user_id=user_id,
            conversation_id=conversation_id
        )

        # 4. 创建标题生成器（如果是新会话）
        title_queue = None
        if is_new_conversation:
            title_queue, _ = agent_run_service.create_title_generator(
                user_id=user_id,
                user_prompt=user_prompt,
                conversation_id=conversation_id
            )
        else:
            # 创建空队列以保持接口一致
            title_queue = asyncio.Queue()

        # 5. 创建流式响应生成器
        async def generate_stream():
            async for chunk in agent_run_service.create_stream_generator(
                agent_stream_executor=agent_stream_executor,
                agent_name=agent_name,
                user_prompt=user_prompt,
                user_id=user_id,
                conversation_id=conversation_id,
                images_info=images_info,
                model_name=model_name,
                system_prompt=system_prompt,
                mcp_servers_list=mcp_servers_list,
                system_tools_list=system_tools_list,
                max_iterations=max_iterations,
                title_queue=title_queue,
                is_new_conversation=is_new_conversation
            ):
                yield chunk

        # 6. 根据 stream 参数决定响应类型
        if stream:
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
            collector = TrajectoryCollector(
                user_prompt=user_prompt,
                system_prompt=system_prompt or ""
            )
            complete_response = await collector.collect_stream_data(generate_stream())
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


# ======= Agent 导入 API接口 =======
@router.post("/import")
async def import_agents(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    导入Agent配置文件，返回导入报告
    
    支持的文件格式：
    - JSON (.json): 单个Agent对象或Agent数组
    - JSONL (.jsonl): 每行一个Agent对象
    
    Returns:
        FileResponse: Markdown格式的导入报告文件
    """
    try:
        user_id = current_user.user_id
        
        # 1. 验证文件格式
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件名不能为空"
            )
        
        file_extension = os.path.splitext(file.filename)[1].lower()
        supported_formats = [".json", ".jsonl", ".xlsx", ".xls", ".parquet"]
        
        if file_extension not in supported_formats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的文件格式: {file_extension}，支持的格式: {', '.join(supported_formats)}"
            )
        
        # 2. 读取文件内容
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件内容为空"
            )
        
        # 3. 执行导入
        import_result = await agent_import_service.import_agents(
            file_content=file_content,
            file_extension=file_extension,
            user_id=user_id
        )
        
        # 4. 生成报告文件（固定使用Markdown格式）
        report_content = import_result.get("report_markdown", "")
        
        # 5. 创建临时文件
        temp_dir = tempfile.mkdtemp()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"agent_import_report_{timestamp}.md"
        report_path = os.path.join(temp_dir, report_filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        # 6. 返回文件响应
        return FileResponse(
            path=report_path,
            filename=report_filename,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f"attachment; filename={report_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导入Agent出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入Agent出错: {str(e)}"
        )