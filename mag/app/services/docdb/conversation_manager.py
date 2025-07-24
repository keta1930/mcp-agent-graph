import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class ConversationManager:
    """对话管理器 - 负责conversations集合的通用操作（所有类型对话的基础信息）"""

    def __init__(self, db, conversations_collection):
        """
        初始化对话管理器

        Args:
            db: MongoDB数据库实例
            conversations_collection: 对话集合
        """
        self.db = db
        self.conversations_collection = conversations_collection

    async def create_conversation(self, conversation_id: str, conversation_type: str = "chat",
                                  user_id: str = "default_user", title: str = "",
                                  tags: List[str] = None) -> bool:
        """
        创建新对话（统一入口，支持所有类型）

        Args:
            conversation_id: 对话ID
            conversation_type: 对话类型 ("chat" | "agent")
            user_id: 用户ID
            title: 对话标题
            tags: 对话标签
        """
        try:
            now = datetime.utcnow()
            conversation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "type": conversation_type,  # 新增：对话类型
                "title": title,
                "created_at": now,
                "updated_at": now,
                "round_count": 0,
                "total_token_usage": {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                },
                "status": "active",
                "tags": tags or []
            }

            await self.conversations_collection.insert_one(conversation_doc)
            logger.info(f"创建对话成功: {conversation_id}, 类型: {conversation_type}")
            return True

        except Exception as e:
            logger.error(f"创建对话失败: {str(e)}")
            if "duplicate key" in str(e).lower():
                logger.warning(f"对话已存在: {conversation_id}")
                return False
            return False

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        try:
            conversation = await self.conversations_collection.find_one({"_id": conversation_id})
            if conversation:
                return self._convert_objectid_to_str(conversation)
            return None
        except Exception as e:
            logger.error(f"获取对话失败: {str(e)}")
            return None

    async def ensure_conversation_exists(self, conversation_id: str, conversation_type: str = "chat",
                                         user_id: str = "default_user") -> bool:
        """
        确保对话存在，不存在则创建

        Args:
            conversation_id: 对话ID
            conversation_type: 对话类型
            user_id: 用户ID

        Returns:
            bool: 操作是否成功（包括对话已存在的情况）
        """
        try:
            # 检查对话是否已存在
            conversation = await self.get_conversation(conversation_id)
            if conversation:
                logger.debug(f"对话已存在: {conversation_id}")
                return True

            # 对话不存在，创建新对话
            success = await self.create_conversation(
                conversation_id=conversation_id,
                conversation_type=conversation_type,
                user_id=user_id,
                title="新对话" if conversation_type == "chat" else "AI生成对话",
                tags=[]
            )

            if success:
                logger.info(f"自动创建对话成功: {conversation_id}, 类型: {conversation_type}")
            else:
                logger.error(f"自动创建对话失败: {conversation_id}")

            return success

        except Exception as e:
            logger.error(f"确保对话存在时出错: {str(e)}")
            return False

    async def update_conversation_round_count(self, conversation_id: str, increment: int = 1) -> bool:
        """更新对话轮次计数"""
        try:
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$set": {"updated_at": datetime.utcnow()},
                    "$inc": {"round_count": increment}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新对话轮次计数失败: {str(e)}")
            return False

    async def generate_conversation_title_and_tags(self,
                                                   conversation_id: str,
                                                   messages: List[Dict[str, Any]],
                                                   model_config: Dict[str, Any]) -> bool:
        """
        统一的对话标题和标签生成方法（母方法）

        Args:
            conversation_id: 对话ID
            messages: 第一轮的消息列表
            model_config: 模型配置

        Returns:
            bool: 生成是否成功
        """
        try:
            user_message = ""
            assistant_content = ""

            for msg in messages:
                if msg.get("role") == "user" and not user_message:
                    user_message = msg.get("content", "")
                elif msg.get("role") == "assistant" and not assistant_content:
                    assistant_content = msg.get("content", "")
                    if user_message and assistant_content:
                        break

            if not user_message or not assistant_content:
                return False

            # 检测消息语言
            from app.utils.text_tool import detect_language
            combined_text = user_message + " " + assistant_content
            language = detect_language(combined_text)

            # 获取对应语言的标题生成提示词
            from app.services.chat.prompts import get_title_prompt
            title_prompt_template = get_title_prompt(language)

            # 构建标题生成提示词，限制消息长度避免token过多
            title_prompt = title_prompt_template.format(
                user_message=user_message,
                assistant_message=assistant_content
            )

            # 调用模型生成标题和标签
            from app.services.model_service import model_service
            result = await model_service.call_model(
                model_name=model_config["name"],
                messages=[{"role": "user", "content": title_prompt}]
            )

            title = "新对话"
            tags = []

            if result.get("status") == "success":
                response_content = result.get("content", "")

                from app.utils.text_parser import parse_title_and_tags_response
                parsed_result = parse_title_and_tags_response(response_content)

                if parsed_result.get("success"):
                    title = parsed_result.get("title", "").strip()
                    parsed_tags = parsed_result.get("tags", [])
                    if parsed_tags:
                        tags = []
                        for tag in parsed_tags:
                            cleaned_tag = tag.strip()
                            tags.append(cleaned_tag)

                else:
                    logger.warning(f"解析标题和标签失败: {parsed_result.get('error', '未知错误')}")
                    if response_content:
                        fallback_title = response_content.strip()[:10]
                        if fallback_title:
                            title = fallback_title

            await self.update_conversation_title_and_tags(
                conversation_id=conversation_id,
                title=title,
                tags=tags
            )

            logger.info(f"生成对话标题和标签成功: 标题='{title}', 标签={tags}")
            return True

        except Exception as e:
            logger.error(f"生成标题和标签时出错: {str(e)}")
            return False

    async def update_conversation_title_and_tags(self, conversation_id: str,
                                                 title: str = None, tags: List[str] = None) -> bool:
        """更新对话标题和标签（首次生成时调用）"""
        try:
            update_data = {"updated_at": datetime.utcnow()}
            if title:
                update_data["title"] = title
            if tags is not None:
                update_data["tags"] = tags

            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {"$set": update_data}
            )

            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新对话标题和标签失败: {str(e)}")
            return False

    async def update_conversation_title(self, conversation_id: str, title: str, user_id: str = "default_user") -> bool:
        """更新对话标题（用户主动修改）"""
        try:
            # 验证对话是否存在且属于该用户
            conversation = await self.conversations_collection.find_one({
                "_id": conversation_id,
                "user_id": user_id,
                "status": "active"
            })

            if not conversation:
                logger.warning(f"对话不存在或不属于用户 {user_id}: {conversation_id}")
                return False

            # 更新标题和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "title": title,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的标题为: {title}")
                return True
            else:
                logger.warning(f"更新对话标题失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话标题失败: {str(e)}")
            return False

    async def update_conversation_tags(self, conversation_id: str, tags: List[str],
                                       user_id: str = "default_user") -> bool:
        """更新对话标签（用户主动修改）"""
        try:
            # 验证对话是否存在且属于该用户
            conversation = await self.conversations_collection.find_one({
                "_id": conversation_id,
                "user_id": user_id,
                "status": "active"
            })

            if not conversation:
                logger.warning(f"对话不存在或不属于用户 {user_id}: {conversation_id}")
                return False

            # 更新标签和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "tags": tags,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的标签为: {tags}")
                return True
            else:
                logger.warning(f"更新对话标签失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话标签失败: {str(e)}")
            return False

    async def update_conversation_token_usage(self, conversation_id: str,
                                              prompt_tokens: int, completion_tokens: int) -> bool:
        """更新对话的token使用量"""
        try:
            total_tokens = prompt_tokens + completion_tokens
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$inc": {
                        "total_token_usage.total_tokens": total_tokens,
                        "total_token_usage.prompt_tokens": prompt_tokens,
                        "total_token_usage.completion_tokens": completion_tokens
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新token使用量失败: {str(e)}")
            return False

    async def list_conversations(self, user_id: str = "default_user", conversation_type: str = None,
                                 limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """
        获取用户的对话列表

        Args:
            user_id: 用户ID
            conversation_type: 对话类型过滤 ("chat" | "agent" | None表示所有)
            limit: 限制数量
            skip: 跳过数量
        """
        try:
            # 构建查询条件
            query = {"user_id": user_id, "status": "active"}
            if conversation_type:
                query["type"] = conversation_type

            cursor = self.conversations_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)

            conversations = []
            async for conversation in cursor:
                conversations.append(self._convert_objectid_to_str(conversation))

            return conversations
        except Exception as e:
            logger.error(f"获取对话列表失败: {str(e)}")
            return []

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话（软删除，标记为deleted状态）"""
        try:
            # 软删除对话
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
            )

            if result.modified_count > 0:
                logger.info(f"对话 {conversation_id} 已标记为删除")
                return True
            else:
                logger.warning(f"对话 {conversation_id} 不存在或已删除")
                return False

        except Exception as e:
            logger.error(f"删除对话失败: {str(e)}")
            return False

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话"""
        try:
            result = await self.conversations_collection.delete_one({"_id": conversation_id})

            if result.deleted_count > 0:
                logger.info(f"对话 {conversation_id} 已永久删除")
                return True
            else:
                logger.warning(f"对话 {conversation_id} 不存在")
                return False

        except Exception as e:
            logger.error(f"永久删除对话失败: {str(e)}")
            return False

    async def get_conversation_stats(self, user_id: str = "default_user", conversation_type: str = None) -> Dict[
        str, Any]:
        """
        获取用户的对话统计信息

        Args:
            user_id: 用户ID
            conversation_type: 对话类型过滤
        """
        try:
            # 构建基础查询条件
            base_query = {"user_id": user_id, "status": "active"}

            # 总对话数
            total_query = base_query.copy()
            if conversation_type:
                total_query["type"] = conversation_type
            total_conversations = await self.conversations_collection.count_documents(total_query)

            # 今天的对话数
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_query = total_query.copy()
            today_query["created_at"] = {"$gte": today_start}
            today_conversations = await self.conversations_collection.count_documents(today_query)

            # 总token使用量
            pipeline = [
                {"$match": total_query},
                {"$group": {
                    "_id": None,
                    "total_tokens": {"$sum": "$total_token_usage.total_tokens"},
                    "total_rounds": {"$sum": "$round_count"}
                }}
            ]

            agg_result = await self.conversations_collection.aggregate(pipeline).to_list(1)
            total_tokens = agg_result[0]["total_tokens"] if agg_result else 0
            total_rounds = agg_result[0]["total_rounds"] if agg_result else 0

            stats = {
                "total_conversations": total_conversations,
                "today_conversations": today_conversations,
                "total_tokens": total_tokens,
                "total_rounds": total_rounds
            }

            # 如果是按类型过滤，添加类型信息
            if conversation_type:
                stats["conversation_type"] = conversation_type

            return stats
        except Exception as e:
            logger.error(f"获取统计信息失败: {str(e)}")
            return {
                "total_conversations": 0,
                "today_conversations": 0,
                "total_tokens": 0,
                "total_rounds": 0
            }

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc