"""
系统工具：get_agent_details
查看指定 Agent 的详细信息
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_agent_details",
        "description": "查看指定 Agent 的详细信息，包括完整的能力描述（card）。这是查找 Agent 的第三步，确认 Agent 的具体能力。",
        "parameters": {
            "type": "object",
            "properties": {
                "agent_name": {
                    "type": "string",
                    "description": "要查询的 Agent 名称"
                }
            },
            "required": ["agent_name"]
        }
    }
}


async def handler(user_id: str, agent_name: str, **kwargs) -> Dict[str, Any]:
    """
    获取 Agent 详细信息

    Args:
        user_id: 用户 ID
        agent_name: Agent 名称
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "agent": {
                "name": "code_reviewer",
                "card": "专业的代码审查 Agent...",
                "category": "coding",
                "tags": ["代码审查", "质量检查"],
                "model": "gpt-4",
                "max_actions": 50
            }
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        # 获取 Agent 详情
        agent_details = await mongodb_client.agent_repository.get_agent_details(
            agent_name=agent_name,
            user_id=user_id
        )

        if not agent_details:
            return {
                "success": False,
                "error": f"Agent 不存在: {agent_name}",
                "agent": None
            }

        return {
            "success": True,
            "agent": agent_details
        }

    except Exception as e:
        logger.error(f"get_agent_details 执行失败 (agent_name={agent_name}): {str(e)}")
        return {
            "success": False,
            "error": f"获取 Agent 详情失败: {str(e)}",
            "agent": None
        }
