"""
Project服务
提供Project管理的业务逻辑，供API路由使用
"""
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.infrastructure.database.mongodb.client import mongodb_client
from app.infrastructure.storage.object_storage.project_document_manager import project_document_manager
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

logger = logging.getLogger(__name__)


class ProjectService:
    """Project服务 - 负责Project业务逻辑和数据库交互"""

    async def create_project(
        self,
        name: str,
        instruction: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        创建Project

        Args:
            name: Project名称
            instruction: Project级别的agent行为指南
            user_id: 用户ID

        Returns:
            创建结果
        """
        try:
            # 生成project_id
            project_id = f"project_{uuid.uuid4().hex[:12]}"

            # 创建project
            success = await mongodb_client.create_project(
                project_id=project_id,
                name=name,
                instruction=instruction,
                user_id=user_id
            )

            if success:
                logger.info(f"创建Project成功: {name} ({project_id}), 用户: {user_id}")
                return {
                    "success": True,
                    "project_id": project_id,
                    "message": "Project创建成功"
                }
            else:
                return {
                    "success": False,
                    "message": "创建Project失败"
                }

        except Exception as e:
            logger.error(f"创建Project失败: {str(e)}")
            return {
                "success": False,
                "message": f"创建Project失败: {str(e)}"
            }

    async def get_project_detail(
        self,
        project_id: str,
        user_id: str,
        include_conversations: bool = True
    ) -> Dict[str, Any]:
        """
        获取Project详情

        Args:
            project_id: Project ID
            user_id: 用户ID
            include_conversations: 是否包含conversations列表

        Returns:
            Project详情
        """
        try:
            # 获取project
            project = await mongodb_client.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "Project不存在或无权限访问"
                }

            # 构建响应
            result = {
                "success": True,
                "project": {
                    "project_id": project["_id"],
                    "name": project["name"],
                    "instruction": project.get("instruction", ""),
                    "created_at": project["created_at"].isoformat(),
                    "updated_at": project["updated_at"].isoformat(),
                    "conversation_count": project.get("stats", {}).get("conversation_count", 0),
                    "total_files": project.get("stats", {}).get("total_files", 0)
                }
            }

            # 包含conversations列表
            if include_conversations:
                conversations = await mongodb_client.get_conversations_by_project(project_id, user_id)
                result["project"]["conversations"] = [
                    {
                        "conversation_id": conv["_id"],
                        "title": conv.get("title", ""),
                        "created_at": conv["created_at"].isoformat(),
                        "updated_at": conv["updated_at"].isoformat()
                    }
                    for conv in conversations
                ]

            return result

        except Exception as e:
            logger.error(f"获取Project详情失败 ({project_id}): {str(e)}")
            return {
                "success": False,
                "message": f"获取Project详情失败: {str(e)}"
            }

    async def update_project(
        self,
        project_id: str,
        update_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        更新Project信息

        Args:
            project_id: Project ID
            update_data: 更新数据 (name, instruction)
            user_id: 用户ID

        Returns:
            更新结果
        """
        try:
            # 验证权限
            project = await mongodb_client.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "Project不存在或无权限访问"
                }

            # 更新project
            success = await mongodb_client.update_project(
                project_id=project_id,
                update_data=update_data,
                user_id=user_id
            )

            if success:
                logger.info(f"更新Project成功: {project_id}")
                return {
                    "success": True,
                    "message": "Project更新成功",
                    "project_id": project_id
                }
            else:
                return {
                    "success": False,
                    "message": "更新Project失败"
                }

        except Exception as e:
            logger.error(f"更新Project失败 ({project_id}): {str(e)}")
            return {
                "success": False,
                "message": f"更新Project失败: {str(e)}"
            }

    async def delete_project(
        self,
        project_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        删除Project（硬删除，级联处理）

        Args:
            project_id: Project ID
            user_id: 用户ID

        Returns:
            删除结果
        """
        try:
            # 验证权限
            project = await mongodb_client.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "Project不存在或无权限访问"
                }

            # 1. 获取project下的所有conversations
            conversations = await mongodb_client.get_conversations_by_project(project_id, user_id)

            # 2. 将所有conversations的project_id设置为None
            for conv in conversations:
                await mongodb_client.update_conversation_project(
                    conversation_id=conv["_id"],
                    project_id=None,
                    user_id=user_id
                )

            # 3. 删除MinIO中的project文件
            minio_success = await project_document_manager.delete_all_project_files(
                user_id=user_id,
                project_id=project_id
            )

            if not minio_success:
                logger.warning(f"删除Project文件失败: {project_id}")

            # 4. 删除MongoDB中的project文档
            success = await mongodb_client.delete_project(project_id)

            if success:
                logger.info(f"删除Project成功: {project_id} (关联conversations: {len(conversations)})")
                return {
                    "success": True,
                    "message": "Project删除成功",
                    "deleted_conversations_count": len(conversations)
                }
            else:
                return {
                    "success": False,
                    "message": "删除Project失败"
                }

        except Exception as e:
            logger.error(f"删除Project失败 ({project_id}): {str(e)}")
            return {
                "success": False,
                "message": f"删除Project失败: {str(e)}"
            }

    async def list_projects(
        self,
        user_id: str,
        limit: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        获取用户的Project列表

        Args:
            user_id: 用户ID
            limit: 返回数量限制
            skip: 跳过数量

        Returns:
            Project列表
        """
        try:
            projects = await mongodb_client.list_projects(
                user_id=user_id,
                limit=limit,
                skip=skip
            )

            project_list = [
                {
                    "project_id": proj["_id"],
                    "name": proj["name"],
                    "created_at": proj["created_at"].isoformat(),
                    "updated_at": proj["updated_at"].isoformat(),
                    "conversation_count": proj.get("stats", {}).get("conversation_count", 0),
                    "total_files": proj.get("stats", {}).get("total_files", 0)
                }
                for proj in projects
            ]

            return {
                "success": True,
                "projects": project_list,
                "total_count": len(project_list)
            }

        except Exception as e:
            logger.error(f"获取Project列表失败 (用户: {user_id}): {str(e)}")
            return {
                "success": False,
                "message": f"获取Project列表失败: {str(e)}",
                "projects": [],
                "total_count": 0
            }

    async def move_conversation_to_project(
        self,
        conversation_id: str,
        project_id: Optional[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        移动conversation到project（或从project移除）

        Args:
            conversation_id: Conversation ID
            project_id: Project ID（None表示移除project归属）
            user_id: 用户ID

        Returns:
            操作结果
        """
        try:
            # 验证conversation权限
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "message": "Conversation不存在或无权限访问"
                }

            # 如果指定了project_id，验证project权限
            if project_id:
                project = await mongodb_client.get_project(project_id, user_id)
                if not project:
                    return {
                        "success": False,
                        "message": "Project不存在或无权限访问"
                    }

            # 获取旧的project_id
            old_project_id = conversation.get("project_id")

            # 更新conversation的project归属
            success = await mongodb_client.update_conversation_project(
                conversation_id=conversation_id,
                project_id=project_id,
                user_id=user_id
            )

            if success:
                # 更新旧project的conversation计数
                if old_project_id:
                    await mongodb_client.update_project_conversation_count(
                        project_id=old_project_id,
                        increment=-1
                    )

                # 更新新project的conversation计数
                if project_id:
                    await mongodb_client.update_project_conversation_count(
                        project_id=project_id,
                        increment=1
                    )

                action = "添加到Project" if project_id else "从Project移除"
                logger.info(f"Conversation {action}成功: {conversation_id} -> {project_id}")

                return {
                    "success": True,
                    "message": f"Conversation {action}成功",
                    "conversation_id": conversation_id,
                    "project_id": project_id
                }
            else:
                return {
                    "success": False,
                    "message": "移动Conversation失败"
                }

        except Exception as e:
            logger.error(f"移动Conversation失败 ({conversation_id} -> {project_id}): {str(e)}")
            return {
                "success": False,
                "message": f"移动Conversation失败: {str(e)}"
            }

    async def get_project_conversations(
        self,
        project_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        获取Project下的所有Conversations

        Args:
            project_id: Project ID
            user_id: 用户ID

        Returns:
            Conversations列表
        """
        try:
            # 验证project权限
            project = await mongodb_client.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "Project不存在或无权限访问",
                    "conversations": []
                }

            # 获取conversations
            conversations = await mongodb_client.get_conversations_by_project(project_id, user_id)

            conversation_list = [
                {
                    "conversation_id": conv["_id"],
                    "title": conv.get("title", ""),
                    "conversation_type": conv.get("conversation_type", "agent"),
                    "created_at": conv["created_at"].isoformat(),
                    "updated_at": conv["updated_at"].isoformat()
                }
                for conv in conversations
            ]

            return {
                "success": True,
                "project_id": project_id,
                "conversations": conversation_list,
                "total_count": len(conversation_list)
            }

        except Exception as e:
            logger.error(f"获取Project的Conversations失败 ({project_id}): {str(e)}")
            return {
                "success": False,
                "message": f"获取Conversations失败: {str(e)}",
                "conversations": []
            }

    async def validate_project_ownership(
        self,
        project_id: str,
        user_id: str
    ) -> bool:
        """
        验证Project所有权

        Args:
            project_id: Project ID
            user_id: 用户ID

        Returns:
            是否拥有权限
        """
        try:
            project = await mongodb_client.get_project(project_id, user_id)
            return project is not None

        except Exception as e:
            logger.error(f"验证Project所有权失败 ({project_id}): {str(e)}")
            return False


# 全局实例
project_service = ProjectService()
