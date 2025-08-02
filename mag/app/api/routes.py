import asyncio
import requests
import zipfile
import tempfile
import time
import shutil
import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
from urllib.parse import unquote
from pathlib import Path

from app.core.config import settings
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.services.chat_service import chat_service
from app.core.file_manager import FileManager
from app.models.schema import (
    MCPServerConfig, MCPConfig, ModelConfig, GraphConfig, GraphInput,
    ModelConfigList, GraphGenerationRequest,
    GraphFilePath, MCPGenerationRequest,
    MCPToolRegistration, MCPToolTestRequest,
    MCPToolTestResponse,
    ChatCompletionRequest, ChatMessage, ConversationListItem,
    ConversationListResponse, ConversationDetailResponse, ConversationRound,
    UpdateConversationTitleRequest, UpdateConversationTagsRequest,
    ConversationCompactRequest, ConversationCompactResponse,
    TokenUsage, UpdateConversationStatusRequest
)
from app.templates.flow_diagram import FlowDiagram
from app.utils.text_parser import parse_graph_response
from app.utils.sse_helper import SSEHelper
from app.services.mongodb_service import mongodb_service

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
        success = await mcp_service.register_ai_mcp_tool(request.folder_name, request.port)
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

# @router.delete("/mcp/ai-tools/{tool_name}", response_model=Dict[str, Any])
# async def delete_ai_mcp_tool(tool_name: str):
#     """删除AI生成的MCP工具"""
#     try:
#         # 检查工具是否存在
#         if not FileManager.mcp_tool_exists(tool_name):
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"找不到MCP工具 '{tool_name}'"
#             )
        
#         # 从配置中注销
#         await mcp_service.unregister_ai_mcp_tool(tool_name)
        
#         # 删除工具文件
#         success = FileManager.delete_mcp_tool(tool_name)
#         if not success:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail="删除MCP工具文件失败"
#             )
        
#         return {
#             "status": "success",
#             "message": f"MCP工具 '{tool_name}' 删除成功"
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"删除AI生成的MCP工具时出错: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"删除AI生成的MCP工具时出错: {str(e)}"
#         )
# ======= 模型管理 =======

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models():
    """获取所有模型配置（不包含API密钥）"""
    try:
        return model_service.get_all_models()
    except Exception as e:
        logger.error(f"获取模型列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表时出错: {str(e)}"
        )

@router.get("/models/{model_name:path}", response_model=Dict[str, Any])
async def get_model_for_edit(model_name: str):
    """获取特定模型的配置（用于编辑）"""
    try:
        model_name = unquote(model_name)
        logger.info(f"获取模型配置用于编辑: '{model_name}'")
        
        model_config = model_service.get_model_for_edit(model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )
        
        return {"status": "success", "data": model_config}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型配置时出错: {str(e)}"
        )

@router.post("/models", response_model=Dict[str, Any])
async def add_model(model: ModelConfig):
    """添加新模型配置"""
    try:
        # 检查是否已存在同名模型
        existing_model = model_service.get_model(model.name)
        if existing_model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{model.name}' 的模型"
            )

        # 添加模型
        success = model_service.add_model(model.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添加模型失败"
            )

        return {"status": "success", "message": f"模型 '{model.name}' 添加成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加模型时出错: {str(e)}"
        )


@router.put("/models/{model_name}", response_model=Dict[str, Any])
async def update_model(model_name: str, model: ModelConfig):
    """更新模型配置"""
    try:
        # 检查模型是否存在
        existing_model = model_service.get_model(model_name)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 如果模型名称已更改，检查新名称是否已存在
        if model_name != model.name:
            existing_model_with_new_name = model_service.get_model(model.name)
            if existing_model_with_new_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"已存在名为 '{model.name}' 的模型"
                )

        # 更新模型
        success = model_service.update_model(model_name, model.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新模型时出错: {str(e)}"
        )


@router.delete("/models/{model_name:path}", response_model=Dict[str, Any])
async def delete_model(model_name: str):
    """删除模型配置"""
    try:
        model_name = unquote(model_name)
        logger.info(f"尝试删除模型: '{model_name}'")

        # 检查模型是否存在
        existing_model = model_service.get_model(model_name)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 删除模型
        success = model_service.delete_model(model_name)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除模型时出错: {str(e)}"
        )


# ======= 图管理 =======

@router.get("/graphs", response_model=List[str])
async def get_graphs():
    """获取所有可用的图"""
    try:
        return graph_service.list_graphs()
    except Exception as e:
        logger.error(f"获取图列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图列表时出错: {str(e)}"
        )


@router.get("/graphs/{graph_name}", response_model=Dict[str, Any])
async def get_graph(graph_name: str):
    """获取特定图的配置"""
    try:
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        return graph_config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图 '{graph_name}' 时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图 '{graph_name}' 时出错: {str(e)}"
        )
        
@router.get("/graphs/{graph_name}/readme", response_model=Dict[str, Any])
async def get_graph_readme(graph_name: str):
    """获取图的README文件内容"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 获取图的目录
        agent_dir = settings.get_agent_dir(graph_name)

        # 查找可能的README文件（不区分大小写）
        readme_content = None
        readme_patterns = ["readme.md", "README.md", "Readme.md"]

        for pattern in readme_patterns:
            readme_path = agent_dir / pattern
            if readme_path.exists() and readme_path.is_file():
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        readme_content = f.read()
                    break
                except Exception as e:
                    logger.error(f"读取README文件出错: {str(e)}")

        # 构建返回的图信息
        graph_info = {
            "name": graph_name,
            "config": graph_config,
            "readme": readme_content or "未找到README文件"
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
async def create_graph(graph: GraphConfig):
    """创建新图或更新现有图"""
    try:
        # 验证图配置
        valid, error = graph_service.validate_graph(graph.dict())
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        # 保存图
        success = graph_service.save_graph(graph.name, graph.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="保存图失败"
            )

        # 每次保存都重新生成README文件
        try:
            agent_dir = settings.get_agent_dir(graph.name)
            agent_dir.mkdir(parents=True, exist_ok=True)

            # 获取MCP配置
            mcp_config = FileManager.load_mcp_config()
            filtered_mcp_config = {"mcpServers": {}}

            # 获取使用的服务器
            used_servers = set()
            for node in graph.dict().get("nodes", []):
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

            # 过滤MCP配置
            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

            # 获取使用的模型
            used_models = set()
            for node in graph.dict().get("nodes", []):
                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            # 获取模型配置
            model_configs = []
            all_models = model_service.get_all_models()

            for model in all_models:
                if model["name"] in used_models:
                    model_configs.append(model)

            # 生成README内容
            readme_content = FlowDiagram.generate_graph_readme(graph.dict(), filtered_mcp_config, model_configs)

            # 保存README文件 - 直接覆盖原文件
            readme_path = agent_dir / "readme.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)

            logger.info(f"已为图 '{graph.name}' 重新生成README文件")
            
        except Exception as e:
            logger.error(f"生成README文件时出错: {str(e)}")
            # README生成失败不应该影响图保存的主要功能，所以不抛出异常

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
async def delete_graph(graph_name: str):
    """删除图"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 删除图
        success = graph_service.delete_graph(graph_name)
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
async def rename_graph(old_name: str, new_name: str):
    """重命名图"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(old_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{old_name}'"
            )

        # 检查新名称是否已存在
        existing_graph = graph_service.get_graph(new_name)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{new_name}' 的图"
            )

        # 重命名图
        success = graph_service.rename_graph(old_name, new_name)
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
async def generate_mcp_script(graph_name: str):
    """生成MCP服务器脚本"""
    try:
        # 获取图配置
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        host = "http://localhost:9999"

        # 生成脚本
        result = graph_service.generate_mcp_script(graph_name, graph_config, host)

        # 确保响应格式统一
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

@router.get("/prompt-template", response_model=Dict[str, str])
async def get_prompt_template():
    """生成提示词模板，包含节点参数规范、可用工具信息和已有模型名称"""
    try:
        # 1. 连接所有服务器以确保所有工具可用
        connect_result = await mcp_service.connect_all_servers()
        logger.info(f"连接所有服务器结果: {connect_result}")
        
        # 2. 获取所有工具信息
        all_tools_data = await mcp_service.get_all_tools()
        
        # 3. 过滤和转换工具信息为文本描述，添加清晰的标签
        tools_description = ""

        if not all_tools_data:
            tools_description = "当前没有可用的MCP工具。\n\n"
        else:
            tools_description += "# 可用MCP工具\n\n"
            
            # 统计服务器和工具总数
            server_count = len(all_tools_data)
            total_tools = sum(len(tools) for tools in all_tools_data.values())
            tools_description += f"系统中共有 {server_count} 个MCP服务，提供 {total_tools} 个工具。\n\n"
            
            # 遍历每个服务器
            for server_name, tools in all_tools_data.items():
                tools_description += f"## 服务：{server_name}\n\n"
                
                if not tools:
                    tools_description += "此服务未提供工具。\n\n"
                    continue
                
                # 显示此服务的工具数量
                tools_description += f"此服务提供 {len(tools)} 个工具：\n\n"
                
                # 遍历服务提供的每个工具
                for i, tool in enumerate(tools, 1):
                    # 从工具数据中提取需要的字段
                    tool_name = tool.get("name", "未知工具")
                    tool_desc = tool.get("description", "无描述")
                    
                    # 添加工具标签和编号
                    tools_description += f"### 工具 {i}：{tool_name}\n\n"
                    tools_description += f"**工具说明**：{tool_desc}\n\n"
                    
                    # 添加分隔符，除非是最后一个工具
                    if i < len(tools):
                        tools_description += "---\n\n"

                tools_description += "***\n\n"
        
        # 4. 获取所有可用模型
        all_models = model_service.get_all_models()
        models_description = ""
        
        if not all_models:
            models_description = "当前没有配置的模型。\n\n"
        else:
            models_description = "### 可用模型列表：\n\n"
            for model in all_models:
                models_description += f"- `{model['name']}`\n"
            models_description += "\n"
        
        # 5. 读取提示词模板文件
        current_file_dir = Path(__file__).parent.parent
        template_path = current_file_dir / "templates" / "prompt_template.md"
        if not template_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到提示词模板文件"
            )
            
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # 6. 将工具信息和模型信息嵌入到模板中
        final_prompt = template_content.replace("{TOOLS_DESCRIPTION}", tools_description)
        final_prompt = final_prompt.replace("{MODELS_DESCRIPTION}", models_description)
        
        return {
            "prompt": final_prompt
        }
    except Exception as e:
        logger.error(f"生成提示词模板时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成提示词模板时出错: {str(e)}"
        )

@router.get("/optimize-prompt-template", response_model=Dict[str, str])
async def get_optimize_prompt_template(graph_name: Optional[str] = None):
    """生成优化图的提示词模板，可选择包含具体图配置"""
    try:
        # 1. 连接所有服务器以确保所有工具可用
        connect_result = await mcp_service.connect_all_servers()
        logger.info(f"连接所有服务器结果: {connect_result}")
        
        # 2. 获取所有工具信息
        all_tools_data = await mcp_service.get_all_tools()
        
        # 3. 过滤和转换工具信息为文本描述，添加清晰的标签
        tools_description = ""

        if not all_tools_data:
            tools_description = "当前没有可用的MCP工具。\n\n"
        else:
            tools_description += "# 可用MCP工具\n\n"
            
            # 统计服务器和工具总数
            server_count = len(all_tools_data)
            total_tools = sum(len(tools) for tools in all_tools_data.values())
            tools_description += f"系统中共有 {server_count} 个MCP服务，提供 {total_tools} 个工具。\n\n"
            
            # 遍历每个服务器
            for server_name, tools in all_tools_data.items():
                tools_description += f"## 服务：{server_name}\n\n"
                
                if not tools:
                    tools_description += "此服务未提供工具。\n\n"
                    continue
                
                # 显示此服务的工具数量
                tools_description += f"此服务提供 {len(tools)} 个工具：\n\n"
                
                # 遍历服务提供的每个工具
                for i, tool in enumerate(tools, 1):
                    # 从工具数据中提取需要的字段
                    tool_name = tool.get("name", "未知工具")
                    tool_desc = tool.get("description", "无描述")
                    
                    # 添加工具标签和编号
                    tools_description += f"### 工具 {i}：{tool_name}\n\n"
                    tools_description += f"**工具说明**：{tool_desc}\n\n"
                    
                    # 添加分隔符，除非是最后一个工具
                    if i < len(tools):
                        tools_description += "---\n\n"

                tools_description += "***\n\n"
        
        # 4. 获取所有可用模型
        all_models = model_service.get_all_models()
        models_description = ""
        
        if not all_models:
            models_description = "当前没有配置的模型。\n\n"
        else:
            models_description = "### 可用模型列表：\n\n"
            for model in all_models:
                models_description += f"- `{model['name']}`\n"
            models_description += "\n"
        
        # 5. 读取优化图提示词模板文件
        current_file_dir = Path(__file__).parent.parent  # 从 app/api 回到 app
        template_path = current_file_dir / "templates" / "optimize_prompt_template.md"
        if not template_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到优化图提示词模板文件"
            )
            
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # 6. 将工具信息和模型信息嵌入到模板中
        final_prompt = template_content.replace("{TOOLS_DESCRIPTION}", tools_description)
        final_prompt = final_prompt.replace("{MODELS_DESCRIPTION}", models_description)
        
        # 7. 如果提供了图名称，则获取图配置并嵌入到模板中
        if graph_name:
            existing_graph = graph_service.get_graph(graph_name)
            if not existing_graph:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{graph_name}'"
                )
            
            # 将图配置转换为JSON格式并嵌入到模板中
            graph_config_json = json.dumps(existing_graph, ensure_ascii=False, indent=2)
            final_prompt = final_prompt.replace("{GRAPH_CONFIG}", graph_config_json)
            
            # 添加占位符提示，用户仍需要指定优化要求
            final_prompt = final_prompt.replace("{OPTIMIZATION_REQUIREMENT}", "[请在此处指定优化要求]")
            
            return {
                "prompt": final_prompt,
                "graph_name": graph_name,
                "has_graph_config": "True"
            }
        else:
            # 如果没有提供图名称，返回原始模板
            return {
                "prompt": final_prompt,
                "has_graph_config": "False",
                "note": "要获取包含具体图配置的优化提示词，请提供graph_name参数"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成优化图提示词模板时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成优化图提示词模板时出错: {str(e)}"
        )

@router.post("/graphs/generate")
async def generate_graph(request: GraphGenerationRequest):
    """AI生成图接口 - 流式SSE响应"""
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

        # 获取graph配置（如果提供了graph_name）
        graph_config = None
        if request.graph_name:
            graph_config = graph_service.get_graph(request.graph_name)
            if not graph_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{request.graph_name}'"
                )

        # 生成流式响应
        async def generate_stream():
            try:
                async for chunk in graph_service.ai_generate_graph(
                    requirement=request.requirement,
                    model_name=request.model_name,
                    conversation_id=request.conversation_id,
                    user_id=request.user_id,
                    graph_config=graph_config
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"AI图生成流式响应出错: {str(e)}")
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
        logger.error(f"AI图生成处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理AI图生成请求时出错: {str(e)}"
        )

# ======= 图导入/导出功能 =======
@router.post("/graphs/import", response_model=Dict[str, Any])
async def import_graph(data: GraphFilePath):
    """从JSON文件导入图配置"""
    try:
        file_path = Path(data.file_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到文件 '{data.file_path}'"
            )

        # 读取JSON文件
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件不是有效的JSON格式"
            )

        # 验证图配置
        if "name" not in graph_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON文件缺少必要的'name'字段"
            )

        # 验证图配置
        valid, error = graph_service.validate_graph(graph_data)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        # 检查是否存在同名图
        graph_name = graph_data['name']
        existing_graph = graph_service.get_graph(graph_name)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"已存在名为 '{graph_name}' 的图"
            )

        # 保存图
        success = graph_service.save_graph(graph_name, graph_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="导入图失败"
            )

        # 总是生成README文件
        try:
            agent_dir = settings.get_agent_dir(graph_name)
            agent_dir.mkdir(parents=True, exist_ok=True)

            # 获取MCP配置
            mcp_config = FileManager.load_mcp_config()
            filtered_mcp_config = {"mcpServers": {}}

            # 获取使用的服务器
            used_servers = set()
            for node in graph_data.get("nodes", []):
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

            # 过滤MCP配置
            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

            # 获取使用的模型
            used_models = set()
            for node in graph_data.get("nodes", []):
                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            # 获取模型配置
            model_configs = []
            all_models = model_service.get_all_models()

            for model in all_models:
                if model["name"] in used_models:
                    model_configs.append(model)

            # 生成README内容
            readme_content = FlowDiagram.generate_graph_readme(graph_data, filtered_mcp_config, model_configs)

            # 保存README文件 - 直接覆盖原文件
            readme_path = agent_dir / "readme.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)

            logger.info(f"已为导入的图 '{graph_name}' 生成README文件")
            
        except Exception as e:
            # 生成README失败不应影响图导入的主要功能
            logger.error(f"生成README文件时出错: {str(e)}")

        return {
            "status": "success",
            "message": f"图 '{graph_name}' 导入成功"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导入图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入图时出错: {str(e)}"
        )

@router.post("/graphs/import_package", response_model=Dict[str, Any])
async def import_graph_package(data: GraphFilePath):
    """从ZIP包导入图配置及相关组件"""
    try:
        file_path = Path(data.file_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到文件 '{data.file_path}'"
            )

        if not file_path.name.endswith('.zip'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件必须是ZIP格式"
            )

        # 创建临时目录并解压ZIP文件
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            try:
                with zipfile.ZipFile(file_path, 'r') as zipf:
                    zipf.extractall(temp_path)
            except zipfile.BadZipFile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="无效的ZIP文件"
                )

            # 加载配置文件
            config_path = temp_path / "config.json"
            if not config_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ZIP包中缺少config.json文件"
                )

            with open(config_path, 'r', encoding='utf-8') as f:
                graph_config = json.load(f)

            graph_name = graph_config.get("name")
            if not graph_name:
                # 如果没有名称，使用文件名作为备选
                graph_name = file_path.stem
                graph_config["name"] = graph_name
                logger.warning(f"配置文件中缺少名称，使用文件名 '{graph_name}' 作为图名称")

            # 检查是否存在同名图，若存在则返回冲突错误
            existing_graph = graph_service.get_graph(graph_name)
            if existing_graph:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"已存在名为 '{graph_name}' 的图"
                )

            # 导入MCP配置（如果存在）
            mcp_path = temp_path / "attachment" / "mcp.json"
            skipped_servers = []
            if mcp_path.exists():
                try:
                    with open(mcp_path, 'r', encoding='utf-8') as f:
                        import_mcp_config = json.load(f)

                    # 获取当前MCP配置
                    current_mcp_config = FileManager.load_mcp_config()

                    # 合并配置（跳过已存在的）
                    for server_name, server_config in import_mcp_config.get("mcpServers", {}).items():
                        if server_name in current_mcp_config.get("mcpServers", {}):
                            # 服务器名称已存在，跳过导入
                            logger.info(f"跳过导入已存在的MCP服务器: '{server_name}'")
                            skipped_servers.append(server_name)
                        else:
                            # 不存在冲突，直接添加
                            current_mcp_config.setdefault("mcpServers", {})[server_name] = server_config

                    # 保存更新后的MCP配置
                    FileManager.save_mcp_config(current_mcp_config)
                    logger.info("已合并导入的MCP服务器配置")
                except Exception as e:
                    logger.error(f"导入MCP配置时出错: {str(e)}")

            # 导入模型配置（如果存在）
            model_path = temp_path / "attachment" / "model.json"
            skipped_models = []
            models_need_api_key = []

            if model_path.exists():
                try:
                    with open(model_path, 'r', encoding='utf-8') as f:
                        import_models = json.load(f).get("models", [])

                    # 获取当前模型配置
                    current_models = model_service.get_all_models()
                    current_model_names = {model["name"] for model in current_models}

                    # 合并模型配置（跳过已存在的）
                    for model in import_models:
                        if model["name"] in current_model_names:
                            # 模型名称已存在，跳过导入
                            logger.info(f"跳过导入已存在的模型: '{model['name']}'")
                            skipped_models.append(model["name"])
                        else:
                            # 检查API密钥
                            if not model.get("api_key"):
                                models_need_api_key.append(model["name"])

                            # 添加模型
                            model_service.add_model(model)
                            current_model_names.add(model["name"])

                    if models_need_api_key:
                        logger.warning(f"以下模型需要添加API密钥: {', '.join(models_need_api_key)}")
                except Exception as e:
                    logger.error(f"导入模型配置时出错: {str(e)}")

            # 保存图配置
            success = graph_service.save_graph(graph_name, graph_config)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="保存图配置失败"
                )

            # 复制提示词文件（如果存在）
            prompts_dir = temp_path / "prompts"
            if prompts_dir.exists() and prompts_dir.is_dir():
                try:
                    target_prompts_dir = settings.get_agent_prompt_dir(graph_name)
                    target_prompts_dir.mkdir(parents=True, exist_ok=True)

                    for prompt_file in prompts_dir.glob("*"):
                        if prompt_file.is_file():
                            shutil.copy2(prompt_file, target_prompts_dir / prompt_file.name)
                except Exception as e:
                    logger.error(f"复制提示词文件时出错: {str(e)}")

            # 复制README文件（如果存在）
            readme_path = temp_path / "readme.md"
            if readme_path.exists() and readme_path.is_file():
                try:
                    target_agent_dir = settings.get_agent_dir(graph_name)
                    target_agent_dir.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(readme_path, target_agent_dir / "readme.md")
                except Exception as e:
                    logger.error(f"复制README文件时出错: {str(e)}")

            # 6.5. 导入AI生成的MCP工具（如果存在）
            mcp_tools_dir = temp_path / "mcp"
            imported_mcp_tools = []
            skipped_mcp_tools = []
            
            if mcp_tools_dir.exists():
                logger.info("发现MCP工具目录，开始导入AI生成的MCP工具")
                
                for tool_dir in mcp_tools_dir.iterdir():
                    if tool_dir.is_dir():
                        tool_name = tool_dir.name
                        
                        # 检查是否已存在同名工具
                        if FileManager.mcp_tool_exists(tool_name):
                            logger.info(f"跳过导入已存在的MCP工具: '{tool_name}'")
                            skipped_mcp_tools.append(tool_name)
                            continue
                        
                        try:
                            # 直接复制整个工具目录（包括虚拟环境）
                            target_tool_dir = settings.get_mcp_tool_dir(tool_name)
                            shutil.copytree(tool_dir, target_tool_dir)
                            logger.info(f"已复制完整的MCP工具环境: {tool_name}")

                        except Exception as e:
                            logger.error(f"导入MCP工具 {tool_name} 时出错: {str(e)}")
                            # 清理部分创建的文件
                            try:
                                if settings.get_mcp_tool_dir(tool_name).exists():
                                    FileManager.delete_mcp_tool(tool_name)
                            except:
                                pass

            return {
                "status": "success",
                "message": f"图包 '{graph_name}' 导入成功",
                "needs_api_key": models_need_api_key,
                "skipped_models": skipped_models,
                "skipped_servers": skipped_servers,
                "imported_mcp_tools": imported_mcp_tools,
                "skipped_mcp_tools": skipped_mcp_tools
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导入图包时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入图包时出错: {str(e)}"
        )

@router.post("/graphs/import_from_file", response_model=Dict[str, Any])
async def import_graph_from_file(file: UploadFile = File(...)):
    """从上传的JSON文件导入图配置"""
    try:
        # 验证文件类型
        if not file.filename.endswith('.json'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件必须是JSON格式"
            )

        # 创建临时文件并确保文件句柄完全关闭
        temp_fd, temp_path_str = tempfile.mkstemp(suffix='.json')
        temp_path = Path(temp_path_str)
        
        try:
            # 写入上传的文件内容
            content = await file.read()
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(content)
            result = await import_graph(GraphFilePath(file_path=str(temp_path)))
            return result
        finally:
            # 清理临时文件
            try:
                if temp_path.exists():
                    temp_path.unlink()
            except Exception as cleanup_error:
                logger.warning(f"清理临时文件失败: {cleanup_error}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"从文件导入图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"从文件导入图时出错: {str(e)}"
        )

@router.post("/graphs/import_package_from_file", response_model=Dict[str, Any])
async def import_graph_package_from_file(file: UploadFile = File(...)):
    """从上传的ZIP包导入图配置及相关组件"""
    try:
        # 验证文件类型
        if not file.filename.endswith('.zip'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件必须是ZIP格式"
            )

        # 创建临时文件并确保文件句柄完全关闭
        temp_fd, temp_path_str = tempfile.mkstemp(suffix='.zip')
        temp_path = Path(temp_path_str)
        
        try:
            # 写入上传的文件内容
            content = await file.read()
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(content)
            result = await import_graph_package(GraphFilePath(file_path=str(temp_path)))
            return result
        finally:
            # 清理临时文件
            try:
                if temp_path.exists():
                    temp_path.unlink()
            except Exception as cleanup_error:
                logger.warning(f"清理临时文件失败: {cleanup_error}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"从文件导入图包时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"从文件导入图包时出错: {str(e)}"
        )

@router.get("/graphs/{graph_name}/export", response_model=Dict[str, Any])
async def export_graph(graph_name: str):
    """打包并导出图配置"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 创建临时目录用于打包
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # 创建必要的子目录
            prompts_dir = temp_path / "prompts"
            prompts_dir.mkdir()
            attachment_dir = temp_path / "attachment"
            attachment_dir.mkdir()

            # 1. 复制配置文件
            config_path = temp_path / "config.json"
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(graph_config, f, ensure_ascii=False, indent=2)

            # 2. 检查是否存在自定义README文件
            agent_dir = settings.get_agent_dir(graph_name)
            readme_found = False

            # 查找可能的README文件名（不区分大小写）
            readme_patterns = ["readme.md", "README.md", "Readme.md"]
            for pattern in readme_patterns:
                readme_path = agent_dir / pattern
                if readme_path.exists() and readme_path.is_file():
                    # 复制现有README
                    shutil.copy2(readme_path, temp_path / "readme.md")
                    readme_found = True
                    logger.info(f"使用现有的README文件: {readme_path}")
                    break

            # 3. 提取并复制提示词文件
            source_prompts_dir = settings.get_agent_prompt_dir(graph_name)
            if source_prompts_dir.exists():
                for prompt_file in source_prompts_dir.glob("*"):
                    if prompt_file.is_file():
                        shutil.copy2(prompt_file, prompts_dir / prompt_file.name)

            # 4. 从图配置中提取服务器和模型信息
            used_servers = set()
            used_models = set()

            # 扫描所有节点
            for node in graph_config.get("nodes", []):
                # 提取服务器
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

                # 提取模型
                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            # 5. 提取服务器配置
            mcp_config = FileManager.load_mcp_config()
            filtered_mcp_config = {"mcpServers": {}}

            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

            # 保存服务器配置
            mcp_path = attachment_dir / "mcp.json"
            with open(mcp_path, 'w', encoding='utf-8') as f:
                json.dump(filtered_mcp_config, f, ensure_ascii=False, indent=2)

            # 6. 提取模型配置（清空API密钥）
            model_configs = []
            all_models = model_service.get_all_models()

            for model in all_models:
                if model["name"] in used_models:
                    # 创建模型配置副本，清空API密钥
                    safe_model = model.copy()
                    safe_model["api_key"] = ""
                    model_configs.append(safe_model)

            # 保存模型配置
            model_path = attachment_dir / "model.json"
            with open(model_path, 'w', encoding='utf-8') as f:
                json.dump({"models": model_configs}, f, ensure_ascii=False, indent=2)

            # 6.5. 检查并打包AI生成的MCP工具
            ai_mcp_tools = set()
            for server_name in used_servers:
                if FileManager.mcp_tool_exists(server_name):
                    ai_mcp_tools.add(server_name)
            
            if ai_mcp_tools:
                logger.info(f"发现AI生成的MCP工具: {ai_mcp_tools}")
                mcp_tools_dir = temp_path / "mcp"
                mcp_tools_dir.mkdir()
                
                for tool_name in ai_mcp_tools:
                    tool_source_dir = settings.get_mcp_tool_dir(tool_name)
                    tool_target_dir = mcp_tools_dir / tool_name
                    
                    if tool_source_dir.exists():
                        # 完整复制工具目录，包括虚拟环境，确保环境一致性
                        shutil.copytree(tool_source_dir, tool_target_dir)
                        logger.info(f"已完整打包AI生成的MCP工具（含虚拟环境）: {tool_name}")

            # 7. 如果没有找到README，则生成一个
            if not readme_found:
                readme_content = FlowDiagram.generate_graph_readme(graph_config, filtered_mcp_config, model_configs)

                readme_path = temp_path / "readme.md"
                with open(readme_path, 'w', encoding='utf-8') as f:
                    f.write(readme_content)

            # 8. 创建ZIP文件（在exports目录中直接创建，而不是在临时目录中）
            output_dir = settings.EXPORTS_DIR
            output_dir.mkdir(exist_ok=True)
            zip_filename = f"{graph_name}.zip"
            final_zip_path = output_dir / zip_filename

            with zipfile.ZipFile(final_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 添加根目录下的文件（明确指定文件列表，避免包含其他文件）
                for file_name in ["config.json", "readme.md"]:
                    file_path = temp_path / file_name
                    if file_path.exists() and file_path.is_file():
                        zipf.write(file_path, arcname=file_name)

                # 添加prompts目录
                if prompts_dir.exists():
                    for file in prompts_dir.glob("*"):
                        if file.is_file():
                            zipf.write(file, arcname=f"prompts/{file.name}")

                # 添加attachment目录
                if attachment_dir.exists():
                    for file in attachment_dir.glob("*"):
                        if file.is_file():
                            zipf.write(file, arcname=f"attachment/{file.name}")

                # 添加mcp目录（如果存在AI生成的工具）
                mcp_dir = temp_path / "mcp"
                if mcp_dir.exists():
                    for tool_dir in mcp_dir.glob("*"):
                        if tool_dir.is_dir():
                            # 递归添加工具目录中的所有文件
                            for file_path in tool_dir.rglob("*"):
                                if file_path.is_file():
                                    # 计算相对路径
                                    relative_path = file_path.relative_to(temp_path)
                                    zipf.write(file_path, arcname=str(relative_path))

            logger.info(f"图 '{graph_name}' 已成功导出到 {final_zip_path}")

            return {
                "status": "success",
                "message": f"图 '{graph_name}' 导出成功",
                "file_path": str(final_zip_path),
                "ai_mcp_tools": list(ai_mcp_tools) if ai_mcp_tools else []
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出图时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出图时出错: {str(e)}"
        )

# ======= 图执行 =======
@router.post("/graphs/execute")
async def execute_graph(input_data: GraphInput):
    """执行图并返回流式结果"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(input_data.graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

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

# ======= Chat模式API接口=======
@router.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """Chat completions接口 - 支持流式响应"""
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

        # 生成流式响应
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


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetailResponse)
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
# ============系统接口===========
@router.post("/system/shutdown", response_model=Dict[str, Any])
async def shutdown_service(background_tasks: BackgroundTasks):
    """优雅关闭MAG服务"""
    logger.info("收到关闭服务请求")

    try:
        active_conversations = list(graph_service.active_conversations.keys())
        logger.info(f"当前有 {len(active_conversations)} 个活跃会话")

        # 保存所有活跃会话到文件中
        for conv_id in active_conversations:
            try:
                graph_service.conversation_manager.update_conversation_file(conv_id)
                logger.info(f"已保存会话: {conv_id}")
            except Exception as e:
                logger.error(f"保存会话 {conv_id} 时出错: {str(e)}")

        background_tasks.add_task(_perform_shutdown)

        return {
            "status": "success",
            "message": "服务关闭过程已启动",
            "active_sessions": len(active_conversations)
        }
    except Exception as e:
        logger.error(f"启动关闭过程时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"关闭服务失败: {str(e)}"
        )

async def _perform_shutdown():
    """执行实际的关闭操作"""
    logger.info("开始执行关闭流程")

    try:
        client_notified = await mcp_service.notify_client_shutdown()
        if not client_notified:
            await mcp_service.cleanup(force=True)
        else:
            await mcp_service.cleanup(force=False)

        logger.info("MCP服务已清理")
        logger.info("即将关闭Host服务...")
        import signal
        import os
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"执行关闭流程时出错: {str(e)}")
