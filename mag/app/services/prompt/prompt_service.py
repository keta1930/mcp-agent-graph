"""
Prompt 服务主文件
提供提示词管理的高级服务接口
"""
import logging
from typing import Dict, Any, List

from app.infrastructure.database.mongodb import mongodb_client
from app.models.prompt_schema import (
    PromptCreate, PromptUpdate, PromptImportByFileRequest,
    PromptExportRequest, PromptBatchDeleteRequest
)
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class PromptService:
    """提示词服务类"""

    def __init__(self):
        self.mongodb_client = mongodb_client

    async def create_prompt(self, prompt_data: PromptCreate, user_id: str = "default_user") -> Dict[str, Any]:
        """
        创建新的提示词

        Args:
            prompt_data: 提示词创建数据
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 创建结果
        """
        try:
            return await self.mongodb_client.create_prompt(prompt_data, user_id)
        except Exception as e:
            logger.error(f"提示词服务：创建提示词失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"创建提示词失败: {str(e)}"
            }

    async def update_prompt(self, name: str, update_data: PromptUpdate, user_id: str = "default_user") -> Dict[str, Any]:
        """
        更新指定提示词

        Args:
            name: 提示词名称
            update_data: 更新数据
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 更新结果
        """
        try:
            return await self.mongodb_client.update_prompt(name, update_data, user_id)
        except Exception as e:
            logger.error(f"提示词服务：更新提示词失败 {name} (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"更新提示词失败: {str(e)}"
            }

    async def delete_prompt(self, name: str, user_id: str = "default_user") -> Dict[str, Any]:
        """
        删除指定提示词

        Args:
            name: 提示词名称
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            return await self.mongodb_client.delete_prompt(name, user_id)
        except Exception as e:
            logger.error(f"提示词服务：删除提示词失败 {name} (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"删除提示词失败: {str(e)}"
            }

    async def list_prompts(self, user_id: str = "default_user") -> Dict[str, Any]:
        """
        列出所有提示词（只包含元数据）

        Args:
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 提示词列表结果
        """
        try:
            prompt_list = await self.mongodb_client.list_prompts(user_id)
            return {
                "success": True,
                "message": "获取提示词列表成功",
                "data": prompt_list.dict()
            }
        except Exception as e:
            logger.error(f"提示词服务：列出提示词失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"获取提示词列表失败: {str(e)}"
            }

    async def batch_delete_prompts(self, delete_request: PromptBatchDeleteRequest,
                                  user_id: str = "default_user") -> Dict[str, Any]:
        """
        批量删除提示词

        Args:
            delete_request: 批量删除请求
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 批量删除结果
        """
        try:
            return await self.mongodb_client.batch_delete_prompts(delete_request.names, user_id)
        except Exception as e:
            logger.error(f"提示词服务：批量删除提示词失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"批量删除提示词失败: {str(e)}"
            }

    async def get_prompt_content_only(self, name: str, user_id: str = "default_user") -> Dict[str, Any]:
        """
        获取提示词内容

        Args:
            name: 提示词名称
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 提示词内容或错误信息
        """
        try:
            prompt_detail = await self.mongodb_client.get_prompt(name, user_id)
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
            logger.error(f"提示词服务：获取提示词内容失败 {name} (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"获取提示词内容失败: {str(e)}"
            }

    async def import_prompt_by_file(self, file: UploadFile, import_request: PromptImportByFileRequest,
                                   user_id: str = "default_user") -> Dict[str, Any]:
        """
        通过文件上传导入提示词

        Args:
            file: 上传的文件
            import_request: 导入请求
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 导入结果
        """
        try:
            return await self.mongodb_client.import_prompt_by_file(file, import_request, user_id)
        except Exception as e:
            logger.error(f"提示词服务：通过文件导入失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"通过文件导入失败: {str(e)}"
            }

    async def export_prompts(self, export_request: PromptExportRequest,
                           user_id: str = "default_user") -> Dict[str, Any]:
        """
        批量导出提示词

        Args:
            export_request: 导出请求
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 导出结果，包含 ZIP 文件路径
        """
        try:
            success, message, zip_path = await self.mongodb_client.export_prompts(export_request, user_id)
            return {
                "success": success,
                "message": message,
                "data": {"zip_path": zip_path} if zip_path else None
            }
        except Exception as e:
            logger.error(f"提示词服务：批量导出失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"批量导出失败: {str(e)}"
            }

    async def share_prompt(self, prompt_name: str, owner_user_id: str,
                         target_user_ids: List[str]) -> Dict[str, Any]:
        """
        共享提示词给其他用户

        Args:
            prompt_name: 提示词名称
            owner_user_id: 所有者用户ID
            target_user_ids: 目标用户ID列表

        Returns:
            Dict[str, Any]: 共享结果
        """
        try:
            success = await self.mongodb_client.prompt_repository.share_prompt(
                prompt_name, owner_user_id, target_user_ids
            )
            if success:
                return {
                    "success": True,
                    "message": f"成功共享提示词 '{prompt_name}' 给 {len(target_user_ids)} 个用户"
                }
            return {
                "success": False,
                "message": f"共享提示词 '{prompt_name}' 失败"
            }
        except Exception as e:
            logger.error(f"提示词服务：共享提示词失败 (owner: {owner_user_id}, prompt: {prompt_name}): {e}")
            return {
                "success": False,
                "message": f"共享提示词失败: {str(e)}"
            }

    async def unshare_prompt(self, prompt_name: str, owner_user_id: str,
                           target_user_ids: List[str]) -> Dict[str, Any]:
        """
        取消共享提示词

        Args:
            prompt_name: 提示词名称
            owner_user_id: 所有者用户ID
            target_user_ids: 目标用户ID列表

        Returns:
            Dict[str, Any]: 取消共享结果
        """
        try:
            success = await self.mongodb_client.prompt_repository.unshare_prompt(
                prompt_name, owner_user_id, target_user_ids
            )
            if success:
                return {
                    "success": True,
                    "message": f"成功取消共享提示词 '{prompt_name}'"
                }
            return {
                "success": False,
                "message": f"取消共享提示词 '{prompt_name}' 失败"
            }
        except Exception as e:
            logger.error(f"提示词服务：取消共享提示词失败 (owner: {owner_user_id}, prompt: {prompt_name}): {e}")
            return {
                "success": False,
                "message": f"取消共享提示词失败: {str(e)}"
            }

    async def list_shared_prompts(self, user_id: str) -> Dict[str, Any]:
        """
        列出共享给用户的提示词

        Args:
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 共享提示词列表
        """
        try:
            prompts = await self.mongodb_client.prompt_repository.list_shared_prompts(user_id)
            return {
                "success": True,
                "message": "获取共享提示词列表成功",
                "data": {"prompts": prompts, "total": len(prompts)}
            }
        except Exception as e:
            logger.error(f"提示词服务：列出共享提示词失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "message": f"列出共享提示词失败: {str(e)}"
            }


# 创建全局提示词服务实例
prompt_service = PromptService()
