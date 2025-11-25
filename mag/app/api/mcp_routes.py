import time
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, List, Any
from app.infrastructure.storage.file_storage import FileManager
from app.services.mcp.mcp_service import mcp_service
from app.infrastructure.database.mongodb import mongodb_client
from app.models.mcp_schema import (
    MCPToolRegistration, MCPToolTestRequest, MCPToolTestResponse,
    MCPConfigWithVersion, MCPServerAddRequest, MCPServerRemoveRequest
)
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp"])

# ======= MCP服务器管理 =======

@router.get("/mcp/config")
async def get_mcp_config(current_user: CurrentUser = Depends(get_current_user)):
    """获取团队MCP配置"""
    try:
        config_data = await mongodb_client.get_mcp_config()
        if config_data:
            return {
                "mcpServers": config_data.get("config", {}).get("mcpServers", {}),
                "version": config_data.get("version"),
                "updated_at": config_data.get("updated_at")
            }
        return {"mcpServers": {}, "version": 1}
    except Exception as e:
        logger.error(f"获取MCP配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP配置失败: {str(e)}"
        )


@router.post("/mcp/config", response_model=Dict[str, Any])
async def update_mcp_config(request: MCPConfigWithVersion, current_user: CurrentUser = Depends(get_current_user)):
    """更新团队MCP配置并重新连接服务器"""
    try:
        config_dict = request.config.dict()
        expected_version = request.version

        # 获取当前配置以保留provider信息
        current_config_data = await mongodb_client.get_mcp_config()
        current_servers = current_config_data.get("config", {}).get("mcpServers", {}) if current_config_data else {}

        if 'mcpServers' in config_dict:
            for server_name, server_config in config_dict['mcpServers'].items():
                # 如果是已存在的服务器，保留原有provider信息
                if server_name in current_servers:
                    old_server = current_servers[server_name]
                    # 保留provider字段（如果存在）
                    for field in ['provider_user_id', 'created_at']:
                        if field in old_server and field not in server_config:
                            server_config[field] = old_server[field]
                    logger.info(
                        f"服务器 '{server_name}' 已存在，保留原provider信息: {old_server.get('provider_user_id', 'unknown')}")
                else:
                    # 新服务器，添加当前用户provider信息
                    if 'provider_user_id' not in server_config:
                        server_config['provider_user_id'] = current_user.user_id
                        server_config['created_at'] = datetime.now().isoformat()
                    logger.info(
                        f"新服务器 '{server_name}' 添加provider信息: {current_user.user_id}")

                logger.info(
                    f"服务器 '{server_name}' 配置已规范化，传输类型: {server_config.get('transportType', 'stdio')}")

        results = await mcp_service.update_config(config_dict, expected_version)

        logger.info(f"更新配置结果: {results}")

        if results.get("status", {}).get("error") == "version_conflict":
            logger.error(f"检测到版本冲突，返回409: {results['status']}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "version_conflict",
                    "message": results["status"]["message"],
                    "current_version": results["status"]["current_version"],
                    "expected_version": results["status"]["expected_version"]
                }
            )

        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新MCP配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新MCP配置时出错: {str(e)}"
        )

@router.get("/mcp/status", response_model=Dict[str, Dict[str, Any]])
async def get_mcp_status(current_user: CurrentUser = Depends(get_current_user)):
    """获取团队MCP服务器状态"""
    try:
        return await mcp_service.get_server_status()
    except Exception as e:
        logger.error(f"获取MCP状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP状态时出错: {str(e)}"
        )


