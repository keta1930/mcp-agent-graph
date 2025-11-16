"""
系统工具：register_mcp
从文档中解析MCP配置并注册到系统
"""
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "register_mcp",
        "description": "从指定文档中解析MCP配置（XML格式）并注册到系统。文档需要包含完整的MCP工具定义，包括：folder_name、script_files（必须包含main.py）、dependencies、readme等XML标签。",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "包含MCP配置的文档名称（含路径），例如：'mcp/weather_tool.md'"
                }
            },
            "required": ["filename"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    从文档中解析MCP配置并注册

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（conversation_id, filename）

    Returns:
        {
            "success": True,
            "tool_name": "工具名称",
            "message": "MCP工具注册成功"
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.infrastructure.storage.file_storage import FileManager
        from app.utils.text_parser import parse_ai_mcp_generation_response

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")

        if not conversation_id or not filename:
            return {
                "success": False,
                "message": "缺少必需参数：conversation_id或filename",
                "tool_name": None
            }

        # 1. 读取文档内容
        logger.info(f"正在读取文档: {filename}")
        content = await conversation_document_manager.read_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename
        )

        if content is None:
            return {
                "success": False,
                "message": f"读取文档失败或文档不存在：{filename}",
                "tool_name": None
            }

        # 2. 解析XML内容
        logger.info(f"正在解析MCP配置，文档长度: {len(content)} 字符")
        parsed_results = parse_ai_mcp_generation_response(content)

        # 3. 验证必需字段
        required_fields = ["folder_name", "script_files", "dependencies", "readme"]
        missing_fields = []

        for field in required_fields:
            value = parsed_results.get(field)
            if field == "script_files":
                if not value or len(value) == 0:
                    missing_fields.append(field)
                elif "main.py" not in value:
                    missing_fields.append("main.py脚本")
            else:
                if not value:
                    missing_fields.append(field)

        if missing_fields:
            return {
                "success": False,
                "message": f"MCP配置不完整，缺少必需字段: {', '.join(missing_fields)}",
                "tool_name": None,
                "missing_fields": missing_fields
            }

        # 4. 获取配置数据
        folder_name = parsed_results.get("folder_name")
        script_files = parsed_results.get("script_files", {})
        dependencies = parsed_results.get("dependencies", "")
        readme = parsed_results.get("readme", "# MCP Tool\n\nAI生成的MCP工具")

        # 确保工具名称唯一
        original_name = folder_name
        counter = 1
        while FileManager.mcp_tool_exists(folder_name):
            folder_name = f"{original_name}_{counter}"
            counter += 1
            logger.info(f"工具名称已存在，重命名为: {folder_name}")

        # 5. 创建MCP工具文件
        logger.info(f"正在创建MCP工具: {folder_name}")
        success = FileManager.create_mcp_tool(
            folder_name,
            script_files,
            readme,
            dependencies
        )

        if not success:
            return {
                "success": False,
                "message": "创建MCP工具文件失败",
                "tool_name": None
            }

        # 6. 注册MCP工具到配置
        logger.info(f"正在注册MCP工具到配置: {folder_name}")
        register_success = await _register_mcp_to_config(folder_name, user_id)

        if not register_success:
            # 注册失败，清理文件
            logger.error(f"注册MCP工具失败，正在清理文件: {folder_name}")
            FileManager.delete_mcp_tool(folder_name)
            return {
                "success": False,
                "message": "注册MCP工具到配置失败",
                "tool_name": None
            }

        logger.info(f"成功创建并注册MCP工具: {folder_name}")

        return {
            "success": True,
            "tool_name": folder_name,
            "message": f"MCP工具 '{folder_name}' 注册成功"
        }

    except Exception as e:
        logger.error(f"register_mcp 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"注册MCP工具失败：{str(e)}",
            "tool_name": None
        }


async def _register_mcp_to_config(tool_name: str, user_id: str) -> bool:
    """
    注册AI生成的MCP工具到团队配置（使用stdio，乐观锁）

    Args:
        tool_name: 工具名称
        user_id: 用户ID

    Returns:
        注册是否成功
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.file_storage import FileManager
        from app.services.mcp.mcp_service import mcp_service

        max_retries = 3
        for attempt in range(max_retries):
            try:
                # 获取当前配置
                current_config_data = await mongodb_client.get_mcp_config()
                current_config = current_config_data.get("config", {"mcpServers": {}})
                current_version = current_config_data.get("version", 1)

                # 获取虚拟环境Python解释器和主脚本路径
                venv_python = FileManager.get_mcp_tool_venv_python(tool_name)
                main_script = FileManager.get_mcp_tool_main_script(tool_name)

                if not venv_python or not main_script:
                    logger.error(f"找不到工具 {tool_name} 的Python解释器或主脚本")
                    return False

                # 添加到配置
                current_config.setdefault("mcpServers", {})[tool_name] = {
                    "autoApprove": [],
                    "disabled": False,
                    "timeout": 60,
                    "command": str(venv_python),
                    "args": [str(main_script)],
                    "transportType": "stdio",
                    "ai_generated": True,
                    "provider_user_id": user_id,
                    "created_at": datetime.now().isoformat()
                }

                # 更新配置（带版本控制）
                success = await mcp_service.update_config(current_config, current_version)

                # 检查版本冲突
                if success.get("status", {}).get("error") == "version_conflict":
                    logger.warning(f"注册MCP工具时版本冲突，重试 {attempt + 1}/{max_retries}")
                    await asyncio.sleep(0.1)
                    continue

                # 检查是否成功
                if success.get("status", {}).get("message"):
                    logger.info(f"成功注册AI生成的MCP工具: {tool_name}")
                    return True
                else:
                    logger.error(f"注册MCP工具失败: {success}")
                    return False

            except Exception as e:
                logger.error(f"注册AI生成的MCP工具时出错: {str(e)}")
                return False

        logger.error(f"注册MCP工具超过最大重试次数: {tool_name}")
        return False

    except Exception as e:
        logger.error(f"_register_mcp_to_config 执行失败: {str(e)}")
        return False
