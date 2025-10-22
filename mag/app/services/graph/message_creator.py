"""消息创建类 - 处理图执行中的消息创建逻辑"""
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class MessageCreator:
    """消息创建类 - 负责创建和记录图执行过程中的消息"""

    def __init__(self, conversation_manager):
        """初始化消息创建器
        
        Args:
            conversation_manager: 会话管理器实例
        """
        self.conversation_manager = conversation_manager

    async def create_agent_messages(self, node: Dict[str, Any]) -> List[Dict[str, str]]:
        """创建Agent的消息列表
        
        根据节点配置和全局输出历史，渲染并创建消息列表。
        
        Args:
            node: 节点配置，需包含 _conversation_id 字段
            
        Returns:
            消息列表，包含 system 和 user 消息
        """
        messages = []
        
        # 获取会话ID和会话数据
        conversation_id = node.get("_conversation_id", "")
        conversation = None
        if conversation_id:
            conversation = await self.conversation_manager.get_conversation(conversation_id)

        # 导入模板处理器
        from app.utils.output_tools import GraphPromptTemplate
        template_processor = GraphPromptTemplate()

        # 获取全局输出历史
        global_outputs = {}
        if conversation:
            global_outputs = conversation.get("global_outputs", {})

        # 处理 system prompt
        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            system_prompt = template_processor.render_template(system_prompt, global_outputs)
            messages.append({"role": "system", "content": system_prompt})

        # 处理 user prompt
        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            user_prompt = template_processor.render_template(user_prompt, global_outputs)
            messages.append({"role": "user", "content": user_prompt})

        return messages

    async def record_user_input(self, conversation_id: str, input_text: str):
        """记录用户输入为round格式
        
        将用户输入作为 start 节点保存到会话中，并更新到数据库。
        
        Args:
            conversation_id: 会话ID
            input_text: 用户输入文本
        """
        conversation = await self.conversation_manager.get_conversation(conversation_id)
        
        # 更新轮次计数
        conversation["_current_round"] += 1
        current_round = conversation["_current_round"]
        
        # 保存输入文本
        conversation["input"] = input_text

        # 创建 start round
        start_round = {
            "round": current_round,
            "node_name": "start",
            "level": 0,
            "messages": [
                {
                    "role": "user",
                    "content": input_text
                }
            ]
        }
        conversation["rounds"].append(start_round)

        # 保存到数据库
        from app.services.mongodb_service import mongodb_service
        await mongodb_service.add_round_to_graph_run(
            conversation_id=conversation_id,
            round_data=start_round,
            tools_schema=[]
        )
        await mongodb_service.update_graph_run_global_outputs(conversation_id, "start", input_text)

        # 更新全局输出
        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}
        if "start" not in conversation["global_outputs"]:
            conversation["global_outputs"]["start"] = []

        conversation["global_outputs"]["start"].append(input_text)