@router.post("/mcp/add", response_model=Dict[str, Any])
async def add_mcp_server(request: MCPServerAddRequest, current_user: CurrentUser = Depends(get_current_user)):
    """添加新的MCP服务器到团队配置"""
    try:
        from datetime import datetime
        servers_to_add = request.mcpServers
        expected_version = request.version

        if not servers_to_add:
            return {
                "status": "error",
                "message": "没有要添加的服务器配置",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": []
            }

        current_config_data = await mongodb_client.get_mcp_config()
        current_config = current_config_data.get("config", {"mcpServers": {}})
        current_version = current_config_data.get("version", 1)

        if current_version != expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "version_conflict",
                    "message": "配置已被其他用户修改，请刷新后重试",
                    "current_version": current_version,
                    "expected_version": expected_version
                }
            )

        current_servers = current_config.get("mcpServers", {})

        duplicate_servers = []
        servers_to_actually_add = {}

        for server_name, server_config in servers_to_add.items():
            if server_name in current_servers:
                duplicate_servers.append(server_name)
            else:
                try:
                    normalized_config = server_config.dict()
                    # 添加provider信息
                    normalized_config['provider_user_id'] = current_user.user_id
                    normalized_config['created_at'] = datetime.now().isoformat()
                    servers_to_actually_add[server_name] = normalized_config
                except Exception as e:
                    logger.error(f"服务器 '{server_name}' 配置处理失败: {str(e)}")
                    return {
                        "status": "error",
                        "message": f"服务器 '{server_name}' 配置处理失败: {str(e)}",
                        "added_servers": [],
                        "duplicate_servers": [],
                        "skipped_servers": []
                    }

        added_servers = []
        update_result = None

        if servers_to_actually_add:
            for server_name, server_config in servers_to_actually_add.items():
                current_servers[server_name] = server_config
                added_servers.append(server_name)

            updated_config = {"mcpServers": current_servers}
            update_result = await mcp_service.update_config(updated_config, expected_version)

            if update_result.get("status", {}).get("error") == "version_conflict":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error": "version_conflict",
                        "message": update_result["status"]["message"],
                        "current_version": update_result["status"]["current_version"],
                        "expected_version": update_result["status"]["expected_version"]
                    }
                )

        if added_servers and not duplicate_servers:
            return {
                "status": "success",
                "message": f"成功添加 {len(added_servers)} 个服务器",
                "added_servers": added_servers,
                "duplicate_servers": [],
                "skipped_servers": [],
                "update_result": update_result,
                "new_version": update_result.get("status", {}).get("version")
            }
        elif added_servers and duplicate_servers:
            return {
                "status": "partial_success",
                "message": f"成功添加 {len(added_servers)} 个服务器，跳过 {len(duplicate_servers)} 个已存在的服务器",
                "added_servers": added_servers,
                "duplicate_servers": duplicate_servers,
                "skipped_servers": duplicate_servers,
                "update_result": update_result,
                "new_version": update_result.get("status", {}).get("version")
            }
        elif duplicate_servers and not added_servers:
            return {
                "status": "no_changes",
                "message": f"所有 {len(duplicate_servers)} 个服务器都已存在，未添加任何新服务器",
                "added_servers": [],
                "duplicate_servers": duplicate_servers,
                "skipped_servers": duplicate_servers,
                "update_result": None,
                "current_version": current_version
            }
        else:
            return {
                "status": "no_changes",
                "message": "没有服务器需要添加",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": [],
                "update_result": None,
                "current_version": current_version
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加MCP服务器时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"添加MCP服务器时出错: {str(e)}",
            "added_servers": [],
            "duplicate_servers": [],
            "skipped_servers": []
        }


