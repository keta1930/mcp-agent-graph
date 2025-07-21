import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class MessageBuilder:
    """消息构建器 - 统一管理消息相关的功能"""

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

    def validate_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        验证和处理消息格式
        
        Args:
            messages: 原始消息列表
            
        Returns:
            验证后的消息列表
        """
        processed_messages = []
        
        for msg in messages:
            # 检查必要字段
            if "role" not in msg or "content" not in msg:
                logger.error(f"消息格式错误，缺少必要字段: {msg}")
                continue

            # 确保content是字符串
            if msg["content"] is not None and not isinstance(msg["content"], str):
                msg["content"] = str(msg["content"])

            processed_messages.append(msg)
            
        logger.debug(f"验证消息完成，处理了 {len(processed_messages)} 条消息")
        return processed_messages

    def format_tool_message(self, tool_call_id: str, content: str) -> Dict[str, Any]:
        """
        格式化工具消息
        
        Args:
            tool_call_id: 工具调用ID
            content: 工具执行结果内容
            
        Returns:
            格式化后的工具消息
        """
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": content
        }

    def format_assistant_message(self, content: str, tool_calls: List[Dict] = None) -> Dict[str, Any]:
        """
        格式化助手消息
        
        Args:
            content: 助手回复内容
            tool_calls: 工具调用列表（可选）
            
        Returns:
            格式化后的助手消息
        """
        message = {
            "role": "assistant",
            "content": content or ""
        }
        
        if tool_calls:
            message["tool_calls"] = tool_calls
            
        return message

    def extract_message_content(self, messages: List[Dict[str, Any]], role: str) -> str:
        """
        从消息列表中提取指定角色的第一条消息内容
        
        Args:
            messages: 消息列表
            role: 消息角色 (user, assistant, system, tool)
            
        Returns:
            消息内容，如果未找到返回空字符串
        """
        for msg in messages:
            if msg.get("role") == role:
                return msg.get("content", "")
        return ""