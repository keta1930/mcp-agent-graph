import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class MessageBuilder:
    """消息构建器"""

    def __init__(self, mongodb_service=None):
        """
        初始化消息构建器
        
        Args:
            mongodb_service: MongoDB服务实例，用于获取历史消息
        """
        self.mongodb_service = mongodb_service

    async def build_chat_messages(self,
                                conversation_id: str,
                                user_prompt: str,
                                system_prompt: str = "") -> List[Dict[str, Any]]:
        """
        构建聊天消息上下文
        
        Args:
            conversation_id: 对话ID
            user_prompt: 用户输入
            system_prompt: 系统提示词
            
        Returns:
            消息列表
        """
        messages = []
        
        # 添加系统提示词
        messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # 获取历史消息
        if self.mongodb_service:
            conversation_data = await self.mongodb_service.get_conversation_with_messages(conversation_id)
            if conversation_data and conversation_data.get("rounds"):
                for round_data in conversation_data["rounds"]:
                    for msg in round_data.get("messages", []):
                        if msg.get("role") != "system": 
                            messages.append(msg)
        
        # 添加当前用户消息
        messages.append({
            "role": "user",
            "content": user_prompt
        })
        
        return messages
