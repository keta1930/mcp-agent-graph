import asyncio
import requests
import zipfile
import tempfile
import shutil
import os
import json
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
from urllib.parse import unquote
from pathlib import Path

from app.core.config import settings
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.core.file_manager import FileManager
from app.models.schema import (
    MCPServerConfig, MCPConfig, ModelConfig, GraphConfig, GraphInput,
    GraphResult, NodeResult, ModelConfigList, GraphGenerationRequest
)
from app.templates.flow_diagram import FlowDiagram
from app.utils.text_parser import parse_graph_response
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
    """批量删除指定的MCP服务器"""
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
        
        for server_name in server_names:
            if server_name in current_servers:
                servers_to_remove.append(server_name)
            else:
                not_found_servers.append(server_name)
        
        # 执行删除操作
        removed_servers = []
        update_result = None
        
        if servers_to_remove:
            # 删除服务器
            for server_name in servers_to_remove:
                del current_servers[server_name]
                removed_servers.append(server_name)
            
            # 更新配置
            updated_config = {"mcpServers": current_servers}
            update_result = await mcp_service.update_config(updated_config)
        
        # 构建响应
        if removed_servers and not not_found_servers:
            # 全部成功删除
            return {
                "status": "success",
                "message": f"成功删除 {len(removed_servers)} 个服务器",
                "removed_servers": removed_servers,
                "not_found_servers": [],
                "total_requested": len(server_names),
                "update_result": update_result
            }
        elif removed_servers and not_found_servers:
            # 部分成功
            return {
                "status": "partial_success",
                "message": f"成功删除 {len(removed_servers)} 个服务器，{len(not_found_servers)} 个服务器不存在",
                "removed_servers": removed_servers,
                "not_found_servers": not_found_servers,
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
                "total_requested": len(server_names),
                "update_result": None
            }
        else:
            # 空请求
            return {
                "status": "no_changes",
                "message": "没有服务器需要删除",
                "removed_servers": [],
                "not_found_servers": [],
                "total_requested": 0,
                "update_result": None
            }
        
    except Exception as e:
        logger.error(f"删除MCP服务器时出错: {str(e)}")
        return {
            "status": "error",
            "message": f"删除MCP服务器时出错: {str(e)}",
            "removed_servers": [],
            "not_found_servers": [],
            "total_requested": len(server_names) if server_names else 0
        }


# 修改现有的连接服务器函数
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

        # 检查并生成README文件
        try:
            agent_dir = settings.get_agent_dir(graph.name)
            readme_found = False
            readme_patterns = ["readme.md", "README.md", "Readme.md"]
            for pattern in readme_patterns:
                readme_path = agent_dir / pattern
                if readme_path.exists() and readme_path.is_file():
                    readme_found = True
                    logger.info(f"已存在README文件: {readme_path}")
                    break

            # 如果没有README，则生成一个
            if not readme_found:
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

                # 保存README文件
                agent_dir.mkdir(parents=True, exist_ok=True)
                readme_path = agent_dir / "readme.md"
                with open(readme_path, 'w', encoding='utf-8') as f:
                    f.write(readme_content)

                logger.info(f"已为图 '{graph.name}' 生成README文件")
        except Exception as e:
            logger.error(f"生成README文件时出错: {str(e)}")

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
        current_file_dir = Path(__file__).parent.parent  # 从 app/api 回到 app
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


@router.post("/graphs/generate", response_model=Dict[str, Any])
async def generate_graph(request: GraphGenerationRequest):
    """根据用户需求自动生成图配置"""
    try:
        # 1. 验证模型是否存在
        model_config = model_service.get_model(request.model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{request.model_name}'"
            )

        # 2. 复用现有的 get_prompt_template 函数获取提示词模板
        template_response = await get_prompt_template()
        final_prompt = template_response["prompt"].replace("{CREATE_GRAPH}", request.requirement)
        
        # 3. 调用模型生成图配置
        messages = [
            {"role": "user", "content": final_prompt}
        ]
        
        model_response = await model_service.call_model(
            model_name=request.model_name,
            messages=messages
        )
        
        if model_response.get("status") != "success":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"模型调用失败: {model_response.get('error', '未知错误')}"
            )
        
        # 4. 解析模型输出
        model_output = model_response.get("content", "")
        parsed_result = parse_graph_response(model_output)
        
        if not parsed_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"解析模型输出失败: {parsed_result.get('error', '未知错误')}"
            )
        
        graph_config = parsed_result["graph_config"]
        analysis = parsed_result.get("analysis", "")
        
        # 5. 验证图配置基本格式
        if not graph_config.get("name"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="生成的图配置缺少名称"
            )
        
        # 6. 处理重名冲突
        graph_name = graph_config.get("name")
        existing_graph = graph_service.get_graph(graph_name)
        if existing_graph:
            base_name = graph_name
            counter = 1
            while existing_graph:
                graph_name = f"{base_name}_{counter}"
                existing_graph = graph_service.get_graph(graph_name)
                counter += 1
            graph_config["name"] = graph_name
        
        # 7. 复用现有的 create_graph 函数
        from app.models.schema import GraphConfig
        try:
            validated_config = GraphConfig(**graph_config)
            create_response = await create_graph(validated_config)
            
            if create_response.get("status") != "success":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"创建图失败: {create_response.get('message', '未知错误')}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"生成的图配置验证失败: {str(e)}"
            )

        return {
            "status": "success", 
            "message": f"图 '{graph_name}' 生成成功",
            "graph_name": graph_name,
            "analysis": analysis,
            "model_output": model_output,
            "create_result": create_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成图时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成图时出错: {str(e)}"
        )

# ======= 图导入/导出功能 =======

class GraphFilePath(BaseModel):
    """图文件路径"""
    file_path: str


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

        # 检查并生成README文件
        try:
            # 检查是否存在自定义README文件
            agent_dir = settings.get_agent_dir(graph_name)
            readme_found = False

            # 查找可能的README文件名（不区分大小写）
            readme_patterns = ["readme.md", "README.md", "Readme.md"]
            for pattern in readme_patterns:
                readme_path = agent_dir / pattern
                if readme_path.exists() and readme_path.is_file():
                    readme_found = True
                    logger.info(f"已存在README文件: {readme_path}")
                    break

            # 如果没有找到README，则生成一个
            if not readme_found:
                # 获取图使用的服务器和模型信息

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

                # 保存README文件
                agent_dir.mkdir(parents=True, exist_ok=True)
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

            logger.info(f"图 '{graph_name}' 已成功导出到 {final_zip_path}")

            return {
                "status": "success",
                "message": f"图 '{graph_name}' 导出成功",
                "file_path": str(final_zip_path)
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

            return {
                "status": "success",
                "message": f"图包 '{graph_name}' 导入成功",
                "needs_api_key": models_need_api_key,
                "skipped_models": skipped_models,
                "skipped_servers": skipped_servers
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

# ======= 图执行 =======

@router.post("/graphs/execute", response_model=GraphResult)
async def execute_graph(input_data: GraphInput):
    """执行图并返回结果"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(input_data.graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

        # 执行图
        if input_data.conversation_id:
            # 继续现有会话
            result = await graph_service.continue_conversation(
                input_data.conversation_id,
                input_data.input_text,
                input_data.parallel
            )
        else:
            # 创建新会话
            result = await graph_service.execute_graph(
                input_data.graph_name,
                input_data.input_text,
                input_data.parallel
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"执行图时出错: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation(conversation_id: str):
    """获取会话状态"""
    try:
        conversation = graph_service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return {
            "conversation_id": conversation_id,
            "graph_name": conversation["graph_name"],
            "results": conversation["results"],
            "completed_nodes": list(conversation["completed_nodes"]),
            "pending_nodes": list(conversation["pending_nodes"])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话时出错: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def delete_conversation(conversation_id: str):
    """删除会话"""
    try:
        success = graph_service.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return {"status": "success", "message": f"会话 '{conversation_id}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除会话时出错: {str(e)}"
        )

@router.get("/conversations", response_model=List[str])
async def list_conversations():
    """列出所有会话"""
    try:
        return FileManager.list_conversations()
    except Exception as e:
        logger.error(f"列出会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出会话时出错: {str(e)}"
        )


@router.post("/graphs/continue", response_model=GraphResult)
async def continue_graph_execution(input_data: GraphInput):
    """从文件恢复并继续执行会话"""
    try:
        conversation_id = input_data.conversation_id
        if not conversation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须提供会话ID以继续执行"
            )

        # 检查会话是否存在
        if not FileManager.load_conversation_json(conversation_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )

        # 如果是从断点继续，设置标志位并传递到continue_conversation
        continue_from_checkpoint = input_data.continue_from_checkpoint or not input_data.input_text

        # 继续执行会话
        result = await graph_service.continue_conversation(
            conversation_id,
            input_data.input_text,
            input_data.parallel,
            continue_from_checkpoint
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"继续执行会话时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"继续执行会话时出错: {str(e)}"
        )

@router.get("/conversations/{conversation_id}/hierarchy", response_model=Dict[str, Any])
async def get_conversation_hierarchy(conversation_id: str):
    """获取会话层次结构"""
    try:
        hierarchy = graph_service.get_conversation_with_hierarchy(conversation_id)
        if not hierarchy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return hierarchy
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话层次结构时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话层次结构时出错: {str(e)}"
        )

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
        # 1. 清理所有会话
        for conv_id in list(graph_service.active_conversations.keys()):
            try:
                graph_service.delete_conversation(conv_id)
                logger.info(f"已清理会话: {conv_id}")
            except Exception as e:
                logger.error(f"清理会话 {conv_id} 时出错: {str(e)}")

        # 2. 首先尝试优雅关闭
        client_notified = await mcp_service.notify_client_shutdown()

        # 3. 如果优雅关闭失败，使用强制方式
        if not client_notified:
            await mcp_service.cleanup(force=True)
        else:
            # 即使优雅关闭成功，也执行cleanup以重置状态，但不强制终止
            await mcp_service.cleanup(force=False)

        logger.info("MCP服务已清理")

        # 4. 关闭Host服务
        logger.info("即将关闭Host服务...")
        import signal
        import os
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"执行关闭流程时出错: {str(e)}")