@router.post("/mcp/remove", response_model=Dict[str, Any])
async def remove_mcp_servers(request: MCPServerRemoveRequest, current_user: CurrentUser = Depends(get_current_user)):
    """批量删除指定的MCP服务器（支持传统MCP和AI生成的MCP）- 需要权限检查"""
    try:
        server_names = request.server_names
        expected_version = request.version

        if not server_names:
            return {
                "status": "error",
                "message": "没有指定要删除的服务器",
                "removed_servers": [],
                "not_found_servers": [],
                "permission_denied_servers": [],
                "total_requested": 0
            }

        current_config_data = await mongodb_client.get_mcp_config()
        current_config = current_config_data.get("config", {"mcpServers": {}})
        current_version = current_config_data.get("version", 1)

        if current_version != expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "version_conflict",
                    "message": "配置已被其他用户修改，请刷新后重试",
                    "current_version": current_version,
                    "expected_version": expected_version
                }
            )

        current_servers = current_config.get("mcpServers", {})

        servers_to_remove = []
        not_found_servers = []
        permission_denied_servers = []
        ai_generated_servers = []
        traditional_servers = []

        # 检查权限
        for server_name in server_names:
            if server_name in current_servers:
                server_config = current_servers[server_name]
                provider_user_id = server_config.get("provider_user_id")

                # 权限检查：只有提供者或管理员可以删除
                if provider_user_id and provider_user_id != current_user.user_id and current_user.role != "admin":
                    permission_denied_servers.append(server_name)
                    logger.warning(f"用户{current_user.user_id}尝试删除服务器{server_name}但无权限（provider: {provider_user_id}）")
                    continue

                servers_to_remove.append(server_name)

                if server_config.get("ai_generated", False) or FileManager.mcp_tool_exists(server_name):
                    ai_generated_servers.append(server_name)
                else:
                    traditional_servers.append(server_name)
            else:
                not_found_servers.append(server_name)

        removed_servers = []
        failed_removals = []
        update_result = None

        if servers_to_remove:
            for server_name in ai_generated_servers:
                try:
                    if FileManager.mcp_tool_exists(server_name):
                        success = FileManager.delete_mcp_tool(server_name)
                        if not success:
                            logger.error(f"删除AI生成的MCP工具文件失败: {server_name}")
                            failed_removals.append(server_name)
                            continue

                    if server_name in current_servers:
                        del current_servers[server_name]

                    removed_servers.append(server_name)
                    logger.info(f"成功删除AI生成的MCP工具: {server_name}")

                except Exception as e:
                    logger.error(f"删除AI生成的MCP工具 {server_name} 时出错: {str(e)}")
                    failed_removals.append(server_name)

            for server_name in traditional_servers:
                try:
                    del current_servers[server_name]
                    removed_servers.append(server_name)
                    logger.info(f"成功删除传统MCP服务器: {server_name}")
                except Exception as e:
                    logger.error(f"删除传统MCP服务器 {server_name} 时出错: {str(e)}")
                    failed_removals.append(server_name)

            if removed_servers:
                updated_config = {"mcpServers": current_servers}
                update_result = await mcp_service.update_config(updated_config, expected_version)

                if update_result.get("status", {}).get("error") == "version_conflict":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "error": "version_conflict",
                            "message": update_result["status"]["message"],
                            "current_version": update_result["status"]["current_version"],
                            "expected_version": update_result["status"]["expected_version"]
                        }
                    )

        if removed_servers and not not_found_servers and not failed_removals and not permission_denied_servers:
            return {
                "status": "success",
                "message": f"成功删除 {len(removed_servers)} 个服务器",
                "removed_servers": removed_servers,
                "not_found_servers": [],
                "failed_removals": [],
                "permission_denied_servers": [],
                "ai_generated_count": len(ai_generated_servers),
                "traditional_count": len(traditional_servers),
                "total_requested": len(server_names),
                "update_result": update_result,
                "new_version": update_result.get("status", {}).get("version")
            }
        elif removed_servers and (not_found_servers or failed_removals or permission_denied_servers):
            return {
                "status": "partial_success",
                "message": f"成功删除 {len(removed_servers)} 个服务器，{len(not_found_servers)} 个服务器不存在，{len(failed_removals)} 个删除失败，{len(permission_denied_servers)} 个无权限",
                "removed_servers": removed_servers,
                "not_found_servers": not_found_servers,
                "failed_removals": failed_removals,
                "permission_denied_servers": permission_denied_servers,
                "ai_generated_count": len([s for s in ai_generated_servers if s in removed_servers]),
                "traditional_count": len([s for s in traditional_servers if s in removed_servers]),
                "total_requested": len(server_names),
                "update_result": update_result,
                "new_version": update_result.get("status", {}).get("version")
            }
        elif permission_denied_servers and not removed_servers:
            return {
                "status": "permission_denied",
                "message": f"所有 {len(permission_denied_servers)} 个服务器都没有删除权限",
                "removed_servers": [],
                "not_found_servers": not_found_servers,
                "failed_removals": [],
                "permission_denied_servers": permission_denied_servers,
                "ai_generated_count": 0,
                "traditional_count": 0,
                "total_requested": len(server_names),
                "update_result": None,
                "current_version": current_version
            }
        elif not_found_servers and not removed_servers and not permission_denied_servers:
            return {
                "status": "no_changes",
                "message": f"所有 {len(not_found_servers)} 个服务器都不存在，未删除任何服务器",
                "removed_servers": [],
                "not_found_servers": not_found_servers,
                "failed_removals": [],
                "permission_denied_servers": [],
                "ai_generated_count": 0,
                "traditional_count": 0,
                "total_requested": len(server_names),
                "update_result": None,
                "current_version": current_version
            }
        else:
            return {
                "status": "error" if failed_removals else "no_changes",
                "message": "删除操作完成，但存在问题",
                "removed_servers": removed_servers,
                "not_found_servers": not_found_servers,
                "failed_removals": failed_removals,
                "permission_denied_servers": permission_denied_servers,
                "ai_generated_count": len([s for s in ai_generated_servers if s in removed_servers]),
                "traditional_count": len([s for s in traditional_servers if s in removed_servers]),
                "total_requested": len(server_names),
                "update_result": update_result,
                "new_version": update_result.get("status", {}).get("version") if update_result else None
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除MCP服务器时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"删除MCP服务器时出错: {str(e)}",
            "removed_servers": [],
            "not_found_servers": [],
            "failed_removals": [],
            "total_requested": len(request.server_names) if request.server_names else 0
        }


