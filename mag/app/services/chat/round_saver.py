"""轮次保存器 - 负责将对话轮次保存到MongoDB"""
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class RoundSaver:
    """轮次保存器 - 处理对话轮次的数据库保存"""

    def __init__(self, mongodb_client):
        """初始化轮次保存器

        Args:
            mongodb_client: MongoDB服务实例
        """
        self.mongodb_client = mongodb_client

    async def save_complete_round(self,
                                 conversation_id: str,
                                 round_messages: List[Dict[str, Any]],
                                 token_usage: Dict[str, int],
                                 user_id: str,
                                 model_name: str,
                                 tools_schema: Optional[List[Dict[str, Any]]] = None):
        """保存完整轮次到数据库

        Args:
            conversation_id: 对话ID
            round_messages: 本轮所有消息
            token_usage: token使用统计
            user_id: 用户ID
            model_name: 模型名称
            tools_schema: 工具schema列表（可选）
        """
        try:
            # 获取轮次编号
            round_number = await self._get_next_round_number(conversation_id)

            # 保存轮次消息到数据库
            await self.mongodb_client.add_round_to_conversation(
                conversation_id, round_number, round_messages, tools_schema, model_name
            )

            # 更新对话总token统计
            await self.mongodb_client.update_conversation_token_usage(
                conversation_id=conversation_id,
                prompt_tokens=token_usage["prompt_tokens"],
                completion_tokens=token_usage["completion_tokens"]
            )

            logger.info(f"轮次 {round_number} 保存成功，token使用量: {token_usage}")

            # 如果是第一轮，生成标题和标签
            if round_number == 1:
                await self._generate_title_and_tags(
                    conversation_id, round_messages, model_name, user_id
                )

        except Exception as e:
            logger.error(f"保存轮次时出错: {str(e)}")

    async def _get_next_round_number(self, conversation_id: str) -> int:
        """获取下一个轮次编号"""
        conversation_data = await self.mongodb_client.get_conversation_with_messages(conversation_id)
        if not conversation_data or not conversation_data.get("rounds"):
            return 1
        return len(conversation_data["rounds"]) + 1

    async def _generate_title_and_tags(self,
                                      conversation_id: str,
                                      messages: List[Dict[str, Any]],
                                      model_name: str,
                                      user_id: str = "default_user"):
        """生成对话标题和标签

        Args:
            conversation_id: 对话ID
            messages: 消息列表
            model_name: 模型名称
            user_id: 用户ID
        """
        try:
            # 获取模型配置
            from app.services.model_service import model_service
            model_config = await model_service.get_model(model_name, user_id=user_id)

            if not model_config:
                logger.warning(f"找不到模型配置: {model_name}，跳过标题生成")
                return

            # 调用统一的标题和标签生成方法
            await self.mongodb_client.conversation_repository.generate_conversation_title_and_tags(
                conversation_id=conversation_id,
                messages=messages,
                model_config=model_config,
                user_id=user_id
            )
        except Exception as e:
            logger.error(f"生成标题和标签时出错: {str(e)}")
