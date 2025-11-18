import logging
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse, JSONResponse, Response
from typing import Dict, List, Any
from app.services.model.model_service import model_service
from app.services.graph.graph_service import graph_service
from app.templates.flow_diagram import FlowDiagram
from app.utils.sse_helper import SSEHelper
from app.models.graph_schema import GraphConfig, GraphInput
from app.infrastructure.database.mongodb import mongodb_client
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser
logger = logging.getLogger(__name__)

router = APIRouter(tags=["graph"])

# ======= 图管理 =======
@router.get("/graphs", response_model=List[str])
async def get_graphs(current_user: CurrentUser = Depends(get_current_user)):
    """获取所有可用的图"""
    try:
        return await graph_service.list_graphs(user_id=current_user.user_id)
    except Exception as e:
        logger.error(f"获取图列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图列表时出错: {str(e)}"
        )


@router.get("/graphs/{graph_name}", response_model=Dict[str, Any])
async def get_graph(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """获取特定图的配置"""
    try:
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 验证访问权限（所有者或共享用户或管理员）
        if not current_user.is_admin():
            owner_id = graph_doc.get("user_id")
            shared_with = graph_doc.get("shared_with", [])
            if owner_id != current_user.user_id and current_user.user_id not in shared_with:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="无权限访问此图"
                )

        # 返回config部分
        return graph_doc.get("config", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图 '{graph_name}' 时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图 '{graph_name}' 时出错: {str(e)}"
        )
        
@router.get("/graphs/{graph_name}/readme", response_model=Dict[str, Any])
async def get_graph_readme(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """获取图的README文件内容"""
    try:
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 验证访问权限
        if not current_user.is_admin():
            owner_id = graph_doc.get("user_id")
            shared_with = graph_doc.get("shared_with", [])
            if owner_id != current_user.user_id and current_user.user_id not in shared_with:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="无权限访问此图"
                )

        graph_config = graph_doc.get("config", {})
        readme_content = graph_config.get("readme", "未找到README文件")

        graph_info = {
            "name": graph_name,
            "config": graph_config,
            "readme": readme_content
        }

        return graph_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图README时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图README时出错: {str(e)}"
        )


@router.post("/graphs", response_model=Dict[str, Any])
async def create_graph(graph: GraphConfig, current_user: CurrentUser = Depends(get_current_user)):
    """创建新图或更新现有图"""
    try:
        valid, error = await graph_service.validate_graph(graph.dict(), user_id=current_user.user_id)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        graph_dict = graph.dict()

        mcp_config_data = await mongodb_client.get_mcp_config()
        mcp_config = mcp_config_data.get("config", {"mcpServers": {}}) if mcp_config_data else {"mcpServers": {}}
        filtered_mcp_config = {"mcpServers": {}}

        used_servers = set()
        for node in graph_dict.get("nodes", []):
            for server in node.get("mcp_servers", []):
                used_servers.add(server)

        for server_name in used_servers:
            if server_name in mcp_config.get("mcpServers", {}):
                filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

        used_models = set()
        for node in graph_dict.get("nodes", []):
            if node.get("model_name"):
                used_models.add(node.get("model_name"))

        model_configs = []
        all_models = await model_service.get_all_models(user_id=current_user.user_id)
        for model in all_models:
            if model["name"] in used_models:
                model_configs.append(model)

        readme_content = FlowDiagram.generate_graph_readme(graph_dict, filtered_mcp_config, model_configs)
        graph_dict["readme"] = readme_content

        success = await graph_service.save_graph(graph.name, graph_dict, user_id=current_user.user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="保存图失败"
            )

        return {"status": "success", "message": f"图 '{graph.name}' 保存成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建/更新图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建/更新图时出错: {str(e)}"
        )


@router.delete("/graphs/{graph_name}", response_model=Dict[str, Any])
async def delete_graph(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """删除图"""
    try:
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 验证所有权（只有所有者和管理员可以删除）
        if not current_user.is_admin() and graph_doc.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有图的所有者可以删除图"
            )

        success = await graph_service.delete_graph(graph_name, user_id=current_user.user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除图失败"
            )

        return {"status": "success", "message": f"图 '{graph_name}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除图时出错: {str(e)}"
        )


@router.put("/graphs/{old_name}/rename/{new_name}", response_model=Dict[str, Any])
async def rename_graph(old_name: str, new_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """重命名图"""
    try:
        graph_doc = await graph_service.get_graph(old_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{old_name}'"
            )

        # 验证所有权（只有所有者和管理员可以重命名）
        if not current_user.is_admin() and graph_doc.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有图的所有者可以重命名图"
            )

        existing_graph = await graph_service.get_graph(new_name, user_id=current_user.user_id)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{new_name}' 的图"
            )

        success = await graph_service.rename_graph(old_name, new_name, user_id=current_user.user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="重命名图失败"
            )

        return {"status": "success", "message": f"图 '{old_name}' 重命名为 '{new_name}' 成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重命名图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重命名图时出错: {str(e)}"
        )


