"""
Prompt管理器 - MongoDB版本
负责提示词的MongoDB存储、检索、更新和删除操作
"""
import logging
import zipfile
import tempfile
import os
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile

from app.models.prompt_schema import (
    PromptCreate, PromptUpdate, PromptInfo, PromptDetail,
    PromptList, PromptImportByFileRequest, PromptExportRequest
)

logger = logging.getLogger(__name__)


class PromptRepository:
    """Prompt管理器类 - MongoDB版本"""

    def __init__(self, db, collection):
        """
        初始化PromptManager

        Args:
            db: MongoDB数据库实例
            collection: prompts集合
        """
        self.db = db
        self.collection = collection

    async def create_prompt(self, prompt_data: PromptCreate) -> Dict[str, Any]:
        """
        创建新的提示词

        Args:
            prompt_data: 提示词创建数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            # 检查是否已存在
            existing = await self.collection.find_one({
                "name": prompt_data.name
            })

            if existing:
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_data.name}' 已存在"
                }

            # 创建文档
            document = {
                "name": prompt_data.name,
                "content": prompt_data.content,
                "category": prompt_data.category,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }

            result = await self.collection.insert_one(document)

            if result.inserted_id:
                logger.info(f"提示词创建成功: {prompt_data.name}")
                return {
                    "success": True,
                    "message": f"提示词 '{prompt_data.name}' 创建成功",
                    "data": {
                        "name": prompt_data.name,
                        "id": str(result.inserted_id)
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_data.name}' 创建失败"
                }

        except Exception as e:
            logger.error(f"创建提示词失败: {e}")
            return {
                "success": False,
                "message": f"创建提示词时发生错误: {str(e)}"
            }

    async def get_prompt(self, name: str) -> Optional[PromptDetail]:
        """
        获取指定提示词的详细信息

        Args:
            name: 提示词名称

        Returns:
            Optional[PromptDetail]: 提示词详细信息，不存在时返回 None
        """
        try:
            doc = await self.collection.find_one({
                "name": name
            })

            if not doc:
                return None

            # 格式化时间
            created_time = doc["created_at"].strftime("%Y-%m-%d") if doc.get("created_at") else datetime.now().strftime("%Y-%m-%d")
            updated_time = doc["updated_at"].strftime("%Y-%m-%d") if doc.get("updated_at") else datetime.now().strftime("%Y-%m-%d")

            return PromptDetail(
                name=doc["name"],
                content=doc["content"],
                category=doc.get("category"),
                size=len(doc["content"].encode('utf-8')),  # 内容的字节大小
                created_time=created_time,
                modified_time=updated_time
            )

        except Exception as e:
            logger.error(f"获取提示词失败 {name}: {e}")
            return None

    async def update_prompt(self, name: str, update_data: PromptUpdate) -> Dict[str, Any]:
        """
        更新指定提示词

        Args:
            name: 提示词名称
            update_data: 更新数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            # 检查提示词是否存在
            existing = await self.collection.find_one({
                "name": name
            })

            if not existing:
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 不存在"
                }

            # 构建更新字段
            update_fields = {"updated_at": datetime.now()}

            if update_data.content is not None:
                update_fields["content"] = update_data.content

            if update_data.category is not None:
                update_fields["category"] = update_data.category

            # 执行更新
            result = await self.collection.update_one(
                {"name": name},
                {"$set": update_fields}
            )

            if result.modified_count > 0 or result.matched_count > 0:
                logger.info(f"提示词更新成功: {name}")
                return {
                    "success": True,
                    "message": f"提示词 '{name}' 更新成功"
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 更新失败"
                }

        except Exception as e:
            logger.error(f"更新提示词失败 {name}: {e}")
            return {
                "success": False,
                "message": f"更新提示词时发生错误: {str(e)}"
            }

    async def delete_prompt(self, name: str) -> Dict[str, Any]:
        """
        删除指定提示词

        Args:
            name: 提示词名称

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            result = await self.collection.delete_one({
                "name": name
            })

            if result.deleted_count > 0:
                logger.info(f"提示词删除成功: {name}")
                return {
                    "success": True,
                    "message": f"提示词 '{name}' 删除成功"
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 不存在"
                }

        except Exception as e:
            logger.error(f"删除提示词失败 {name}: {e}")
            return {
                "success": False,
                "message": f"删除提示词时发生错误: {str(e)}"
            }

    async def list_prompts(self) -> PromptList:
        """
        列出所有提示词（只包含元数据）

        Returns:
            PromptList: 提示词列表
        """
        try:
            cursor = self.collection.find(
                {},
                {"name": 1, "category": 1, "content": 1, "created_at": 1, "updated_at": 1}
            ).sort("updated_at", -1)

            docs = await cursor.to_list(length=None)

            prompts = []
            for doc in docs:
                created_time = doc["created_at"].strftime("%Y-%m-%d") if doc.get("created_at") else datetime.now().strftime("%Y-%m-%d")
                updated_time = doc["updated_at"].strftime("%Y-%m-%d") if doc.get("updated_at") else datetime.now().strftime("%Y-%m-%d")

                prompt_info = PromptInfo(
                    name=doc["name"],
                    category=doc.get("category"),
                    size=len(doc["content"].encode('utf-8')),  # 内容的字节大小
                    created_time=created_time,
                    modified_time=updated_time
                )
                prompts.append(prompt_info)

            return PromptList(prompts=prompts, total=len(prompts))

        except Exception as e:
            logger.error(f"列出提示词失败: {e}")
            return PromptList(prompts=[], total=0)

    async def batch_delete_prompts(self, names: List[str]) -> Dict[str, Any]:
        """
        批量删除提示词

        Args:
            names: 要删除的提示词名称列表

        Returns:
            Dict[str, Any]: 批量操作结果
        """
        try:
            results = {
                "success": [],
                "failed": [],
                "total": len(names)
            }

            for name in names:
                result = await self.delete_prompt(name)
                if result["success"]:
                    results["success"].append(name)
                else:
                    results["failed"].append({"name": name, "error": result["message"]})

            success_count = len(results["success"])
            failed_count = len(results["failed"])

            return {
                "success": failed_count == 0,
                "message": f"批量删除完成：成功 {success_count} 个，失败 {failed_count} 个",
                "data": results
            }

        except Exception as e:
            logger.error(f"批量删除提示词失败: {e}")
            return {
                "success": False,
                "message": f"批量删除时发生错误: {str(e)}"
            }

    async def import_prompt_by_file(self, file: UploadFile, import_request: PromptImportByFileRequest) -> Dict[str, Any]:
        """
        通过文件上传导入提示词

        Args:
            file: 上传的文件
            import_request: 导入请求

        Returns:
            Dict[str, Any]: 导入结果
        """
        try:
            # 检查文件类型
            if not file.filename.endswith('.md'):
                return {
                    "success": False,
                    "message": "只支持上传 .md 文件"
                }

            # 读取文件内容
            content = await file.read()
            content_str = content.decode('utf-8')

            # 创建提示词数据
            prompt_data = PromptCreate(
                name=import_request.name,
                content=content_str,
                category=import_request.category
            )

            # 调用创建方法
            return await self.create_prompt(prompt_data)

        except Exception as e:
            logger.error(f"通过文件上传导入提示词失败: {e}")
            return {
                "success": False,
                "message": f"导入失败: {str(e)}"
            }

    async def export_prompts(self, export_request: PromptExportRequest) -> Tuple[bool, str, Optional[str]]:
        """
        批量导出提示词为 ZIP 压缩包

        Args:
            export_request: 导出请求

        Returns:
            Tuple[bool, str, Optional[str]]: (成功状态, 消息, ZIP文件路径)
        """
        try:
            # 创建临时ZIP文件
            temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')

            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                exported_count = 0
                failed_count = 0

                for name in export_request.names:
                    try:
                        # 从MongoDB获取提示词
                        prompt_detail = await self.get_prompt(name)

                        if prompt_detail:
                            # 将内容写入ZIP
                            zipf.writestr(f"{name}.md", prompt_detail.content.encode('utf-8'))
                            exported_count += 1
                        else:
                            failed_count += 1
                            logger.warning(f"无法找到提示词: {name}")

                    except Exception as e:
                        failed_count += 1
                        logger.error(f"导出提示词 {name} 失败: {e}")

            if exported_count > 0:
                message = f"导出完成：成功 {exported_count} 个"
                if failed_count > 0:
                    message += f"，失败 {failed_count} 个"

                return True, message, temp_zip.name
            else:
                os.unlink(temp_zip.name)  # 删除空的 ZIP 文件
                return False, "没有成功导出任何提示词", None

        except Exception as e:
            logger.error(f"批量导出提示词失败: {e}")
            return False, f"导出失败: {str(e)}", None
