"""
Prompt 管理器
负责提示词的存储、检索、更新和删除操作
"""
import logging
import os
import zipfile
import tempfile
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
from fastapi import UploadFile

from ...core.minio_client import minio_client
from ...models.prompt_schema import (
    PromptCreate, PromptUpdate, PromptInfo, PromptDetail,
    PromptList, PromptImportByPathRequest, PromptImportByFileRequest,
    PromptExportRequest
)

logger = logging.getLogger(__name__)


class PromptManager:
    """提示词管理器类"""

    def __init__(self):
        self.base_path = "prompt"  # MinIO 中的基础路径

    def _get_prompt_path(self, name: str) -> str:
        """
        获取提示词在 MinIO 中的完整路径

        Args:
            name: 提示词名称

        Returns:
            str: MinIO 中的路径
        """
        return f"{self.base_path}/{name}.md"

    def create_prompt(self, prompt_data: PromptCreate) -> Dict[str, Any]:
        """
        创建新的提示词

        Args:
            prompt_data: 提示词创建数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            prompt_path = self._get_prompt_path(prompt_data.name)

            # 检查是否已存在
            if minio_client.object_exists(prompt_path):
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_data.name}' 已存在"
                }

            # 创建包含元数据的内容
            full_content = prompt_data.content

            # 准备元数据
            metadata = {}
            if prompt_data.category:
                metadata["category"] = prompt_data.category

            # 上传到 MinIO，同时存储元数据
            success = minio_client.upload_content(
                object_name=prompt_path,
                content=full_content,
                content_type="text/markdown",
                metadata=metadata
            )

            if success:
                logger.info(f"提示词创建成功: {prompt_data.name}")
                return {
                    "success": True,
                    "message": f"提示词 '{prompt_data.name}' 创建成功",
                    "data": {"name": prompt_data.name, "path": prompt_path}
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

    def get_prompt(self, name: str) -> Optional[PromptDetail]:
        """
        获取指定提示词的详细信息

        Args:
            name: 提示词名称

        Returns:
            Optional[PromptDetail]: 提示词详细信息，不存在时返回 None
        """
        try:
            prompt_path = self._get_prompt_path(name)

            # 获取内容
            content = minio_client.download_content(prompt_path)
            if content is None:
                return None

            # 获取对象信息
            obj_info = minio_client.get_object_info(prompt_path)
            if obj_info is None:
                return None

            # 从对象元数据获取 category
            category = obj_info.get("metadata", {}).get("x-amz-meta-category")

            # 获取时间
            if obj_info["last_modified"]:
                dt = datetime.fromisoformat(obj_info["last_modified"])
                date_str = dt.strftime("%Y-%m-%d")
            else:
                date_str = datetime.now().strftime("%Y-%m-%d")

            return PromptDetail(
                name=name,
                content=content,
                category=category,
                size=obj_info["size"],
                created_time=date_str,
                modified_time=date_str
            )

        except Exception as e:
            logger.error(f"获取提示词失败 {name}: {e}")
            return None

    def update_prompt(self, name: str, update_data: PromptUpdate) -> Dict[str, Any]:
        """
        更新指定提示词

        Args:
            name: 提示词名称
            update_data: 更新数据

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            prompt_path = self._get_prompt_path(name)

            # 检查提示词是否存在
            if not minio_client.object_exists(prompt_path):
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 不存在"
                }

            # 确定新内容
            if update_data.content is not None:
                # 用户提供了新内容，直接使用
                new_content = update_data.content
            else:
                # 用户没提供新内容，保持原内容不变
                existing_content = minio_client.download_content(prompt_path)
                if existing_content is None:
                    return {
                        "success": False,
                        "message": f"无法读取提示词 '{name}' 的内容"
                    }
                new_content = existing_content

            # 确定新分类
            new_metadata = {}
            if update_data.category is not None:
                # 用户明确设置了分类
                if update_data.category:  # 非空字符串
                    new_metadata["category"] = update_data.category
                # 如果是空字符串，则不设置元数据（相当于清除分类）
            else:
                # 用户没提供分类，保持原分类不变
                obj_info = minio_client.get_object_info(prompt_path)
                if obj_info:
                    existing_category = obj_info.get("metadata", {}).get("x-amz-meta-category")
                    if existing_category:
                        new_metadata["category"] = existing_category

            # 直接上传新内容和新元数据
            success = minio_client.upload_content(
                object_name=prompt_path,
                content=new_content,
                content_type="text/markdown",
                metadata=new_metadata
            )

            if success:
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

    def delete_prompt(self, name: str) -> Dict[str, Any]:
        """
        删除指定提示词

        Args:
            name: 提示词名称

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            prompt_path = self._get_prompt_path(name)

            # 检查提示词是否存在
            if not minio_client.object_exists(prompt_path):
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 不存在"
                }

            # 删除文件
            success = minio_client.delete_object(prompt_path)

            if success:
                logger.info(f"提示词删除成功: {name}")
                return {
                    "success": True,
                    "message": f"提示词 '{name}' 删除成功"
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 删除失败"
                }

        except Exception as e:
            logger.error(f"删除提示词失败 {name}: {e}")
            return {
                "success": False,
                "message": f"删除提示词时发生错误: {str(e)}"
            }

    def list_prompts(self) -> PromptList:
        """
        列出所有提示词（只包含元数据）

        Returns:
            PromptList: 提示词列表
        """
        try:
            # 获取所有提示词对象，包含元数据
            objects = minio_client.list_objects(prefix=self.base_path + "/", include_metadata=True)

            prompts = []
            for obj in objects:
                if obj["object_name"].endswith(".md"):
                    # 提取提示词名称
                    name = Path(obj["object_name"]).stem

                    # 从对象元数据获取 category，键名是 x-amz-meta-category
                    category = obj.get("metadata", {}).get("x-amz-meta-category")

                    # obj["last_modified"] 是 ISO 格式的字符串，转为年月日格式
                    if obj["last_modified"]:
                        dt = datetime.fromisoformat(obj["last_modified"])
                        date_str = dt.strftime("%Y-%m-%d")
                    else:
                        date_str = datetime.now().strftime("%Y-%m-%d")

                    prompt_info = PromptInfo(
                        name=name,
                        category=category,  # 从元数据获取分类
                        size=obj["size"],
                        created_time=date_str,
                        modified_time=date_str
                    )
                    prompts.append(prompt_info)

            # 排序
            prompts.sort(key=lambda x: x.modified_time, reverse=True)

            return PromptList(prompts=prompts, total=len(prompts))

        except Exception as e:
            logger.error(f"列出提示词失败: {e}")
            return PromptList(prompts=[], total=0)

    def import_prompt_by_path(self, import_request: PromptImportByPathRequest) -> Dict[str, Any]:
        """
        通过本地文件路径导入提示词

        Args:
            import_request: 导入请求

        Returns:
            Dict[str, Any]: 导入结果
        """
        try:
            file_path = Path(import_request.file_path)

            # 检查文件是否存在
            if not file_path.exists():
                return {
                    "success": False,
                    "message": f"文件不存在: {import_request.file_path}"
                }

            # 检查是否为 Markdown 文件
            if file_path.suffix.lower() != '.md':
                return {
                    "success": False,
                    "message": "只支持导入 .md 文件"
                }

            # 读取文件内容
            try:
                content = file_path.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                # 尝试其他编码
                try:
                    content = file_path.read_text(encoding='gbk')
                except UnicodeDecodeError:
                    return {
                        "success": False,
                        "message": "无法读取文件，请检查文件编码"
                    }

            # 确定提示词名称
            prompt_name = import_request.name or file_path.stem

            # 准备元数据
            metadata = {}
            if import_request.category:
                metadata["category"] = import_request.category

            # 检查是否已存在
            prompt_path = self._get_prompt_path(prompt_name)
            if minio_client.object_exists(prompt_path):
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_name}' 已存在"
                }

            # 直接上传内容和元数据
            success = minio_client.upload_content(
                object_name=prompt_path,
                content=content,
                content_type="text/markdown",
                metadata=metadata
            )

            if success:
                logger.info(f"提示词导入成功: {prompt_name}")
                return {
                    "success": True,
                    "message": f"提示词 '{prompt_name}' 导入成功",
                    "data": {"name": prompt_name, "path": prompt_path}
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_name}' 导入失败"
                }

        except Exception as e:
            logger.error(f"通过路径导入提示词失败: {e}")
            return {
                "success": False,
                "message": f"导入失败: {str(e)}"
            }

    def import_prompt_by_file(self, file: UploadFile, import_request: PromptImportByFileRequest) -> Dict[str, Any]:
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
            content = file.file.read().decode('utf-8')

            # 确定提示词名称
            prompt_name = import_request.name or Path(file.filename).stem

            # 准备元数据
            metadata = {}
            if import_request.category:
                metadata["category"] = import_request.category

            # 检查是否已存在
            prompt_path = self._get_prompt_path(prompt_name)
            if minio_client.object_exists(prompt_path):
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_name}' 已存在"
                }

            # 直接上传内容和元数据
            success = minio_client.upload_content(
                object_name=prompt_path,
                content=content,
                content_type="text/markdown",
                metadata=metadata
            )

            if success:
                logger.info(f"提示词导入成功: {prompt_name}")
                return {
                    "success": True,
                    "message": f"提示词 '{prompt_name}' 导入成功",
                    "data": {"name": prompt_name, "path": prompt_path}
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{prompt_name}' 导入失败"
                }

        except Exception as e:
            logger.error(f"通过文件上传导入提示词失败: {e}")
            return {
                "success": False,
                "message": f"导入失败: {str(e)}"
            }

    def export_prompts(self, export_request: PromptExportRequest) -> Tuple[bool, str, Optional[str]]:
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
                        prompt_path = self._get_prompt_path(name)

                        # 直接从MinIO下载内容
                        content = minio_client.download_content(prompt_path)
                        if content is not None:
                            # 直接将内容写入ZIP，避免额外的处理步骤
                            zipf.writestr(f"{name}.md", content.encode('utf-8'))
                            exported_count += 1
                        else:
                            failed_count += 1
                            logger.warning(f"无法下载提示词: {name}")

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

    def batch_delete_prompts(self, names: List[str]) -> Dict[str, Any]:
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
                result = self.delete_prompt(name)
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