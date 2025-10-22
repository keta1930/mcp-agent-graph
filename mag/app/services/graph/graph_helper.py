"""图结构查询辅助类 - 提供图结构相关的查询功能"""
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class GraphHelper:
    """图结构查询辅助类 - 提供静态方法用于图结构查询"""

    @staticmethod
    def get_max_level(graph_config: Dict[str, Any]) -> int:
        """获取图中的最大层级
        
        Args:
            graph_config: 图配置字典
            
        Returns:
            最大层级数
        """
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)
        return max_level

    @staticmethod
    def get_nodes_at_level(graph_config: Dict[str, Any], level: int) -> List[Dict[str, Any]]:
        """获取指定层级的所有节点
        
        Args:
            graph_config: 图配置字典
            level: 目标层级
            
        Returns:
            该层级的所有节点列表
        """
        return [node for node in graph_config.get("nodes", []) 
                if node.get("level", 0) == level]

    @staticmethod
    def find_node_by_name(graph_config: Dict[str, Any], node_name: str) -> Optional[Dict[str, Any]]:
        """通过名称查找节点
        
        Args:
            graph_config: 图配置字典
            node_name: 节点名称
            
        Returns:
            找到的节点字典，未找到返回None
        """
        for node in graph_config.get("nodes", []):
            if node["name"] == node_name:
                return node
        return None