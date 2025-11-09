import json
import logging
import tempfile
import zipfile
import shutil
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Depends
from typing import Dict, Any
from app.infrastructure.database.mongodb import mongodb_client
from app.services.mcp_service import mcp_service
from app.core.config import settings
from app.infrastructure.storage.file_storage import FileManager
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.templates.flow_diagram import FlowDiagram
from app.models.graph_schema import GraphFilePath
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["graph"])

# ======= 图导入/导出功能 =======
@router.post("/graphs/import", response_model=Dict[str, Any])
async def import_graph(data: GraphFilePath, current_user: CurrentUser = Depends(get_current_user)):
    """从JSON文件导入图配置"""
    try:
        file_path = Path(data.file_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到文件 '{data.file_path}'"
            )

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件不是有效的JSON格式"
            )

        if "name" not in graph_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON文件缺少必要的'name'字段"
            )

        valid, error = await graph_service.validate_graph(graph_data, user_id=current_user.user_id)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        graph_name = graph_data['name']
        existing_graph = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"已存在名为 '{graph_name}' 的图"
            )

        try:
            mcp_config_data = await mongodb_client.get_mcp_config()
            mcp_config = mcp_config_data.get("config", {"mcpServers": {}}) if mcp_config_data else {"mcpServers": {}}
            filtered_mcp_config = {"mcpServers": {}}

            used_servers = set()
            for node in graph_data.get("nodes", []):
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

            used_models = set()
            for node in graph_data.get("nodes", []):
                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            model_configs = []
            all_models = await model_service.get_all_models(user_id=current_user.user_id)
            for model in all_models:
                if model["name"] in used_models:
                    model_configs.append(model)

            readme_content = FlowDiagram.generate_graph_readme(graph_data, filtered_mcp_config, model_configs)
            graph_data["readme"] = readme_content

        except Exception as e:
            logger.error(f"生成README时出错: {str(e)}")

        success = await graph_service.save_graph(graph_name, graph_data, user_id=current_user.user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="导入图失败"
            )

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
async def import_graph_package(data: GraphFilePath, current_user: CurrentUser = Depends(get_current_user)):
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
                graph_name = file_path.stem
                graph_config["name"] = graph_name
                logger.warning(f"配置文件中缺少名称，使用文件名 '{graph_name}' 作为图名称")

            existing_graph = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
            if existing_graph:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"已存在名为 '{graph_name}' 的图"
                )

            mcp_path = temp_path / "attachment" / "mcp.json"
            skipped_servers = []
            if mcp_path.exists():
                try:
                    with open(mcp_path, 'r', encoding='utf-8') as f:
                        import_mcp_config = json.load(f)

                    current_mcp_config_data = await mongodb_client.get_mcp_config()
                    current_mcp_config = current_mcp_config_data.get("config", {"mcpServers": {}}) if current_mcp_config_data else {"mcpServers": {}}
                    current_version = current_mcp_config_data.get("version", 1) if current_mcp_config_data else 1

                    for server_name, server_config in import_mcp_config.get("mcpServers", {}).items():
                        if server_name in current_mcp_config.get("mcpServers", {}):
                            logger.info(f"跳过导入已存在的MCP服务器: '{server_name}'")
                            skipped_servers.append(server_name)
                        else:
                            # 设置导入用户为provider
                            server_config['provider_user_id'] = current_user.user_id
                            server_config['created_at'] = datetime.now().isoformat()
                            current_mcp_config.setdefault("mcpServers", {})[server_name] = server_config
                            logger.info(f"导入MCP服务器 '{server_name}'，provider设置为: {current_user.user_id}")

                    await mcp_service.update_config(current_mcp_config, current_version)
                    logger.info("已合并导入的MCP服务器配置")
                except Exception as e:
                    logger.error(f"导入MCP配置时出错: {str(e)}")

            model_path = temp_path / "attachment" / "model.json"
            skipped_models = []
            models_need_api_key = []

            if model_path.exists():
                try:
                    with open(model_path, 'r', encoding='utf-8') as f:
                        import_models = json.load(f).get("models", [])

                    current_models = await model_service.get_all_models(user_id=current_user.user_id)
                    current_model_names = {model["name"] for model in current_models}

                    for model in import_models:
                        if model["name"] in current_model_names:
                            logger.info(f"跳过导入已存在的模型: '{model['name']}'")
                            skipped_models.append(model["name"])
                        else:
                            if not model.get("api_key"):
                                models_need_api_key.append(model["name"])

                            await model_service.add_model(current_user.user_id, model)
                            current_model_names.add(model["name"])

                    if models_need_api_key:
                        logger.warning(f"以下模型需要添加API密钥: {', '.join(models_need_api_key)}")
                except Exception as e:
                    logger.error(f"导入模型配置时出错: {str(e)}")

            readme_path = temp_path / "readme.md"
            if readme_path.exists() and readme_path.is_file():
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        graph_config["readme"] = f.read()
                except Exception as e:
                    logger.error(f"读取README文件时出错: {str(e)}")

            mcp_tools_dir = temp_path / "mcp"
            imported_mcp_tools = []
            skipped_mcp_tools = []

            if mcp_tools_dir.exists():
                logger.info("发现MCP工具目录，开始导入AI生成的MCP工具")

                for tool_dir in mcp_tools_dir.iterdir():
                    if tool_dir.is_dir():
                        tool_name = tool_dir.name

                        if FileManager.mcp_tool_exists(tool_name):
                            logger.info(f"跳过导入已存在的MCP工具: '{tool_name}'")
                            skipped_mcp_tools.append(tool_name)
                            continue

                        try:
                            target_tool_dir = settings.get_mcp_tool_dir(tool_name)
                            shutil.copytree(tool_dir, target_tool_dir)
                            logger.info(f"已复制完整的MCP工具环境: {tool_name}")

                        except Exception as e:
                            logger.error(f"导入MCP工具 {tool_name} 时出错: {str(e)}")
                            try:
                                if settings.get_mcp_tool_dir(tool_name).exists():
                                    FileManager.delete_mcp_tool(tool_name)
                            except:
                                pass

            success = await graph_service.save_graph(graph_name, graph_config, user_id=current_user.user_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="保存图配置失败"
                )

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
async def import_graph_from_file(file: UploadFile = File(...), current_user: CurrentUser = Depends(get_current_user)):
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
            result = await import_graph(GraphFilePath(file_path=str(temp_path)), current_user)
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
async def import_graph_package_from_file(file: UploadFile = File(...), current_user: CurrentUser = Depends(get_current_user)):
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
            result = await import_graph_package(GraphFilePath(file_path=str(temp_path)), current_user)
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
async def export_graph(graph_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """打包并导出图配置"""
    try:
        graph_doc = await graph_service.get_graph(graph_name, user_id=current_user.user_id)
        if not graph_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 提取config
        graph_config = graph_doc.get("config", {})

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            attachment_dir = temp_path / "attachment"
            attachment_dir.mkdir()

            config_path = temp_path / "config.json"
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(graph_config, f, ensure_ascii=False, indent=2)

            readme_content = graph_config.get("readme")
            if readme_content:
                readme_path = temp_path / "readme.md"
                with open(readme_path, 'w', encoding='utf-8') as f:
                    f.write(readme_content)

            used_servers = set()
            used_models = set()

            for node in graph_config.get("nodes", []):
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            mcp_config_data = await mongodb_client.get_mcp_config()
            mcp_config = mcp_config_data.get("config", {"mcpServers": {}}) if mcp_config_data else {"mcpServers": {}}
            filtered_mcp_config = {"mcpServers": {}}

            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    server_config = mcp_config["mcpServers"][server_name].copy()
                    # 移除用户相关元数据，使导出的配置可跨用户/团队使用
                    server_config.pop('provider_user_id', None)
                    server_config.pop('created_at', None)
                    filtered_mcp_config["mcpServers"][server_name] = server_config

            mcp_path = attachment_dir / "mcp.json"
            with open(mcp_path, 'w', encoding='utf-8') as f:
                json.dump(filtered_mcp_config, f, ensure_ascii=False, indent=2)

            model_configs = []
            all_models = await model_service.get_all_models(user_id=current_user.user_id)

            for model in all_models:
                if model["name"] in used_models:
                    safe_model = model.copy()
                    # 移除敏感信息
                    safe_model["api_key"] = ""
                    # 移除元数据
                    for meta_field in ["user_id", "created_at", "updated_at", "_id"]:
                        safe_model.pop(meta_field, None)
                    model_configs.append(safe_model)

            model_path = attachment_dir / "model.json"
            with open(model_path, 'w', encoding='utf-8') as f:
                json.dump({"models": model_configs}, f, ensure_ascii=False, indent=2)

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
                        shutil.copytree(tool_source_dir, tool_target_dir)
                        logger.info(f"已完整打包AI生成的MCP工具（含虚拟环境）: {tool_name}")

            output_dir = settings.EXPORTS_DIR
            output_dir.mkdir(exist_ok=True)
            zip_filename = f"{graph_name}.zip"
            final_zip_path = output_dir / zip_filename

            with zipfile.ZipFile(final_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_name in ["config.json", "readme.md"]:
                    file_path = temp_path / file_name
                    if file_path.exists() and file_path.is_file():
                        zipf.write(file_path, arcname=file_name)

                if attachment_dir.exists():
                    for file in attachment_dir.glob("*"):
                        if file.is_file():
                            zipf.write(file, arcname=f"attachment/{file.name}")

                mcp_dir = temp_path / "mcp"
                if mcp_dir.exists():
                    for tool_dir in mcp_dir.glob("*"):
                        if tool_dir.is_dir():
                            for file_path in tool_dir.rglob("*"):
                                if file_path.is_file():
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