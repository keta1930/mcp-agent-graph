import asyncio
import time
import json
import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, List, Any, Optional

from app.core.file_manager import FileManager
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.models.mcp_schema import (
    MCPServerConfig, MCPConfig, MCPGenerationRequest,
    MCPToolRegistration, MCPToolTestRequest,
    MCPToolTestResponse
)
from app.models.chat_schema import MCPGenerationSession

logger = logging.getLogger(__name__)

router = APIRouter()

# ======= MCP服务器管理 =======

@router.get("/mcp/config", response_model=MCPConfig)
async def get_mcp_config():
    """获取MCP配置"""
    from app.core.file_manager import FileManager
    return FileManager.load_mcp_config()


@router.post("/mcp/config", response_model=Dict[str, Dict[str, Any]])
async def update_mcp_config(config: MCPConfig):
    """更新MCP配置并重新连接服务器"""
    try:
        config_dict = config.dict()
            
        if 'mcpServers' in config_dict:
            for server_name, server_config in config_dict['mcpServers'].items():
                logger.info(f"服务器 '{server_name}' 配置已规范化，传输类型: {server_config.get('transportType', 'stdio')}")
        
        results = await mcp_service.update_config(config_dict)
        return results
    except Exception as e:
        logger.error(f"更新MCP配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新MCP配置时出错: {str(e)}"
        )


@router.get("/mcp/status", response_model=Dict[str, Dict[str, Any]])
async def get_mcp_status():
    """获取MCP服务器状态"""
    try:
        return await mcp_service.get_server_status()
    except Exception as e:
        logger.error(f"获取MCP状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP状态时出错: {str(e)}"
        )

