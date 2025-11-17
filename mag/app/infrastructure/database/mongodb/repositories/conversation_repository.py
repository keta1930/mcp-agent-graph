import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class ConversationRepository:
    """对话管理器 - 负责conversations集合的通用操作（所有类型对话的基础信息）"""

    def __init__(self, db, conversations_collection):
        """初始化对话管理器"""
        self.db = db
        self.conversations_collection = conversations_collection

    async def create_conversation(self, conversation_id: str, conversation_type: str = "agent",
                                  user_id: str = "default_user", title: str = "",
                                  tags: List[str] = None) -> bool:
        """
        创建新对话（统一入口，支持 agent 和 graph 类型）

        注意：type 只支持 "agent" 和 "graph"，不再支持 "chat"
        """
        try:
            # 验证对话类型
            if conversation_type not in ["agent", "graph"]:
                logger.error(f"不支持的对话类型: {conversation_type}，仅支持 'agent' 或 'graph'")
                return False

            now = datetime.now()
            conversation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "type": conversation_type,
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
                "tags": tags or [],
                # 初始化 documents 字段
                "documents": {
                    "total_count": 0,
                    "files": []
                }
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

    async def ensure_conversation_exists(self, conversation_id: str, conversation_type: str = "agent",
                                         user_id: str = "default_user") -> bool:
        """
        确保对话存在，不存在则创建

        注意：默认类型改为 "agent"
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
                title="新对话" if conversation_type == "agent" else "graph",
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
                    "$set": {"updated_at": datetime.now()},
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
                                                   model_config: Dict[str, Any],
                                                   user_id: str = "default_user") -> bool:
        """统一的对话标题和标签生成方法"""
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
            from app.services.conversation.prompts import get_title_prompt
            title_prompt_template = get_title_prompt(language)

            # 构建标题生成提示词，限制消息长度避免token过多
            title_prompt = title_prompt_template.format(
                user_message=user_message,
                assistant_message=assistant_content
            )

            # 调用模型生成标题和标签
            from app.services.model.model_service import model_service
            result = await model_service.call_model(
                model_name=model_config["name"],
                messages=[{"role": "user", "content": title_prompt}],
                user_id=user_id
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
            update_data = {"updated_at": datetime.now()}
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
                        "updated_at": datetime.now()
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
                        "updated_at": datetime.now()
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

    async def update_input_config(self, conversation_id: str, input_config: Dict[str, Any],
                                  user_id: str = "default_user") -> bool:
        """更新对话的输入配置"""
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

            # 更新输入配置和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "input_config": input_config,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的输入配置")
                return True
            else:
                logger.warning(f"更新对话输入配置失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话输入配置失败: {str(e)}")
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
                    "$set": {"updated_at": datetime.now()}
                }
            )

            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新token使用量失败: {str(e)}")
            return False

    async def list_conversations(self, user_id: str = "default_user", conversation_type: str = None,
                                 limit: int = 200, skip: int = 0) -> List[Dict[str, Any]]:
        """
        获取用户的对话列表

        Args:
            user_id: 用户ID
            conversation_type: 对话类型过滤（"agent" 或 "graph"），None 表示所有类型
            limit: 返回数量限制
            skip: 跳过数量
        """
        try:
            # 构建查询条件
            query = {"user_id": user_id}
            if conversation_type:
                # 验证类型
                if conversation_type not in ["agent", "graph"]:
                    logger.warning(f"无效的对话类型过滤: {conversation_type}")
                    return []
                query["type"] = conversation_type

            cursor = self.conversations_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)

            conversations = []
            async for conversation in cursor:
                conversations.append(self._convert_objectid_to_str(conversation))

            return conversations
        except Exception as e:
            logger.error(f"获取对话列表失败: {str(e)}")
            return []

    async def update_conversation_status(self, conversation_id: str, status: str,
                                         user_id: str = "default_user") -> bool:
        """更新对话状态"""
        try:
            # 验证状态值
            valid_statuses = ["active", "deleted", "favorite"]
            if status not in valid_statuses:
                logger.error(f"无效的状态值: {status}")
                return False

            # 验证对话是否存在且属于该用户
            conversation = await self.conversations_collection.find_one({
                "_id": conversation_id,
                "user_id": user_id
            })

            if not conversation:
                logger.warning(f"对话不存在或不属于用户 {user_id}: {conversation_id}")
                return False

            # 更新状态和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的状态为: {status}")
                return True
            else:
                logger.warning(f"更新对话状态失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话状态失败: {str(e)}")
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
        """获取用户的对话统计信息"""
        try:
            # 构建基础查询条件
            base_query = {"user_id": user_id, "status": "active"}

            # 总对话数
            total_query = base_query.copy()
            if conversation_type:
                total_query["type"] = conversation_type
            total_conversations = await self.conversations_collection.count_documents(total_query)

            # 今天的对话数
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
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

    # ==================== 文档管理方法 ====================

    async def add_file_metadata(self, conversation_id: str, filename: str,
                               summary: str, size: int, version_id: str,
                               agent: str = "user", comment: str = "创建文件") -> bool:
        """
        添加文件元数据到MongoDB

        Args:
            conversation_id: 会话ID
            filename: 文件名（含路径）
            summary: 文件摘要
            size: 文件大小（字节）
            version_id: MinIO版本ID
            agent: 执行操作的agent名称
            comment: 操作日志说明（默认：创建文件）

        Returns:
            bool: 是否成功
        """
        try:
            now = datetime.now()
            log_id = f"log_{int(now.timestamp() * 1000)}"

            file_doc = {
                "filename": filename,
                "summary": summary,
                "size": size,
                "created_at": now,
                "updated_at": now,
                "current_version_id": version_id,
                "logs": [
                    {
                        "log_id": log_id,
                        "agent": agent,
                        "comment": comment,
                        "timestamp": now
                    }
                ]
            }

            # 先确保documents字段存在
            await self.conversations_collection.update_one(
                {
                    "_id": conversation_id,
                    "documents": {"$exists": False}
                },
                {
                    "$set": {
                        "documents": {
                            "total_count": 0,
                            "files": []
                        }
                    }
                }
            )

            # 添加文件元数据
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$push": {"documents.files": file_doc},
                    "$inc": {"documents.total_count": 1},
                    "$set": {"updated_at": now}
                }
            )

            if result.matched_count > 0:
                logger.info(f"✓ 添加文件元数据成功: {filename}")
                return True
            else:
                logger.warning(f"添加文件元数据失败: {filename}, 会话不存在: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"添加文件元数据失败: {str(e)}")
            return False

    async def update_file_metadata(self, conversation_id: str, filename: str,
                                   summary: Optional[str] = None,
                                   size: Optional[int] = None,
                                   version_id: Optional[str] = None,
                                   log_comment: Optional[str] = None,
                                   agent: str = "user") -> bool:
        """
        更新文件元数据

        Args:
            conversation_id: 会话ID
            filename: 文件名（含路径）
            summary: 新的摘要（可选）
            size: 新的文件大小（可选）
            version_id: 新的版本ID（可选）
            log_comment: 操作日志说明（可选）
            agent: 执行操作的agent名称

        Returns:
            bool: 是否成功
        """
        try:
            now = datetime.now()
            update_fields = {"documents.$.updated_at": now, "updated_at": now}

            if summary is not None:
                update_fields["documents.$.summary"] = summary
            if size is not None:
                update_fields["documents.$.size"] = size
            if version_id is not None:
                update_fields["documents.$.current_version_id"] = version_id

            update_operations = {"$set": update_fields}

            # 如果提供了日志说明，添加日志
            if log_comment:
                log_id = f"log_{int(now.timestamp() * 1000)}"
                log_entry = {
                    "log_id": log_id,
                    "agent": agent,
                    "comment": log_comment,
                    "timestamp": now
                }
                # 添加到数组开头（最新的在前）
                update_operations["$push"] = {
                    "documents.$.logs": {
                        "$each": [log_entry],
                        "$position": 0
                    }
                }

            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "documents.files.filename": filename},
                update_operations
            )

            if result.modified_count > 0:
                logger.info(f"更新文件元数据成功: {filename} (会话: {conversation_id})")
                return True
            else:
                logger.warning(f"更新文件元数据失败: {filename} (会话: {conversation_id})")
                return False

        except Exception as e:
            logger.error(f"更新文件元数据失败: {str(e)}")
            return False

    async def remove_file_metadata(self, conversation_id: str, filename: str) -> bool:
        """
        删除文件元数据

        Args:
            conversation_id: 会话ID
            filename: 文件名（含路径）

        Returns:
            bool: 是否成功
        """
        try:
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$pull": {"documents.files": {"filename": filename}},
                    "$inc": {"documents.total_count": -1},
                    "$set": {"updated_at": datetime.now()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"删除文件元数据成功: {filename} (会话: {conversation_id})")
                return True
            else:
                logger.warning(f"删除文件元数据失败: {filename} (会话: {conversation_id})")
                return False

        except Exception as e:
            logger.error(f"删除文件元数据失败: {str(e)}")
            return False

    async def get_file_metadata(self, conversation_id: str, filename: str) -> Optional[Dict[str, Any]]:
        """
        获取文件元数据

        Args:
            conversation_id: 会话ID
            filename: 文件名（含路径）

        Returns:
            Optional[Dict]: 文件元数据，不存在返回None
        """
        try:
            conversation = await self.conversations_collection.find_one(
                {"_id": conversation_id, "documents.files.filename": filename},
                {"documents.files.$": 1}
            )

            if conversation and "documents" in conversation and "files" in conversation["documents"]:
                files = conversation["documents"]["files"]
                if files:
                    return files[0]

            return None

        except Exception as e:
            logger.error(f"获取文件元数据失败: {str(e)}")
            return None

    async def get_all_files_metadata(self, conversation_id: str) -> Dict[str, Any]:
        """
        获取所有文件元数据

        Args:
            conversation_id: 会话ID

        Returns:
            Dict: {"total_count": 3, "files": [...]}
        """
        try:
            conversation = await self.conversations_collection.find_one(
                {"_id": conversation_id},
                {"documents": 1}
            )

            if conversation and "documents" in conversation:
                return conversation["documents"]
            else:
                return {"total_count": 0, "files": []}

        except Exception as e:
            logger.error(f"获取所有文件元数据失败: {str(e)}")
            return {"total_count": 0, "files": []}

    async def file_exists(self, conversation_id: str, filename: str) -> bool:
        """
        检查文件是否存在

        Args:
            conversation_id: 会话ID
            filename: 文件名（含路径）

        Returns:
            bool: 文件是否存在
        """
        try:
            count = await self.conversations_collection.count_documents({
                "_id": conversation_id,
                "documents.files.filename": filename
            })
            return count > 0

        except Exception as e:
            logger.error(f"检查文件是否存在失败: {str(e)}")
            return False

    async def compact_conversation(self,
                                   conversation_id: str,
                                   compact_type: str = "brutal",
                                   compact_threshold: int = 2000,
                                   summarize_callback: Optional[Callable] = None,
                                   user_id: str = "default_user") -> Dict[str, Any]:
        """
        压缩对话内容（支持 agent 对话）

        Args:
            conversation_id: 对话ID
            compact_type: 压缩类型（brutal/precise）
            compact_threshold: 压缩阈值
            summarize_callback: 总结回调函数（精确压缩时使用）
            user_id: 用户ID

        Returns:
            压缩结果字典
        """
        try:
            # 验证对话存在且属于用户
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                return {"status": "error", "error": "对话不存在"}

            if conversation.get("user_id") != user_id:
                return {"status": "error", "error": "无权限访问此对话"}

            conversation_type = conversation.get("type")
            if conversation_type != "agent":
                return {"status": "error", "error": "目前仅支持 Agent 对话的压缩"}

            # 获取 agent_run 数据
            from app.infrastructure.database.mongodb.repositories.agent_run_repository import AgentRunRepository
            agent_run_repo = AgentRunRepository(self.db, self.db.agent_run)

            agent_run_doc = await agent_run_repo.get_agent_run(conversation_id)
            if not agent_run_doc:
                return {"status": "error", "error": "对话消息不存在"}

            rounds = agent_run_doc.get("rounds", [])
            if not rounds:
                return {"status": "error", "error": "对话无内容可压缩"}

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
            update_result = await self.db.agent_run.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"rounds": compacted_rounds}}
            )

            if update_result.modified_count == 0:
                return {"status": "error", "error": "更新对话消息失败"}

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

            logger.info(f"对话 {conversation_id} 压缩成功，类型: {compact_type}, 压缩比: {compression_ratio:.1%}")

            return {
                "status": "success",
                "message": f"对话压缩成功，压缩比: {compression_ratio:.1%}",
                "statistics": statistics
            }

        except Exception as e:
            logger.error(f"压缩对话失败: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _brutal_compact(self, rounds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        暴力压缩：每轮只保留 system + user + 最后一个 assistant 消息
        """
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
                compacted_round = {
                    "round": round_data["round"],
                    "agent_name": round_data.get("agent_name", "manual"),
                    "messages": compacted_messages
                }

                # 保留其他字段
                if "tools" in round_data:
                    compacted_round["tools"] = round_data["tools"]
                if "model" in round_data:
                    compacted_round["model"] = round_data["model"]
                if "prompt_tokens" in round_data:
                    compacted_round["prompt_tokens"] = round_data["prompt_tokens"]
                if "completion_tokens" in round_data:
                    compacted_round["completion_tokens"] = round_data["completion_tokens"]

                compacted_rounds.append(compacted_round)

        return compacted_rounds

    async def _precise_compact(self,
                               rounds: List[Dict[str, Any]],
                               threshold: int,
                               summarize_callback: Callable) -> tuple:
        """
        精确压缩：对超过阈值的 tool 消息内容进行总结
        """
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
                compacted_round = {
                    "round": round_data["round"],
                    "agent_name": round_data.get("agent_name", "manual"),
                    "messages": compacted_messages
                }

                # 保留其他字段
                if "tools" in round_data:
                    compacted_round["tools"] = round_data["tools"]
                if "model" in round_data:
                    compacted_round["model"] = round_data["model"]
                if "prompt_tokens" in round_data:
                    compacted_round["prompt_tokens"] = round_data["prompt_tokens"]
                if "completion_tokens" in round_data:
                    compacted_round["completion_tokens"] = round_data["completion_tokens"]

                compacted_rounds.append(compacted_round)

        return compacted_rounds, tool_contents_summarized

    def _calculate_stats(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        计算消息统计信息
        """
        total_rounds = len(rounds)
        total_messages = 0

        for round_data in rounds:
            messages = round_data.get("messages", [])
            total_messages += len(messages)

        return {
            "total_rounds": total_rounds,
            "total_messages": total_messages
        }