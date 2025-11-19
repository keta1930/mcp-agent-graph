"""
Handoffs 工具执行器

处理 Graph 节点转移工具（transfer_to_*）
"""
import logging
from typing import Dict, Any
from app.services.tool_execution.base_executor import BaseToolExecutor

logger = logging.getLogger(__name__)


class HandoffsToolExecutor(BaseToolExecutor):
    """Handoffs 工具执行器
    
    专门处理 Graph 中的节点转移工具
    """

    def can_handle(self, tool_name: str) -> bool:
        """判断是否为 Handoffs 工具
        
        Args:
            tool_name: 工具名称
            
        Returns:
            True 如果是 transfer_to_ 开头的工具
        """
        return tool_name.startswith("transfer_to_")

    async def execute(self, tool_name: str, arguments: Dict[str, Any], 
                     tool_call_id: str, **context) -> Dict[str, Any]:
        """执行 Handoffs 工具调用
        
        Args:
            tool_name: 工具名称（格式：transfer_to_<node_name>）
            arguments: 工具参数（通常为空）
            tool_call_id: 工具调用ID
            **context: 上下文参数（未使用）
            
        Returns:
            包含节点选择信息的结果
        """
        try:
            # 提取目标节点名称
            selected_node = tool_name[len("transfer_to_"):]
            logger.info(f"执行 handoffs 工具: {tool_name} -> {selected_node}")
            
            return {
                "tool_call_id": tool_call_id,
                "content": f"已选择节点: {selected_node}",
                "_handoffs_selected": selected_node
            }
        except Exception as e:
            logger.error(f"Handoffs 工具执行失败: {str(e)}")
            return self._format_error(tool_call_id, f"Handoffs 工具执行失败：{str(e)}")
