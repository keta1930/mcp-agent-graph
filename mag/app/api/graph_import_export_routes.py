import json
import logging
import tempfile
import zipfile
import shutil
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from typing import Dict, Any

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.templates.flow_diagram import FlowDiagram
from app.models.graph_schema import GraphFilePath

logger = logging.getLogger(__name__)

router = APIRouter(tags=["graph"])

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