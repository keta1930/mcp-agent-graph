"""
工具执行器基类

定义工具执行器的通用接口和基础功能
"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class BaseToolExecutor(ABC):
    """工具执行器基类
    
    定义所有工具执行器的通用接口
    """

    @abstractmethod
    async def execute(self, tool_name: str, arguments: Dict[str, Any], 
                     tool_call_id: str, **context) -> Dict[str, Any]:
        """执行工具调用
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
            tool_call_id: 工具调用ID
            **context: 上下文参数（如 user_id, conversation_id 等）
            
        Returns:
            工具执行结果，包含 tool_call_id 和 content
        """
        pass

    @abstractmethod
    def can_handle(self, tool_name: str) -> bool:
        """判断是否可以处理指定工具
        
        Args:
            tool_name: 工具名称
            
        Returns:
            True 如果可以处理，否则 False
        """
        pass

    def _format_result(self, tool_call_id: str, content: str) -> Dict[str, Any]:
        """格式化工具执行结果
        
        Args:
            tool_call_id: 工具调用ID
            content: 结果内容
            
        Returns:
            标准格式的结果字典
        """
        return {
            "tool_call_id": tool_call_id,
            "content": content
        }

    def _format_error(self, tool_call_id: str, error_msg: str) -> Dict[str, Any]:
        """格式化错误结果
        
        Args:
            tool_call_id: 工具调用ID
            error_msg: 错误信息
            
        Returns:
            标准格式的错误结果字典
        """
        return {
            "tool_call_id": tool_call_id,
            "content": error_msg
        }
