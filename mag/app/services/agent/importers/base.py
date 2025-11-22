"""
Agent 导入器基类
定义导入器的通用接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseImporter(ABC):
    """Agent 导入器基类"""

    @abstractmethod
    async def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        解析文件内容，提取Agent配置列表

        Args:
            file_content: 文件内容（字节）

        Returns:
            List[Dict[str, Any]]: Agent配置列表

        Raises:
            ValueError: 文件格式错误或解析失败
        """
        pass

    @abstractmethod
    def get_supported_extensions(self) -> List[str]:
        """
        获取支持的文件扩展名列表

        Returns:
            List[str]: 扩展名列表（如 [".json"]）
        """
        pass

    def validate_agent_config(self, agent_config: Dict[str, Any]) -> tuple[bool, str]:
        """
        基础验证Agent配置（必需字段检查）

        Args:
            agent_config: Agent配置字典

        Returns:
            tuple[bool, str]: (是否有效, 错误信息)
        """
        # 验证必需字段
        required_fields = ["name", "model", "card", "category"]
        for field in required_fields:
            if field not in agent_config or not agent_config[field]:
                return False, f"缺少必需字段: {field}"

        # 验证name格式
        name = agent_config.get("name", "")
        if '/' in name or '\\' in name or '.' in name:
            return False, f"Agent名称不能包含特殊字符 (/, \\, .): {name}"

        # 验证max_actions范围
        max_actions = agent_config.get("max_actions", 50)
        if not isinstance(max_actions, int) or max_actions < 1 or max_actions > 200:
            return False, f"max_actions必须在1-200范围内: {max_actions}"

        # 验证tags数量
        tags = agent_config.get("tags", [])
        if not isinstance(tags, list):
            return False, "tags必须是列表"
        if len(tags) > 20:
            return False, f"标签数量不能超过20个: {len(tags)}"

        return True, ""