@router.post("/mcp/add", response_model=Dict[str, Any])
async def add_mcp_server(config: Dict[str, Any]):
    """添加新的MCP服务器"""
    try:
        # 验证配置格式
        if "mcpServers" not in config:
            return {
                "status": "error",
                "message": "配置必须包含 'mcpServers' 字段",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": []
            }
        
        # 获取要添加的服务器
        servers_to_add = config["mcpServers"]
        if not servers_to_add:
            return {
                "status": "error",
                "message": "没有要添加的服务器配置",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": []
            }
        
        # 获取当前MCP配置
        current_config = FileManager.load_mcp_config()
        current_servers = current_config.get("mcpServers", {})
        
        # 分类处理服务器
        duplicate_servers = []
        servers_to_actually_add = {}
        
        for server_name, server_config in servers_to_add.items():
            if server_name in current_servers:
                duplicate_servers.append(server_name)
            else:
                try:
                    logger.info(f"处理服务器 '{server_name}' 的原始配置: {server_config}")
                    validated_config = MCPServerConfig(**server_config)
                    normalized_config = validated_config.dict()

                    logger.info(f"服务器 '{server_name}' 规范化后配置: {normalized_config}")
                    servers_to_actually_add[server_name] = normalized_config
                except ValueError as e:
                    logger.error(f"服务器 '{server_name}' 配置验证失败: {str(e)}")
                    return {
                        "status": "error",
                        "message": f"服务器 '{server_name}' 配置验证失败: {str(e)}",
                        "added_servers": [],
                        "duplicate_servers": [],
                        "skipped_servers": []
                    }
        
        # 如果有可以添加的服务器，执行添加操作
        added_servers = []
        update_result = None
        
        if servers_to_actually_add:
            # 合并配置
            for server_name, server_config in servers_to_actually_add.items():
                current_servers[server_name] = server_config
                added_servers.append(server_name)
            
            # 更新配置
            updated_config = {"mcpServers": current_servers}
            update_result = await mcp_service.update_config(updated_config)
        
        # 构建响应
        if added_servers and not duplicate_servers:
            return {
                "status": "success",
                "message": f"成功添加 {len(added_servers)} 个服务器",
                "added_servers": added_servers,
                "duplicate_servers": [],
                "skipped_servers": [],
                "update_result": update_result
            }
        elif added_servers and duplicate_servers:
            return {
                "status": "partial_success",
                "message": f"成功添加 {len(added_servers)} 个服务器，跳过 {len(duplicate_servers)} 个已存在的服务器",
                "added_servers": added_servers,
                "duplicate_servers": duplicate_servers,
                "skipped_servers": duplicate_servers,
                "update_result": update_result
            }
        elif duplicate_servers and not added_servers:
            return {
                "status": "no_changes",
                "message": f"所有 {len(duplicate_servers)} 个服务器都已存在，未添加任何新服务器",
                "added_servers": [],
                "duplicate_servers": duplicate_servers,
                "skipped_servers": duplicate_servers,
                "update_result": None
            }
        else:
            return {
                "status": "no_changes",
                "message": "没有服务器需要添加",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": [],
                "update_result": None
            }
        
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
async def remove_mcp_servers(server_names: List[str]):
    """批量删除指定的MCP服务器（支持传统MCP和AI生成的MCP）"""
    try:
        # 验证输入
        if not server_names:
            return {
                "status": "error",
                "message": "没有指定要删除的服务器",
                "removed_servers": [],
                "not_found_servers": [],
                "total_requested": 0
            }
        
        # 获取当前MCP配置
        current_config = FileManager.load_mcp_config()
        current_servers = current_config.get("mcpServers", {})
        
        # 分类处理服务器
        servers_to_remove = []
        not_found_servers = []
        ai_generated_servers = []
        traditional_servers = []
        
        for server_name in server_names:
            if server_name in current_servers:
                servers_to_remove.append(server_name)
                
                # 检查是否为AI生成的MCP工具
                server_config = current_servers[server_name]
                if server_config.get("ai_generated", False) or FileManager.mcp_tool_exists(server_name):
                    ai_generated_servers.append(server_name)
                else:
                    traditional_servers.append(server_name)
            else:
                not_found_servers.append(server_name)
        
        # 执行删除操作
        removed_servers = []
        failed_removals = []
        update_result = None
        
        if servers_to_remove:
            # 删除AI生成的MCP工具
            for server_name in ai_generated_servers:
                try:
                    # 从配置中注销
                    await mcp_service.unregister_ai_mcp_tool(server_name)
                    
                    # 删除工具文件
                    if FileManager.mcp_tool_exists(server_name):
                        success = FileManager.delete_mcp_tool(server_name)
                        if not success:
                            logger.error(f"删除AI生成的MCP工具文件失败: {server_name}")
                            failed_removals.append(server_name)
                            continue
                    
                    # 从配置中删除
                    if server_name in current_servers:
                        del current_servers[server_name]
                    
                    removed_servers.append(server_name)
                    logger.info(f"成功删除AI生成的MCP工具: {server_name}")
                    
                except Exception as e:
                    logger.error(f"删除AI生成的MCP工具 {server_name} 时出错: {str(e)}")
                    failed_removals.append(server_name)
            
            # 删除传统MCP服务器
            for server_name in traditional_servers:
                try:
                    del current_servers[server_name]
                    removed_servers.append(server_name)
                    logger.info(f"成功删除传统MCP服务器: {server_name}")
                except Exception as e:
                    logger.error(f"删除传统MCP服务器 {server_name} 时出错: {str(e)}")
                    failed_removals.append(server_name)
            
            # 如果有成功删除的服务器，更新配置
            if removed_servers:
                updated_config = {"mcpServers": current_servers}
                update_result = await mcp_service.update_config(updated_config)
        
        # 构建响应
        if removed_servers and not not_found_servers and not failed_removals:
            # 全部成功删除
            return {
                "status": "success",
                "message": f"成功删除 {len(removed_servers)} 个服务器",
                "removed_servers": removed_servers,
                "not_found_servers": [],
                "failed_removals": [],
                "ai_generated_count": len(ai_generated_servers),
                "traditional_count": len(traditional_servers),
                "total_requested": len(server_names),
                "update_result": update_result
            }
        elif removed_servers and (not_found_servers or failed_removals):
            # 部分成功
            return {
                "status": "partial_success",
                "message": f"成功删除 {len(removed_servers)} 个服务器，{len(not_found_servers)} 个服务器不存在，{len(failed_removals)} 个删除失败",
                "removed_servers": removed_servers,
                "not_found_servers": not_found_servers,
                "failed_removals": failed_removals,
                "ai_generated_count": len([s for s in ai_generated_servers if s in removed_servers]),
                "traditional_count": len([s for s in traditional_servers if s in removed_servers]),
                "total_requested": len(server_names),
                "update_result": update_result
            }
        elif not_found_servers and not removed_servers:
            # 全部不存在
            return {
                "status": "no_changes",
                "message": f"所有 {len(not_found_servers)} 个服务器都不存在，未删除任何服务器",
                "removed_servers": [],
                "not_found_servers": not_found_servers,
                "failed_removals": [],
                "ai_generated_count": 0,
                "traditional_count": 0,
                "total_requested": len(server_names),
                "update_result": None
            }
        else:
            # 其他情况
            return {
                "status": "error" if failed_removals else "no_changes",
                "message": "删除操作完成，但存在问题",
                "removed_servers": removed_servers,
                "not_found_servers": not_found_servers,
                "failed_removals": failed_removals,
                "ai_generated_count": len([s for s in ai_generated_servers if s in removed_servers]),
                "traditional_count": len([s for s in traditional_servers if s in removed_servers]),
                "total_requested": len(server_names),
                "update_result": update_result
            }
        
    except Exception as e:
        logger.error(f"删除MCP服务器时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"删除MCP服务器时出错: {str(e)}",
            "removed_servers": [],
            "not_found_servers": [],
            "failed_removals": [],
            "total_requested": len(server_names) if server_names else 0
        }


