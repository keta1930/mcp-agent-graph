from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseWriter(ABC):
    """写入器基类"""

    @abstractmethod
    def write(self, data: List[Dict[str, Any]], file_path: str) -> None:
        """
        将数据写入文件

        Args:
            data: 标准化后的数据列表
            file_path: 输出文件路径
        """
        pass

    @abstractmethod
    def get_file_extension(self) -> str:
        """
        获取文件扩展名

        Returns:
            str: 文件扩展名（如 ".jsonl"）
        """
        pass