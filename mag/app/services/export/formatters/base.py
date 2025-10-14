from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseFormatter(ABC):
    """格式化器基类"""

    @abstractmethod
    def format(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        格式化对话数据

        Args:
            conversations: 包含完整信息的对话列表

        Returns:
            List[Dict[str, Any]]: 格式化后的数据列表
        """
        pass