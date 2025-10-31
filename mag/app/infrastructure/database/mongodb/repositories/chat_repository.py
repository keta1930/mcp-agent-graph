import logging
from typing import Dict, List, Any, Optional, Callable
from bson import ObjectId

logger = logging.getLogger(__name__)


class ChatRepository:
    """聊天消息管理器 - 负责chat_messages集合的CRUD操作"""

    def __init__(self, db, chat_messages_collection):
        """初始化聊天消息管理器"""
        self.db = db
        self.chat_messages_collection = chat_messages_collection

    async def create_chat_messages_document(self, conversation_id: str) -> bool:
        """创建新的聊天消息文档"""
        try:
            messages_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "rounds": []
            }
            await self.chat_messages_collection.insert_one(messages_doc)
            logger.info(f"创建聊天消息文档成功: {conversation_id}")
            return True
        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"聊天消息文档已存在: {conversation_id}")
                return True
            logger.error(f"创建聊天消息文档失败: {str(e)}")
            return False

    async def get_chat_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取聊天的完整消息历史"""
        try:
            messages_doc = await self.chat_messages_collection.find_one({"conversation_id": conversation_id})
            if messages_doc:
                return self._convert_objectid_to_str(messages_doc)
            return None
        except Exception as e:
            logger.error(f"获取聊天消息失败: {str(e)}")
            return None

    async def add_round_to_chat(self, conversation_id: str, round_number: int,
                                messages: List[Dict[str, Any]],
                                tools_schema: Optional[List[Dict[str, Any]]] = None,
                                model: Optional[str] = None) -> bool:
        """向聊天添加新的轮次"""
        try:
            # 确保消息文档存在
            await self.create_chat_messages_document(conversation_id)

            # 添加轮次到消息集合
            round_data = {
                "round": round_number,
                "messages": messages
            }

            # 保存本轮使用的完整工具列表（tools_schema）
            if tools_schema is not None:
                round_data["tools"] = tools_schema

            # 保存使用的模型
            if model is not None:
                round_data["model"] = model

            result = await self.chat_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$push": {"rounds": round_data}}
            )

            if result.modified_count > 0 or result.matched_count > 0:
                logger.info(f"向聊天 {conversation_id} 添加轮次 {round_number} 成功")
                return True
            else:
                logger.error(f"向聊天 {conversation_id} 添加轮次失败")
                return False

        except Exception as e:
            logger.error(f"添加聊天轮次失败: {str(e)}")
            return False

    async def get_chat_round_count(self, conversation_id: str) -> int:
        """获取聊天的轮次数量"""
        try:
            messages_doc = await self.chat_messages_collection.find_one(
                {"conversation_id": conversation_id},
                {"rounds": 1}
            )
            if messages_doc and "rounds" in messages_doc:
                return len(messages_doc["rounds"])
            return 0
        except Exception as e:
            logger.error(f"获取聊天轮次数量失败: {str(e)}")
            return 0

    async def get_chat_first_round_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """获取聊天的第一轮消息（用于生成标题和标签）"""
        try:
            messages_doc = await self.chat_messages_collection.find_one(
                {"conversation_id": conversation_id},
                {"rounds": {"$slice": 1}}  # 只获取第一个round
            )

            if messages_doc and messages_doc.get("rounds"):
                first_round = messages_doc["rounds"][0]
                return first_round.get("messages", [])

            return []
        except Exception as e:
            logger.error(f"获取聊天第一轮消息失败: {str(e)}")
            return []

    async def compact_chat_messages(self,
                                    conversation_id: str,
                                    compact_type: str = "brutal",
                                    compact_threshold: int = 2000,
                                    summarize_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """压缩聊天消息内容"""
        try:
            # 获取消息数据
            messages_doc = await self.get_chat_messages(conversation_id)
            if not messages_doc:
                return {"status": "error", "error": "聊天消息不存在"}

            rounds = messages_doc.get("rounds", [])
            if not rounds:
                return {"status": "error", "error": "聊天无内容可压缩"}

            # 计算原始统计
            original_stats = self._calculate_stats(rounds)

            # 执行压缩
            if compact_type == "brutal":
                compacted_rounds = self._brutal_compact(rounds)
                tool_contents_summarized = 0
            else:  # precise
                if not summarize_callback:
                    return {"status": "error", "error": "精确压缩需要提供总结回调函数"}
                compacted_rounds, tool_contents_summarized = await self._precise_compact(
                    rounds, compact_threshold, summarize_callback
                )

            # 更新数据库
            update_result = await self.chat_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"rounds": compacted_rounds}}
            )

            if update_result.modified_count == 0:
                return {"status": "error", "error": "更新聊天消息失败"}

            # 计算压缩后统计
            compacted_stats = self._calculate_stats(compacted_rounds)

            # 计算压缩比例
            compression_ratio = (
                1 - (compacted_stats["total_messages"] / original_stats["total_messages"])
                if original_stats["total_messages"] > 0 else 0
            )

            statistics = {
                "original_rounds": original_stats["total_rounds"],
                "original_messages": original_stats["total_messages"],
                "compacted_rounds": compacted_stats["total_rounds"],
                "compacted_messages": compacted_stats["total_messages"],
                "compression_ratio": round(compression_ratio, 3),
                "tool_contents_summarized": tool_contents_summarized
            }

            logger.info(f"聊天 {conversation_id} 压缩成功，类型: {compact_type}, 压缩比: {compression_ratio:.1%}")

            return {
                "status": "success",
                "message": f"聊天压缩成功，压缩比: {compression_ratio:.1%}",
                "statistics": statistics
            }

        except Exception as e:
            logger.error(f"压缩聊天消息失败: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _brutal_compact(self, rounds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """暴力压缩：每轮只保留system + user + 最后一个assistant消息"""
        compacted_rounds = []

        for round_data in rounds:
            messages = round_data.get("messages", [])
            if not messages:
                continue

            # 查找并保留消息
            system_message = None
            user_message = None
            last_assistant_message = None

            for message in messages:
                role = message.get("role")
                if role == "system" and not system_message:
                    system_message = message
                elif role == "user" and not user_message:
                    user_message = message
                elif role == "assistant":
                    last_assistant_message = message  # 保留最后一个assistant消息

            # 构建压缩后的消息列表
            compacted_messages = []
            if system_message:
                compacted_messages.append(system_message)
            if user_message:
                compacted_messages.append(user_message)
            if last_assistant_message:
                compacted_messages.append(last_assistant_message)

            if compacted_messages:
                compacted_rounds.append({
                    "round": round_data["round"],
                    "messages": compacted_messages
                })

        return compacted_rounds

    async def _precise_compact(self,
                               rounds: List[Dict[str, Any]],
                               threshold: int,
                               summarize_callback: Callable) -> tuple:
        """精确压缩：对超过阈值的tool消息内容进行总结"""
        compacted_rounds = []
        tool_contents_summarized = 0

        for round_data in rounds:
            messages = round_data.get("messages", [])
            if not messages:
                continue

            compacted_messages = []

            for message in messages:
                if message.get("role") == "tool":
                    content = message.get("content", "")

                    # 检查是否需要压缩
                    if len(content) >= threshold:
                        try:
                            # 调用总结回调函数
                            summary_result = await summarize_callback(content)
                            if summary_result.get("status") == "success":
                                # 使用总结内容替换原内容
                                compacted_message = message.copy()
                                compacted_message["content"] = f"[已总结] {summary_result.get('content', '')}"
                                compacted_messages.append(compacted_message)
                                tool_contents_summarized += 1
                            else:
                                # 总结失败，截断内容
                                compacted_message = message.copy()
                                compacted_message["content"] = f"[总结失败，已截断] {content[:200]}..."
                                compacted_messages.append(compacted_message)
                        except Exception as e:
                            logger.warning(f"总结工具内容失败: {str(e)}")
                            # 总结失败，截断内容
                            compacted_message = message.copy()
                            compacted_message["content"] = f"[总结失败，已截断] {content[:200]}..."
                            compacted_messages.append(compacted_message)
                    else:
                        # 内容长度未超过阈值，保持原样
                        compacted_messages.append(message)
                else:
                    # 非tool消息，保持原样
                    compacted_messages.append(message)

            if compacted_messages:
                compacted_rounds.append({
                    "round": round_data["round"],
                    "messages": compacted_messages
                })

        return compacted_rounds, tool_contents_summarized

    def _calculate_stats(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算消息统计信息"""
        total_rounds = len(rounds)
        total_messages = 0

        for round_data in rounds:
            messages = round_data.get("messages", [])
            total_messages += len(messages)

        return {
            "total_rounds": total_rounds,
            "total_messages": total_messages
        }

    async def delete_chat_messages(self, conversation_id: str) -> bool:
        """删除聊天消息"""
        try:
            result = await self.chat_messages_collection.delete_one({"conversation_id": conversation_id})
            if result.deleted_count > 0:
                logger.info(f"聊天消息 {conversation_id} 已删除")
                return True
            else:
                logger.warning(f"聊天消息 {conversation_id} 不存在")
                return False
        except Exception as e:
            logger.error(f"删除聊天消息失败: {str(e)}")
            return False

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc