import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class MCPManager:
    """MCP生成管理器 - 负责AI MCP工具生成对话的数据管理"""

    def __init__(self, db, mcp_generations_collection):
        """
        初始化MCP生成管理器

        Args:
            db: MongoDB数据库实例
            mcp_generations_collection: MCP生成集合
        """
        self.db = db
        self.mcp_generations_collection = mcp_generations_collection

    async def create_mcp_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的MCP生成对话"""
        try:
            now = datetime.utcnow()
            generation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now,
                "total_token_usage": {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                },
                "messages": [],
                "parsed_results": {
                    "analysis": None,
                    "todo": None,
                    "folder_name": None,
                    "script_files": {},  # {"文件名.py": "文件内容"}
                    "dependencies": None,
                    "readme": None
                }
            }

            await self.mcp_generations_collection.insert_one(generation_doc)
            logger.info(f"创建MCP生成对话成功: {conversation_id}")
            return True

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"MCP生成对话已存在: {conversation_id}")
                return False
            logger.error(f"创建MCP生成对话失败: {str(e)}")
            return False

    async def get_mcp_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取MCP生成对话"""
        try:
            conversation = await self.mcp_generations_collection.find_one({"_id": conversation_id})
            if conversation:
                return self._convert_objectid_to_str(conversation)
            return None
        except Exception as e:
            logger.error(f"获取MCP生成对话失败: {str(e)}")
            return None

    async def add_message_to_mcp_generation(self, conversation_id: str,
                                            message: Dict[str, Any]) -> bool:
        """向MCP生成对话添加消息"""
        try:
            result = await self.mcp_generations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$push": {"messages": message},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"向MCP生成对话 {conversation_id} 添加消息成功")
                return True
            else:
                logger.error(f"向MCP生成对话 {conversation_id} 添加消息失败")
                return False

        except Exception as e:
            logger.error(f"添加MCP生成对话消息失败: {str(e)}")
            return False

    async def update_mcp_generation_parsed_results(self, conversation_id: str,
                                                   parsed_results: Dict[str, Any]) -> bool:
        """更新MCP生成对话的解析结果 - 支持脚本文件的增删改"""
        try:
            update_operations = []

            # 处理简单替换字段（新增folder_name）
            simple_fields = ["analysis", "todo", "folder_name", "dependencies", "readme"]
            set_updates = {"updated_at": datetime.utcnow()}

            for field in simple_fields:
                if field in parsed_results and parsed_results[field] is not None:
                    set_updates[f"parsed_results.{field}"] = parsed_results[field]

            # 处理脚本文件增删改逻辑
            if "script_files" in parsed_results and parsed_results["script_files"]:
                # 获取当前对话数据
                conversation_data = await self.mcp_generations_collection.find_one({"_id": conversation_id})
                if conversation_data:
                    current_script_files = conversation_data.get("parsed_results", {}).get("script_files", {})

                    # 合并新的脚本文件（新文件会替换同名文件）
                    updated_script_files = current_script_files.copy()
                    updated_script_files.update(parsed_results["script_files"])

                    set_updates["parsed_results.script_files"] = updated_script_files

            # 处理脚本文件删除逻辑
            if "delete_script_files" in parsed_results and parsed_results["delete_script_files"]:
                conversation_data = await self.mcp_generations_collection.find_one({"_id": conversation_id})
                if conversation_data:
                    current_script_files = conversation_data.get("parsed_results", {}).get("script_files", {})
                    updated_script_files = current_script_files.copy()

                    for file_name in parsed_results["delete_script_files"]:
                        if file_name in updated_script_files:
                            del updated_script_files[file_name]
                            logger.info(f"删除脚本文件: {file_name}")

                    set_updates["parsed_results.script_files"] = updated_script_files

            # 执行更新操作
            if set_updates:
                result = await self.mcp_generations_collection.update_one(
                    {"_id": conversation_id},
                    {"$set": set_updates}
                )
                return result.modified_count > 0

            return True

        except Exception as e:
            logger.error(f"更新MCP生成解析结果失败: {str(e)}")
            return False

    async def update_mcp_generation_token_usage(self, conversation_id: str,
                                                prompt_tokens: int, completion_tokens: int) -> bool:
        """更新MCP生成对话的token使用量"""
        try:
            total_tokens = prompt_tokens + completion_tokens
            result = await self.mcp_generations_collection.update_one(
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
            logger.error(f"更新MCP生成token使用量失败: {str(e)}")
            return False

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc