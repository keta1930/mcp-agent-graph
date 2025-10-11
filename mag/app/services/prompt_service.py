"""
Prompt 服务主文件
提供提示词管理的高级服务接口
"""
import logging
from typing import Dict, Any, List, Optional

from .mongodb_service import mongodb_service
from ..models.prompt_schema import (
    PromptCreate, PromptUpdate, PromptDetail, PromptList,
    PromptImportByPathRequest, PromptImportByFileRequest,
    PromptExportRequest, PromptBatchDeleteRequest
)
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class PromptService:
    """提示词服务类"""

    def __init__(self):
        self.mongodb_service = mongodb_service

    async def create_prompt(self, prompt_data: PromptCreate) -> Dict[str, Any]:
        """
        创建新的提示词

        Args:
            prompt_data: 提示词创建数据

        Returns:
            Dict[str, Any]: 创建结果
        """
        try:
            return await self.mongodb_service.create_prompt(prompt_data)
        except Exception as e:
            logger.error(f"提示词服务：创建提示词失败: {e}")
            return {
                "success": False,
                "message": f"创建提示词失败: {str(e)}"
            }

    async def update_prompt(self, name: str, update_data: PromptUpdate) -> Dict[str, Any]:
        """
        更新指定提示词

        Args:
            name: 提示词名称
            update_data: 更新数据

        Returns:
            Dict[str, Any]: 更新结果
        """
        try:
            return await self.mongodb_service.update_prompt(name, update_data)
        except Exception as e:
            logger.error(f"提示词服务：更新提示词失败 {name}: {e}")
            return {
                "success": False,
                "message": f"更新提示词失败: {str(e)}"
            }

    async def delete_prompt(self, name: str) -> Dict[str, Any]:
        """
        删除指定提示词

        Args:
            name: 提示词名称

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            return await self.mongodb_service.delete_prompt(name)
        except Exception as e:
            logger.error(f"提示词服务：删除提示词失败 {name}: {e}")
            return {
                "success": False,
                "message": f"删除提示词失败: {str(e)}"
            }

    async def list_prompts(self) -> Dict[str, Any]:
        """
        列出所有提示词（只包含元数据）

        Returns:
            Dict[str, Any]: 提示词列表结果
        """
        try:
            prompt_list = await self.mongodb_service.list_prompts()
            return {
                "success": True,
                "message": "获取提示词列表成功",
                "data": prompt_list.dict()
            }
        except Exception as e:
            logger.error(f"提示词服务：列出提示词失败: {e}")
            return {
                "success": False,
                "message": f"获取提示词列表失败: {str(e)}"
            }

    async def batch_delete_prompts(self, delete_request: PromptBatchDeleteRequest) -> Dict[str, Any]:
        """
        批量删除提示词

        Args:
            delete_request: 批量删除请求

        Returns:
            Dict[str, Any]: 批量删除结果
        """
        try:
            return await self.mongodb_service.batch_delete_prompts(delete_request.names)
        except Exception as e:
            logger.error(f"提示词服务：批量删除提示词失败: {e}")
            return {
                "success": False,
                "message": f"批量删除提示词失败: {str(e)}"
            }

    async def get_prompt_content_only(self, name: str) -> Dict[str, Any]:
        """
        获取提示词内容

        Args:
            name: 提示词名称

        Returns:
            Dict[str, Any]: 提示词内容或错误信息
        """
        try:
            prompt_detail = await self.mongodb_service.get_prompt(name)
            if prompt_detail:
                return {
                    "success": True,
                    "message": "获取提示词内容成功",
                    "data": {
                        "name": prompt_detail.name,
                        "content": prompt_detail.content
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"提示词 '{name}' 不存在"
                }
        except Exception as e:
            logger.error(f"提示词服务：获取提示词内容失败 {name}: {e}")
            return {
                "success": False,
                "message": f"获取提示词内容失败: {str(e)}"
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
            return await self.mongodb_service.import_prompt_by_file(file, import_request)
        except Exception as e:
            logger.error(f"提示词服务：通过文件导入失败: {e}")
            return {
                "success": False,
                "message": f"通过文件导入失败: {str(e)}"
            }

    async def export_prompts(self, export_request: PromptExportRequest) -> Dict[str, Any]:
        """
        批量导出提示词

        Args:
            export_request: 导出请求

        Returns:
            Dict[str, Any]: 导出结果，包含 ZIP 文件路径
        """
        try:
            success, message, zip_path = await self.mongodb_service.export_prompts(export_request)
            return {
                "success": success,
                "message": message,
                "data": {"zip_path": zip_path} if zip_path else None
            }
        except Exception as e:
            logger.error(f"提示词服务：批量导出失败: {e}")
            return {
                "success": False,
                "message": f"批量导出失败: {str(e)}"
            }


# 创建全局提示词服务实例
prompt_service = PromptService()