@router.get("/graphs/{graph_name}/generate_mcp", response_model=Dict[str, Any])
async def generate_mcp_script(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """生成MCP服务器脚本"""
    try:
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        host = "http://localhost:9999"
        graph_config = graph_doc.get("config", {})

        result = graph_service.generate_mcp_script(graph_name, graph_config, host)

        if isinstance(result, str):
            return {
                "graph_name": graph_name,
                "script": result
            }

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成MCP脚本时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成MCP脚本时出错: {str(e)}"
        )

# ======= 图执行 =======
@router.post("/graphs/execute")
async def execute_graph(input_data: GraphInput, current_user: CurrentUser = Depends(get_current_user)):
    """执行图并返回流式结果或后台执行结果"""
    try:
        # 检查图是否存在
        graph_doc = await graph_service.get_graph(input_data.graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

        graph_config = graph_doc.get("config", {})
        # 根据background参数选择执行模式
        if input_data.background:
            # 后台执行模式：返回conversation_id，图在后台继续执行
            try:
                result = await graph_service.execute_graph_background(
                    input_data.graph_name,
                    input_data.input_text,
                    graph_config,
                    input_data.conversation_id,
                    user_id=current_user.user_id
                )
                return JSONResponse(result)
            except Exception as e:
                logger.error(f"启动后台执行时出错: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"启动后台执行时出错: {str(e)}"
                )
        else:
            # SSE模式：现有流程保持不变
            async def generate_hybrid_stream():
                try:
                    if input_data.conversation_id:
                        # 继续现有会话
                        async for sse_data in graph_service.continue_conversation_stream(
                                input_data.conversation_id,
                                input_data.input_text,
                        ):
                            yield sse_data
                    else:
                        # 创建新会话
                        async for sse_data in graph_service.execute_graph_stream(
                                input_data.graph_name,
                                input_data.input_text,
                                graph_config,
                                user_id=current_user.user_id
                        ):
                            yield sse_data

                    # 发送完成标记
                    yield SSEHelper.format_done()

                except HTTPException as he:
                    yield SSEHelper.send_error(he.detail)
                    yield SSEHelper.format_done()
                except Exception as e:
                    logger.error(f"执行图时出错: {str(e)}")
                    yield SSEHelper.send_error(f"执行图时出错: {str(e)}")
                    yield SSEHelper.format_done()

            return StreamingResponse(
                generate_hybrid_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"初始化执行图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"初始化执行图时出错: {str(e)}"
        )


# ======= 版本管理 API =======

@router.post("/graphs/{graph_name}/create-version")
async def create_graph_version(
    graph_name: str,
    request: Dict[str, Any],
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    为当前图配置创建版本快照

    将当前 MongoDB 中的配置同步到 MinIO，创建一个带有提交信息的版本快照
    """
    try:
        # 检查图是否存在
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 验证所有权
        if not current_user.is_admin() and graph_doc.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有图的所有者可以创建版本"
            )

        commit_message = request.get("commit_message")
        if not commit_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="commit_message 是必填项"
            )

        result = await graph_service.create_graph_version(
            graph_name,
            commit_message=commit_message,
            user_id=current_user.user_id
        )

        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建版本失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建版本失败: {str(e)}"
        )


@router.get("/graphs/{graph_name}/versions")
async def get_graph_versions(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    获取图的所有版本历史

    返回完整的版本树，包括版本ID、提交信息、创建时间等
    """
    try:
        result = await graph_service.get_graph_versions(graph_name, user_id=current_user.user_id)
        return result
    except Exception as e:
        logger.error(f"获取版本列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取版本列表失败: {str(e)}"
        )


@router.get("/graphs/{graph_name}/versions/{version_id}")
async def get_graph_version(
    graph_name: str,
    version_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取特定版本的配置

    用于查看历史版本，前端可以加载到编辑器中查看或修改
    """
    try:
        result = await graph_service.get_graph_version(graph_name, version_id, user_id=current_user.user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="版本不存在"
            )

        return {
            "version_id": version_id,
            "graph_name": graph_name,
            "commit_message": result.get("commit_message"),
            "config": result["config"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取版本配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取版本配置失败: {str(e)}"
        )


@router.delete("/graphs/{graph_name}/versions/{version_id}")
async def delete_graph_version(
    graph_name: str,
    version_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    删除特定版本

    同时删除 MinIO 中的版本和 MongoDB 中的版本记录
    """
    try:
        result = await graph_service.delete_graph_version(graph_name, version_id, user_id=current_user.user_id)

        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除版本失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除版本失败: {str(e)}"
        )
