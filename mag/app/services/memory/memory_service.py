"""
Memory 服务主文件
提供记忆管理的高级服务接口
"""
import logging
import json
import os
import yaml
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.infrastructure.database.mongodb import mongodb_client
from app.services.model.model_service import model_service

logger = logging.getLogger(__name__)


class MemoryService:
    """记忆服务类"""

    def __init__(self):
        self.mongodb_client = mongodb_client

    async def get_all_memories(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """
        获取用户的所有记忆元数据

        Args:
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 记忆元数据列表
        """
        try:
            # 查询所有记忆文档
            cursor = self.mongodb_client.memories_collection.find({"user_id": user_id})
            docs = await cursor.to_list(length=None)

            # 格式化返回元数据
            result = []
            for doc in docs:
                memories = doc.get("memories", {})

                # 计算统计信息
                categories_count = len(memories)
                total_items = sum(len(category_data.get("items", [])) for category_data in memories.values())

                metadata = {
                    "owner_type": doc.get("owner_type"),
                    "owner_id": doc.get("owner_id"),
                    "categories_count": categories_count,
                    "total_items": total_items,
                    "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
                    "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None
                }
                result.append(metadata)

            return {
                "success": True,
                "message": "获取记忆元数据成功",
                "data": result
            }

        except Exception as e:
            logger.error(f"记忆服务：获取记忆元数据失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"获取记忆元数据失败: {str(e)}"
            }

    async def get_owner_memories(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str
    ) -> Dict[str, Any]:
        """
        获取特定 owner 的完整记忆内容（用于编辑）

        Args:
            user_id: 用户ID
            owner_type: 所有者类型（user 或 agent）
            owner_id: 所有者ID

        Returns:
            Dict[str, Any]: 完整记忆数据
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            # 查询文档
            doc = await self.mongodb_client.memories_collection.find_one({
                "user_id": user_id,
                "owner_type": owner_type,
                "owner_id": owner_id
            })

            if not doc:
                return {
                    "success": False,
                    "message": f"未找到记忆文档 (owner_type: {owner_type}, owner_id: {owner_id})",
                    "error_code": "MEMORY_NOT_FOUND"
                }

            # 返回完整记忆数据
            result = {
                "owner_type": doc.get("owner_type"),
                "owner_id": doc.get("owner_id"),
                "memories": doc.get("memories", {}),
                "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
                "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None
            }

            return {
                "success": True,
                "message": "获取完整记忆成功",
                "data": result
            }

        except Exception as e:
            logger.error(f"记忆服务：获取完整记忆失败 (user: {user_id}, owner: {owner_type}/{owner_id}): {e}")
            return {
                "success": False,
                "message": f"获取完整记忆失败: {str(e)}"
            }

    async def add_memory_item(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        category: str,
        content: str
    ) -> Dict[str, Any]:
        """
        添加单条记忆条目

        Args:
            user_id: 用户ID
            owner_type: owner 类型（user 或 agent）
            owner_id: owner ID
            category: 分类名称
            content: 记忆内容

        Returns:
            Dict[str, Any]: 添加结果
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            # 验证分类名称格式
            if not re.match(r'^[a-zA-Z0-9_-]{2,50}$', category):
                return {
                    "success": False,
                    "message": "分类名称格式错误",
                    "error_code": "INVALID_CATEGORY"
                }

            # 转换为工具格式
            owner = "user" if owner_type == "user" else "self"
            additions = [{
                "owner": owner,
                "category": category,
                "items": [content]
            }]

            # 调用添加方法
            agent_id = owner_id if owner_type == "agent" else None
            result = await self.mongodb_client.add_memory(user_id, additions, agent_id)

            if result.get("success"):
                return {
                    "success": True,
                    "message": f"成功添加记忆到 '{category}'"
                }
            else:
                return {
                    "success": False,
                    "message": result.get("error", "添加记忆失败")
                }

        except Exception as e:
            logger.error(f"记忆服务：添加记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"添加记忆失败: {str(e)}"
            }

    async def update_memory_item(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        category: str,
        item_id: str,
        content: str
    ) -> Dict[str, Any]:
        """
        更新单条记忆条目

        Args:
            user_id: 用户ID
            owner_type: owner 类型
            owner_id: owner ID
            category: 分类名称
            item_id: 条目ID
            content: 新的记忆内容

        Returns:
            Dict[str, Any]: 更新结果
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            # 验证 item_id 格式
            if not re.match(r'^\d{8}_[a-z0-9]{4,}$', item_id):
                return {
                    "success": False,
                    "message": "item_id 格式错误",
                    "error_code": "INVALID_ITEM_ID"
                }

            # 转换为工具格式
            owner = "user" if owner_type == "user" else "self"
            updates = [{
                "owner": owner,
                "category": category,
                "item_id": item_id,
                "content": content
            }]

            # 调用更新方法（传递 agent_id，即 owner_id）
            agent_id = owner_id if owner_type == "agent" else None
            result = await self.mongodb_client.update_memory(user_id, updates, agent_id)

            if result.get("success"):
                return {
                    "success": True,
                    "message": "成功更新记忆条目"
                }
            else:
                if "not found" in result.get("error", "").lower():
                    return {
                        "success": False,
                        "message": "记忆条目不存在",
                        "error_code": "ITEM_NOT_FOUND"
                    }
                return {
                    "success": False,
                    "message": result.get("error", "更新记忆失败")
                }

        except Exception as e:
            logger.error(f"记忆服务：更新记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"更新记忆失败: {str(e)}"
            }

    async def batch_delete_items(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        category: str,
        item_ids: List[str]
    ) -> Dict[str, Any]:
        """
        批量删除记忆条目

        Args:
            user_id: 用户ID
            owner_type: owner 类型
            owner_id: owner ID
            category: 分类名称
            item_ids: 要删除的条目ID列表

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            if not item_ids:
                return {
                    "success": False,
                    "message": "缺少必要参数：item_ids",
                    "error_code": "MISSING_ITEM_IDS"
                }

            # 转换为工具格式
            owner = "user" if owner_type == "user" else "self"
            deletions = [{
                "owner": owner,
                "category": category,
                "item_ids": item_ids
            }]

            # 调用删除方法
            agent_id = owner_id if owner_type == "agent" else None
            result = await self.mongodb_client.delete_memory(user_id, deletions, agent_id)

            if result.get("success"):
                return {
                    "success": True,
                    "message": f"成功删除 {len(item_ids)} 条记忆",
                    "data": {"deleted_count": len(item_ids)}
                }
            else:
                details = result.get("details", {})
                if details:
                    return {
                        "success": False,
                        "message": "部分记忆条目删除失败",
                        "status": "partial_success",
                        "data": {
                            "deleted_count": details.get("deleted", 0),
                            "failed_count": details.get("failed", 0),
                            "failed_items": [
                                {"item_id": iid, "error": "条目不存在"}
                                for iid in details.get("failed_ids", [])
                            ]
                        }
                    }
                return {
                    "success": False,
                    "message": result.get("error", "删除记忆失败"),
                    "data": {"deleted_count": 0}
                }

        except Exception as e:
            logger.error(f"记忆服务：批量删除记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"批量删除记忆失败: {str(e)}"
            }

    async def batch_delete_categories(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        categories: List[str]
    ) -> Dict[str, Any]:
        """
        批量删除记忆分类

        Args:
            user_id: 用户ID
            owner_type: owner 类型
            owner_id: owner ID
            categories: 要删除的分类列表

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            if not categories:
                return {
                    "success": False,
                    "message": "缺少必要参数：categories",
                    "error_code": "MISSING_CATEGORIES"
                }

            # 删除分类
            deleted_count = 0
            failed_categories = []

            for category in categories:
                # 使用 $unset 删除分类
                result = await self.mongodb_client.memories_collection.update_one(
                    {
                        "user_id": user_id,
                        "owner_type": owner_type,
                        "owner_id": owner_id
                    },
                    {
                        "$unset": {f"memories.{category}": ""},
                        "$set": {"updated_at": datetime.now()}
                    }
                )

                if result.modified_count > 0:
                    deleted_count += 1
                else:
                    failed_categories.append({"category": category, "error": "分类不存在"})

            if deleted_count > 0 and not failed_categories:
                return {
                    "success": True,
                    "message": f"成功删除 {deleted_count} 个分类及其所有记忆",
                    "data": {"deleted_count": deleted_count}
                }
            elif deleted_count > 0 and failed_categories:
                return {
                    "success": False,
                    "message": "部分分类删除失败",
                    "status": "partial_success",
                    "data": {
                        "deleted_count": deleted_count,
                        "failed_count": len(failed_categories),
                        "failed_categories": failed_categories
                    }
                }
            else:
                return {
                    "success": False,
                    "message": "没有成功删除任何分类",
                    "data": {"deleted_count": 0}
                }

        except Exception as e:
            logger.error(f"记忆服务：批量删除分类失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"批量删除分类失败: {str(e)}"
            }

    async def export_memories(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        format: str
    ) -> Tuple[bool, str, Optional[str], Optional[str]]:
        """
        导出记忆为文件内容

        Args:
            user_id: 用户ID
            owner_type: owner 类型
            owner_id: owner ID
            format: 导出格式（json, txt, markdown, yaml）

        Returns:
            Tuple[bool, str, Optional[str], Optional[str]]: (成功状态, 消息, 文件内容, 文件名)
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return False, "owner_type 必须是 'user' 或 'agent'", None, None

            # 验证格式
            if format not in ["json", "txt", "markdown", "yaml"]:
                return False, "不支持的导出格式", None, None

            # 查询记忆数据
            memory_doc = await self.mongodb_client.memories_collection.find_one({
                "user_id": user_id,
                "owner_type": owner_type,
                "owner_id": owner_id
            })

            if not memory_doc or not memory_doc.get("memories"):
                return False, "未找到记忆数据", None, None

            # 生成文件内容
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"memories_{owner_type}_{owner_id}_{timestamp}"

            if format == "json":
                content = self._generate_json_export(memory_doc)
                filename += ".json"
            elif format == "yaml":
                content = self._generate_yaml_export(memory_doc)
                filename += ".yaml"
            elif format == "txt":
                content = self._generate_txt_export(memory_doc)
                filename += ".txt"
            elif format == "markdown":
                content = self._generate_markdown_export(memory_doc)
                filename += ".md"

            return True, "导出成功", content, filename

        except Exception as e:
            logger.error(f"记忆服务：导出记忆失败 (user: {user_id}): {e}")
            return False, f"导出记忆失败: {str(e)}", None, None

    def _generate_json_export(self, memory_doc: dict) -> str:
        """生成 JSON 格式导出"""
        export_data = {
            "owner_type": memory_doc.get("owner_type"),
            "owner_id": memory_doc.get("owner_id"),
            "exported_at": datetime.now().isoformat(),
            "categories": memory_doc.get("memories", {})
        }
        return json.dumps(export_data, ensure_ascii=False, indent=2)

    def _generate_yaml_export(self, memory_doc: dict) -> str:
        """生成 YAML 格式导出"""
        export_data = {
            "owner_type": memory_doc.get("owner_type"),
            "owner_id": memory_doc.get("owner_id"),
            "exported_at": datetime.now().isoformat(),
            "categories": memory_doc.get("memories", {})
        }
        return yaml.dump(export_data, allow_unicode=True, default_flow_style=False)

    def _generate_txt_export(self, memory_doc: dict) -> str:
        """生成 TXT 格式导出"""
        lines = []
        lines.append("# 记忆导出")
        lines.append(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"Owner: {memory_doc.get('owner_type')}/{memory_doc.get('owner_id')}")
        lines.append("")

        memories = memory_doc.get("memories", {})
        for category, data in memories.items():
            lines.append(f"## {category}")
            lines.append("")
            for item in data.get("items", []):
                lines.append(f"- {item.get('content')} ({item.get('updated_at')})")
            lines.append("")

        return "\n".join(lines)

    def _generate_markdown_export(self, memory_doc: dict) -> str:
        """生成 Markdown 格式导出"""
        lines = []
        lines.append("# 记忆导出")
        lines.append("")
        lines.append(f"**导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ")
        lines.append(f"**Owner**: {memory_doc.get('owner_type')}/{memory_doc.get('owner_id')}")
        lines.append("")
        lines.append("---")
        lines.append("")

        memories = memory_doc.get("memories", {})
        for category, data in memories.items():
            lines.append(f"## {category}")
            lines.append("")
            for item in data.get("items", []):
                lines.append(f"- {item.get('content')}  ")
                lines.append(f"  *{item.get('updated_at')}*")
                lines.append("")
            lines.append("---")
            lines.append("")

        return "\n".join(lines)

    async def import_memories(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        content: str,
        model_name: str
    ) -> Dict[str, Any]:
        """
        使用 LLM 导入记忆

        Args:
            user_id: 用户ID
            owner_type: owner 类型
            owner_id: owner ID
            content: 要导入的原始文本内容
            model_name: 用于解析的模型名称

        Returns:
            Dict[str, Any]: 导入结果
        """
        try:
            # 验证 owner_type
            if owner_type not in ["user", "agent"]:
                return {
                    "success": False,
                    "message": "owner_type 必须是 'user' 或 'agent'",
                    "error_code": "INVALID_OWNER_TYPE"
                }

            # 验证参数
            if not content.strip():
                return {
                    "success": False,
                    "message": "content 不能为空",
                    "error_code": "CONTENT_EMPTY"
                }

            # 获取用户语言设置
            user_language = await self.mongodb_client.user_repository.get_user_language(user_id)
            logger.info(f"Memory导入使用用户语言: user_id={user_id}, language={user_language}")

            # 根据 owner_type 和用户语言选择正确的提示词模板
            current_dir = os.path.dirname(os.path.abspath(__file__))
            if owner_type == "agent":
                if user_language == "en":
                    prompt_template_path = os.path.join(current_dir, "memory_template_agent_en.md")
                else:
                    prompt_template_path = os.path.join(current_dir, "memory_template_agent_zh.md")
            else:
                if user_language == "en":
                    prompt_template_path = os.path.join(current_dir, "memory_template_user_en.md")
                else:
                    prompt_template_path = os.path.join(current_dir, "memory_template_user_zh.md")

            if not os.path.exists(prompt_template_path):
                logger.error(f"提示词模板文件不存在: {prompt_template_path}")
                return {
                    "success": False,
                    "message": f"提示词模板文件不存在: {os.path.basename(prompt_template_path)}",
                    "error_code": "TEMPLATE_NOT_FOUND"
                }

            with open(prompt_template_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()

            # 替换变量
            prompt = prompt_template.replace("{{USER_INPUT}}", content)
            
            # 如果是 agent，owner_id 就是 agent 的名称，直接替换模板中的 {{AGENT_NAME}}
            if owner_type == "agent":
                prompt = prompt.replace("{{AGENT_NAME}}", owner_id)

            # 调用 LLM
            response = await model_service.call_model(
                model_name=model_name,
                messages=[{"role": "user", "content": prompt}],
                tools= None,
                user_id=user_id
            )

            # 解析 LLM 输出
            llm_content = response.get("content", "")
            parsed_data = self._parse_llm_response(llm_content)

            # 导入记忆
            result = await self._import_parsed_memories(user_id, owner_type, owner_id, parsed_data)

            # 添加 LLM 使用统计
            result["llm_usage"] = {
                "model": model_name,
                "prompt_tokens": response.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": response.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": response.get("usage", {}).get("total_tokens", 0)
            }

            return result

        except Exception as e:
            logger.error(f"记忆服务：导入记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"导入记忆失败: {str(e)}",
                "error_code": "LLM_PARSE_ERROR"
            }

    def _parse_llm_response(self, llm_content: str) -> dict:
        """解析 LLM 响应"""
        try:
            # 尝试提取 JSON 内容
            json_match = re.search(r'```json\s*(.*?)\s*```', llm_content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 尝试直接解析
                json_str = llm_content.strip()

            parsed = json.loads(json_str)
            return parsed
        except Exception as e:
            logger.error(f"解析 LLM 响应失败: {str(e)}")
            raise ValueError(f"LLM 响应解析失败: {str(e)}")

    async def _import_parsed_memories(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        parsed_data: dict
    ) -> dict:
        """导入解析后的记忆"""
        try:
            categories = parsed_data.get("categories", [])
            if not categories:
                return {
                    "success": False,
                    "message": "没有可导入的记忆"
                }

            total_added = 0
            failed_count = 0

            # 转换为工具格式
            owner = "user" if owner_type == "user" else "self"
            additions = []

            for cat_data in categories:
                category = cat_data.get("category")
                items = cat_data.get("items", [])

                if not category or not items:
                    continue

                # 验证并过滤条目
                valid_items = []
                for item in items:
                    content = item.get("content", "").strip()
                    if content:
                        valid_items.append(content)
                    else:
                        failed_count += 1

                if valid_items:
                    additions.append({
                        "owner": owner,
                        "category": category,
                        "items": valid_items
                    })

            # 批量添加
            if additions:
                agent_id = owner_id if owner_type == "agent" else None
                result = await self.mongodb_client.add_memory(user_id, additions, agent_id)
                if result.get("success"):
                    # 从消息中提取添加的数量
                    match = re.search(r'(\d+)', result.get("message", ""))
                    if match:
                        total_added = int(match.group(1))

            if total_added > 0:
                message = f"成功导入 {total_added} 条记忆"
                if failed_count > 0:
                    message += f"，{failed_count} 条失败（内容为空）"
                return {
                    "success": True,
                    "message": message
                }
            else:
                return {
                    "success": False,
                    "message": "没有成功导入任何记忆"
                }

        except Exception as e:
            logger.error(f"导入记忆失败: {str(e)}")
            return {
                "success": False,
                "message": f"导入记忆失败: {str(e)}"
            }


# 创建全局记忆服务实例
memory_service = MemoryService()
