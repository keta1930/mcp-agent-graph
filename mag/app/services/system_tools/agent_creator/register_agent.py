"""
系统工具：register_agent
从 JSON 文档中读取 Agent 配置并注册到系统
"""
import logging
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "register_agent",
            "description": "从指定的 JSON 文档中读取 Agent 配置并注册到系统。文档必须是有效的 JSON 格式，包含完整的 Agent 配置字段（name、card、model、category 等）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "包含 Agent 配置的 JSON 文档名称（含路径），例如：'agent/code_analyzer.json'"
                    }
                },
                "required": ["filename"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "register_agent",
            "description": "Read Agent configuration from the specified JSON document and register it to the system. The document must be in valid JSON format and contain complete Agent configuration fields (name, card, model, category, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Name of the JSON document containing Agent configuration (with path), for example: 'agent/code_analyzer.json'"
                    }
                },
                "required": ["filename"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    从 JSON 文档中读取 Agent 配置并注册

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（conversation_id, filename）

    Returns:
        {
            "success": True,
            "agent_name": "agent_name",
            "message": "Agent 注册成功"
        }
    """
    try:
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.services.agent.agent_service import agent_service
        from app.services.system_tools.registry import get_current_language
        
        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")

        if not conversation_id or not filename:
            error_msg = "Missing required parameters: conversation_id or filename" if language == "en" else "缺少必需参数：conversation_id 或 filename"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None
            }

        # 1. 读取 JSON 文档内容
        logger.info(f"正在读取 JSON 文档: {filename}")
        content = await conversation_document_manager.read_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename
        )

        if content is None:
            error_msg = f"Failed to read document or document does not exist: {filename}" if language == "en" else f"读取文档失败或文档不存在：{filename}"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None
            }

        # 2. 解析 JSON 配置
        logger.info(f"正在解析 Agent 配置，文档长度: {len(content)} 字符")
        try:
            agent_config = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {str(e)}")
            error_msg = f"JSON parsing failed, please ensure the document is in valid JSON format: {str(e)}" if language == "en" else f"JSON 解析失败，请确保文档是有效的 JSON 格式: {str(e)}"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None
            }

        # 3. 验证配置是否为字典
        if not isinstance(agent_config, dict):
            error_msg = "Agent configuration must be a JSON object (dictionary)" if language == "en" else "Agent 配置必须是 JSON 对象（字典）"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None
            }

        # 4. 验证必需字段
        required_fields = ["name", "card", "model", "category"]
        missing_fields = []

        for field in required_fields:
            if field not in agent_config or not agent_config.get(field):
                missing_fields.append(field)

        if missing_fields:
            error_msg = f"Agent configuration is incomplete, missing required fields: {', '.join(missing_fields)}" if language == "en" else f"Agent 配置不完整，缺少必需字段: {', '.join(missing_fields)}"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None,
                "missing_fields": missing_fields
            }

        # 5. 获取 Agent 名称
        agent_name = agent_config.get("name")

        # 6. 检查 Agent 是否已存在
        existing_agent = await agent_service.get_agent(agent_name, user_id)
        if existing_agent:
            logger.warning(f"Agent 已存在: {agent_name}，将进行更新")
            # 更新现有 Agent
            result = await agent_service.update_agent(
                agent_name=agent_name,
                agent_config=agent_config,
                user_id=user_id
            )
            
            if result.get("success"):
                logger.info(f"成功更新 Agent: {agent_name}")
                success_msg = f"Agent '{agent_name}' updated successfully" if language == "en" else f"Agent '{agent_name}' 更新成功"
                return {
                    "success": True,
                    "agent_name": agent_name,
                    "message": success_msg
                }
            else:
                error_msg = f"Failed to update Agent: {result.get('error', 'Unknown error')}" if language == "en" else f"更新 Agent 失败: {result.get('error', '未知错误')}"
                return {
                    "success": False,
                    "message": error_msg,
                    "agent_name": None
                }
        
        # 7. 创建新 Agent
        logger.info(f"正在创建 Agent: {agent_name}")
        result = await agent_service.create_agent(
            agent_config=agent_config,
            user_id=user_id
        )

        if result.get("success"):
            logger.info(f"成功创建 Agent: {agent_name}")
            success_msg = f"Agent '{agent_name}' registered successfully" if language == "en" else f"Agent '{agent_name}' 注册成功"
            return {
                "success": True,
                "agent_name": agent_name,
                "message": success_msg
            }
        else:
            error_msg = f"Failed to create Agent: {result.get('error', 'Unknown error')}" if language == "en" else f"创建 Agent 失败: {result.get('error', '未知错误')}"
            return {
                "success": False,
                "message": error_msg,
                "agent_name": None
            }

    except Exception as e:
        logger.error(f"register_agent 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        error_msg = f"Failed to register Agent: {str(e)}" if language == "en" else f"注册 Agent 失败：{str(e)}"
        return {
            "success": False,
            "message": error_msg,
            "agent_name": None
        }