@router.post("/mcp/connect/{server_name}", response_model=Dict[str, Any])
async def connect_server(server_name: str):
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
async def test_mcp_tool(request: MCPToolTestRequest):
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
async def disconnect_server(server_name: str):
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
async def get_mcp_tools():
    """获取所有MCP工具信息"""
    try:
        return await mcp_service.get_all_tools()
    except Exception as e:
        logger.error(f"获取MCP工具信息时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP工具信息时出错: {str(e)}"
        )

@router.get("/mcp/ai-generator-template", response_model=Dict[str, str])
async def get_mcp_generator_template():
    """获取AI生成MCP的提示词模板"""
    try:
        connect_result = await mcp_service.connect_all_servers()
        logger.info(f"连接所有服务器结果: {connect_result}")
        sample_requirement = "[在此处输入您的MCP工具需求描述]"
        template = await mcp_service.get_mcp_generator_template(sample_requirement)
        
        return {
            "template": template,
            "note": "将模板中的需求描述替换为您的具体需求后使用"
        }
    except Exception as e:
        logger.error(f"获取MCP生成器模板时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP生成器模板时出错: {str(e)}"
        )

@router.post("/mcp/generate")
async def generate_mcp_tool(request: MCPGenerationRequest):
    """AI生成MCP工具接口 - 流式SSE响应"""
    try:
        # 基本参数验证
        if not request.requirement.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户需求不能为空"
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
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{request.model_name}'"
            )

        # 生成流式响应
        async def generate_stream():
            try:
                async for chunk in mcp_service.ai_generate_mcp_stream(
                    requirement=request.requirement,
                    model_name=request.model_name,
                    conversation_id=request.conversation_id,
                    user_id=request.user_id
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"AI MCP生成流式响应出错: {str(e)}")
                error_chunk = {
                    "error": {
                        "message": str(e),
                        "type": "api_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI MCP生成处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理AI MCP生成请求时出错: {str(e)}"
        )

# todo 更新为stdio
@router.post("/mcp/register-tool", response_model=Dict[str, Any])
async def register_mcp_tool(request: MCPToolRegistration):
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
        success = await mcp_service.register_ai_mcp_tool(request.folder_name)
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
async def list_ai_mcp_tools():
    """列出所有AI生成的MCP工具"""
    try:
        return FileManager.list_mcp_tools()
    except Exception as e:
        logger.error(f"列出AI生成的MCP工具时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出AI生成的MCP工具时出错: {str(e)}"
        )