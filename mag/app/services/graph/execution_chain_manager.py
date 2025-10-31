"""执行链管理类 - 处理图执行链的生成和更新"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ExecutionChainManager:
    """执行链管理类 - 负责维护和更新图的执行链"""

    @staticmethod
    async def update_execution_chain(conversation: Dict[str, Any]):
        """更新execution_chain - 按level合并相邻节点
        
        根据会话中的rounds数据，按层级分组生成执行链。
        同一层级的节点会被合并到同一个列表中。
        
        Args:
            conversation: 会话数据，需包含 rounds 和 conversation_id
        """
        rounds = conversation.get("rounds", [])
        
        if not rounds:
            conversation["execution_chain"] = []
            return

        execution_chain = []
        current_level_group = []
        current_level = None

        # 遍历所有rounds，按level分组
        for round_data in rounds:
            node_name = round_data.get("node_name", "")
            level = round_data.get("level", 0)

            if current_level is None:
                # 第一个节点
                current_level = level
                current_level_group = [node_name]
            elif level == current_level:
                # 同一层级，添加到当前组（避免重复）
                if node_name not in current_level_group:
                    current_level_group.append(node_name)
            else:
                # 新的层级，保存当前组并开始新组
                if current_level_group:
                    execution_chain.append(current_level_group)
                current_level = level
                current_level_group = [node_name]

        # 添加最后一组
        if current_level_group:
            execution_chain.append(current_level_group)

        # 更新到conversation
        conversation["execution_chain"] = execution_chain

        # 同步到数据库
        from app.infrastructure.database.mongodb import mongodb_client
        await mongodb_client.update_graph_run_execution_chain(
            conversation["conversation_id"], 
            execution_chain
        )