@router.post("/mcp/connect/{server_name}", response_model=Dict[str, Any])
async def connect_server(server_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """连接指定的MCP服务器，或者连接所有服务器（当server_name为'all'时）"""
    try:
        if server_name.lower() == "all":
            # 批量连接所有服务器
            result = await mcp_service.connect_all_servers()
            return result
        else:
            # 连接单个服务器（原有逻辑）
            result = await mcp_service.connect_server(server_name)
            if result.get("status") == "error":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get("error", "连接服务器失败")
                )
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"连接服务器'{server_name}'时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"连接服务器时出错: {str(e)}"
        )

@router.post("/mcp/test-tool", response_model=MCPToolTestResponse)
async def test_mcp_tool(request: MCPToolTestRequest, current_user: CurrentUser = Depends(get_current_user)):
    """测试MCP工具调用"""
    try:
        # 记录开始时间
        start_time = time.time()

        # 调用工具
        result = await mcp_service.call_tool(
            request.server_name,
            request.tool_name,
            request.params
        )
        
        # 计算执行时间
        execution_time = time.time() - start_time
        
        # 检查调用结果
        if "error" in result:
            return MCPToolTestResponse(
                status="error",
                server_name=request.server_name,
                tool_name=request.tool_name,
                params=request.params,
                error=result.get("error"),
                execution_time=execution_time
            )
        else:
            return MCPToolTestResponse(
                status="success",
                server_name=request.server_name,
                tool_name=request.tool_name,
                params=request.params,
                result=result.get("content"),
                execution_time=execution_time
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试工具调用时出错: {str(e)}")
        return MCPToolTestResponse(
            status="error",
            server_name=request.server_name,
            tool_name=request.tool_name,
            params=request.params,
            error=f"测试工具调用时出错: {str(e)}"
        )
        
@router.post("/mcp/disconnect/{server_name}", response_model=Dict[str, Any])
async def disconnect_server(server_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """断开指定的MCP服务器连接"""
    try:
        # 检查服务器状态
        server_status = await mcp_service.get_server_status()
        if server_name not in server_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到服务器 '{server_name}'"
            )

        # 如果服务器未连接，直接返回
        if not server_status[server_name].get("connected", False):
            return {
                "status": "not_connected",
                "server": server_name,
                "message": "服务器未连接"
            }

        # 断开服务器连接
        result = await mcp_service.disconnect_server(server_name)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "断开服务器连接失败")
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"断开服务器'{server_name}'连接时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"断开服务器连接时出错: {str(e)}"
        )
        
@router.get("/mcp/tools", response_model=Dict[str, List[Dict[str, Any]]])
async def get_mcp_tools(current_user: CurrentUser = Depends(get_current_user)):
    """获取所有MCP工具信息"""
    try:
        return await mcp_service.get_all_tools()
    except Exception as e:
        logger.error(f"获取MCP工具信息时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP工具信息时出错: {str(e)}"
        )


@router.post("/mcp/register-tool", response_model=Dict[str, Any])
async def register_mcp_tool(request: MCPToolRegistration, current_user: CurrentUser = Depends(get_current_user)):
    """注册MCP工具到系统"""
    try:
        # 检查工具是否已存在
        if FileManager.mcp_tool_exists(request.folder_name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"MCP工具 '{request.folder_name}' 已存在"
            )

        # 创建MCP工具
        success = FileManager.create_mcp_tool(
            request.folder_name,
            request.script_files,
            request.readme,
            request.dependencies
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建MCP工具文件失败"
            )

        # 注册到MCP配置
        success = await mcp_service.register_mcp_tool(request.folder_name, user_id=current_user.user_id)
        if not success:
            # 注册失败，清理文件
            FileManager.delete_mcp_tool(request.folder_name)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="注册MCP工具到配置失败"
            )

        return {
            "status": "success",
            "message": f"MCP工具 '{request.folder_name}' 注册成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"注册MCP工具时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"注册MCP工具时出错: {str(e)}"
        )

@router.get("/mcp/ai-tools", response_model=List[str])
async def list_ai_mcp_tools(current_user: CurrentUser = Depends(get_current_user)):
    """列出所有AI生成的MCP工具"""
    try:
        return FileManager.list_mcp_tools()
    except Exception as e:
        logger.error(f"列出AI生成的MCP工具时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出AI生成的MCP工具时出错: {str(e)}"
        )