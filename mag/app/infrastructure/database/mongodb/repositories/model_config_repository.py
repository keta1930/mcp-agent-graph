"""
模型配置管理器 - MongoDB版本
负责模型配置的MongoDB存储、检索、更新和删除操作
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


class ModelConfigRepository:
    """模型配置管理器类 - MongoDB版本"""

    def __init__(self, db, collection):
        """
        初始化ModelConfigManager

        Args:
            db: MongoDB数据库实例
            collection: model_configs集合
        """
        self.db = db
        self.collection = collection

    async def create_model(self, user_id: str, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新的模型配置

        Args:
            user_id: 用户ID
            model_config: 模型配置数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            # 检查该用户是否已有同名模型
            existing = await self.collection.find_one({
                "user_id": user_id,
                "name": model_config["name"]
            })

            if existing:
                return {
                    "success": False,
                    "message": f"模型 '{model_config['name']}' 已存在"
                }

            # 创建文档
            document = {
                "user_id": user_id,
                "name": model_config["name"],
                "base_url": model_config["base_url"],
                "api_key": model_config["api_key"],
                "model": model_config.get("model", ""),
                # 提供商和模型类型（新增字段）
                "provider": model_config.get("provider", "openai"),
                "model_type": model_config.get("model_type", "llm"),
                # 可选参数
                "temperature": model_config.get("temperature"),
                "max_tokens": model_config.get("max_tokens"),
                "max_completion_tokens": model_config.get("max_completion_tokens"),
                "top_p": model_config.get("top_p"),
                "frequency_penalty": model_config.get("frequency_penalty"),
                "presence_penalty": model_config.get("presence_penalty"),
                "n": model_config.get("n"),
                "stop": model_config.get("stop"),
                "seed": model_config.get("seed"),
                "logprobs": model_config.get("logprobs"),
                "top_logprobs": model_config.get("top_logprobs"),
                "stream": model_config.get("stream", False),
                "extra_headers": model_config.get("extra_headers"),
                "timeout": model_config.get("timeout"),
                "extra_body": model_config.get("extra_body"),
                # 元数据
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }

            result = await self.collection.insert_one(document)

            if result.inserted_id:
                logger.info(f"模型配置创建成功: {model_config['name']} (user: {user_id})")
                return {
                    "success": True,
                    "message": f"模型 '{model_config['name']}' 创建成功",
                    "data": {
                        "name": model_config["name"],
                        "id": str(result.inserted_id)
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"模型 '{model_config['name']}' 创建失败"
                }

        except Exception as e:
            logger.error(f"创建模型配置失败: {e}")
            return {
                "success": False,
                "message": f"创建模型配置时发生错误: {str(e)}"
            }

    async def get_model(self, model_name: str, user_id: str, include_api_key: bool = True) -> Optional[Dict[str, Any]]:
        """
        获取指定模型的配置

        Args:
            model_name: 模型名称
            user_id: 用户ID
            include_api_key: 是否包含API密钥（用于编辑时不返回密钥）

        Returns:
            Optional[Dict[str, Any]]: 模型配置，不存在时返回 None
        """
        try:
            projection = None if include_api_key else {"api_key": 0}

            doc = await self.collection.find_one(
                {"name": model_name, "user_id": user_id},
                projection
            )

            if not doc:
                return None

            # 移除MongoDB的_id字段
            doc.pop("_id", None)

            return doc

        except Exception as e:
            logger.error(f"获取模型配置失败 {model_name} (user: {user_id}): {e}")
            return None

    async def update_model(self, model_name: str, user_id: str, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新指定模型配置

        Args:
            model_name: 原模型名称
            user_id: 用户ID
            model_config: 更新的配置数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            # 检查模型是否存在且属于该用户
            existing = await self.collection.find_one({"name": model_name, "user_id": user_id})

            if not existing:
                return {
                    "success": False,
                    "message": f"模型 '{model_name}' 不存在或无权限访问"
                }

            # 如果修改了名称，检查新名称是否已被该用户占用
            new_name = model_config.get("name", model_name)
            if new_name != model_name:
                name_exists = await self.collection.find_one({"name": new_name, "user_id": user_id})
                if name_exists:
                    return {
                        "success": False,
                        "message": f"模型名称 '{new_name}' 已被占用"
                    }

            # 如果新配置中没有API密钥，保持原有的API密钥
            if 'api_key' not in model_config or not model_config['api_key']:
                model_config['api_key'] = existing['api_key']

            # 构建更新字段
            update_fields = {
                "name": model_config.get("name", model_name),
                "base_url": model_config["base_url"],
                "api_key": model_config["api_key"],
                "model": model_config.get("model", ""),
                # 提供商和模型类型（新增字段）
                "provider": model_config.get("provider", "openai"),
                "model_type": model_config.get("model_type", "llm"),
                "temperature": model_config.get("temperature"),
                "max_tokens": model_config.get("max_tokens"),
                "max_completion_tokens": model_config.get("max_completion_tokens"),
                "top_p": model_config.get("top_p"),
                "frequency_penalty": model_config.get("frequency_penalty"),
                "presence_penalty": model_config.get("presence_penalty"),
                "n": model_config.get("n"),
                "stop": model_config.get("stop"),
                "seed": model_config.get("seed"),
                "logprobs": model_config.get("logprobs"),
                "top_logprobs": model_config.get("top_logprobs"),
                "stream": model_config.get("stream", False),
                "extra_headers": model_config.get("extra_headers"),
                "timeout": model_config.get("timeout"),
                "extra_body": model_config.get("extra_body"),
                "updated_at": datetime.now()
            }

            # 执行更新
            result = await self.collection.update_one(
                {"name": model_name, "user_id": user_id},
                {"$set": update_fields}
            )

            if result.modified_count > 0 or result.matched_count > 0:
                logger.info(f"模型配置更新成功: {model_name} -> {new_name} (user: {user_id})")
                return {
                    "success": True,
                    "message": f"模型 '{model_name}' 更新成功",
                    "data": {"new_name": new_name}
                }
            else:
                return {
                    "success": False,
                    "message": f"模型 '{model_name}' 更新失败"
                }

        except Exception as e:
            logger.error(f"更新模型配置失败 {model_name} (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"更新模型配置时发生错误: {str(e)}"
            }

    async def delete_model(self, model_name: str, user_id: str) -> Dict[str, Any]:
        """
        删除指定模型配置

        Args:
            model_name: 模型名称
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            result = await self.collection.delete_one({
                "name": model_name,
                "user_id": user_id
            })

            if result.deleted_count > 0:
                logger.info(f"模型配置删除成功: {model_name} (user: {user_id})")
                return {
                    "success": True,
                    "message": f"模型 '{model_name}' 删除成功"
                }
            else:
                return {
                    "success": False,
                    "message": f"模型 '{model_name}' 不存在或无权限访问"
                }

        except Exception as e:
            logger.error(f"删除模型配置失败 {model_name} (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"删除模型配置时发生错误: {str(e)}"
            }

    async def list_models(self, user_id: str, include_api_key: bool = False) -> List[Dict[str, Any]]:
        """
        列出用户的所有模型配置

        Args:
            user_id: 用户ID
            include_api_key: 是否包含API密钥

        Returns:
            List[Dict[str, Any]]: 模型配置列表
        """
        try:
            # 构建投影，排除不需要的字段
            projection = {"_id": 0}
            if not include_api_key:
                projection["api_key"] = 0

            cursor = self.collection.find({"user_id": user_id}, projection).sort("updated_at", -1)
            docs = await cursor.to_list(length=None)

            return docs

        except Exception as e:
            logger.error(f"列出模型配置失败 (user: {user_id}): {e}")
            return []

    async def model_exists(self, model_name: str, user_id: str) -> bool:
        """
        检查模型是否存在

        Args:
            model_name: 模型名称
            user_id: 用户ID

        Returns:
            bool: 是否存在
        """
        try:
            count = await self.collection.count_documents({"name": model_name, "user_id": user_id})
            return count > 0
        except Exception as e:
            logger.error(f"检查模型是否存在失败 {model_name} (user: {user_id}): {e}")
            return False
