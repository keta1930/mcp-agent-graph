"""
Project Repository
负责Project集合的数据库操作
"""
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class ProjectRepository:
    """Project数据仓库"""

    def __init__(self, db: AsyncIOMotorDatabase, collection: AsyncIOMotorCollection):
        self.db = db
        self.collection = collection

    async def create_project(
        self,
        project_id: str,
        name: str,
        instruction: str,
        user_id: str
    ) -> bool:
        """
        创建新的Project

        Args:
            project_id: Project唯一ID
            name: Project名称
            instruction: Agent行为指南
            user_id: 用户ID

        Returns:
            bool: 创建是否成功
        """
        try:
            now = datetime.utcnow()
            project_doc = {
                "_id": project_id,
                "user_id": user_id,
                "name": name,
                "instruction": instruction,
                "created_at": now,
                "updated_at": now,
                "documents": {
                    "total_count": 0,
                    "files": []
                },
                "stats": {
                    "conversation_count": 0,
                    "total_files": 0
                }
            }

            await self.collection.insert_one(project_doc)
            logger.info(f"✓ 创建Project成功: {project_id} (用户: {user_id})")
            return True

        except Exception as e:
            logger.error(f"创建Project失败: {str(e)}")
            return False

    async def get_project(self, project_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        获取Project详情

        Args:
            project_id: Project ID
            user_id: 用户ID（可选，用于权限验证）

        Returns:
            Optional[Dict]: Project文档，不存在返回None
        """
        try:
            query = {"_id": project_id}
            if user_id:
                query["user_id"] = user_id

            project = await self.collection.find_one(query)
            return project

        except Exception as e:
            logger.error(f"获取Project失败 ({project_id}): {str(e)}")
            return None

    async def update_project(
        self,
        project_id: str,
        update_data: Dict[str, Any],
        user_id: str
    ) -> bool:
        """
        更新Project信息

        Args:
            project_id: Project ID
            update_data: 更新的数据（name, instruction）
            user_id: 用户ID

        Returns:
            bool: 更新是否成功
        """
        try:
            # 构建更新字段
            update_fields = {"updated_at": datetime.utcnow()}

            if "name" in update_data and update_data["name"]:
                update_fields["name"] = update_data["name"]

            if "instruction" in update_data:
                update_fields["instruction"] = update_data["instruction"]

            result = await self.collection.update_one(
                {"_id": project_id, "user_id": user_id},
                {"$set": update_fields}
            )

            if result.modified_count > 0:
                logger.info(f"✓ 更新Project成功: {project_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"更新Project失败 ({project_id}): {str(e)}")
            return False

    async def delete_project(self, project_id: str) -> bool:
        """
        硬删除Project

        Args:
            project_id: Project ID

        Returns:
            bool: 删除是否成功
        """
        try:
            result = await self.collection.delete_one({"_id": project_id})

            if result.deleted_count > 0:
                logger.info(f"✓ 删除Project成功: {project_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"删除Project失败 ({project_id}): {str(e)}")
            return False

    async def list_projects(
        self,
        user_id: str,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        获取用户的Project列表

        Args:
            user_id: 用户ID
            limit: 返回数量限制
            skip: 跳过数量

        Returns:
            List[Dict]: Project列表
        """
        try:
            cursor = self.collection.find(
                {"user_id": user_id}
            ).sort("updated_at", -1).skip(skip).limit(limit)

            projects = await cursor.to_list(length=limit)
            return projects

        except Exception as e:
            logger.error(f"获取Project列表失败 (用户: {user_id}): {str(e)}")
            return []

    async def update_instruction(self, project_id: str, instruction: str, user_id: str) -> bool:
        """
        更新Project的instruction

        Args:
            project_id: Project ID
            instruction: 新的instruction内容
            user_id: 用户ID

        Returns:
            bool: 更新是否成功
        """
        try:
            result = await self.collection.update_one(
                {"_id": project_id, "user_id": user_id},
                {"$set": {"instruction": instruction, "updated_at": datetime.utcnow()}}
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"更新Project instruction失败 ({project_id}): {str(e)}")
            return False

    async def get_instruction(self, project_id: str, user_id: Optional[str] = None) -> Optional[str]:
        """
        获取Project的instruction

        Args:
            project_id: Project ID
            user_id: 用户ID（可选）

        Returns:
            Optional[str]: instruction内容，不存在返回None
        """
        try:
            query = {"_id": project_id}
            if user_id:
                query["user_id"] = user_id

            project = await self.collection.find_one(query, {"instruction": 1})

            return project.get("instruction", "") if project else None

        except Exception as e:
            logger.error(f"获取Project instruction失败 ({project_id}): {str(e)}")
            return None

    async def add_file_metadata(
        self,
        project_id: str,
        filename: str,
        summary: str,
        size: int,
        version_id: str,
        agent: str,
        comment: str
    ) -> bool:
        """
        添加文件元数据到Project

        Args:
            project_id: Project ID
            filename: 文件名
            summary: 文件摘要
            size: 文件大小
            version_id: 版本ID
            agent: 操作者
            comment: 操作注释

        Returns:
            bool: 添加是否成功
        """
        try:
            now = datetime.utcnow()
            log_id = str(uuid.uuid4())

            file_metadata = {
                "filename": filename,
                "summary": summary,
                "size": size,
                "created_at": now,
                "updated_at": now,
                "current_version_id": version_id,
                "logs": [{
                    "log_id": log_id,
                    "agent": agent,
                    "comment": comment,
                    "timestamp": now
                }]
            }

            result = await self.collection.update_one(
                {"_id": project_id},
                {
                    "$push": {"documents.files": file_metadata},
                    "$inc": {
                        "documents.total_count": 1,
                        "stats.total_files": 1
                    },
                    "$set": {"updated_at": now}
                }
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"添加文件元数据失败 ({project_id}/{filename}): {str(e)}")
            return False

    async def update_file_metadata(
        self,
        project_id: str,
        filename: str,
        summary: Optional[str] = None,
        size: Optional[int] = None,
        version_id: Optional[str] = None,
        agent: Optional[str] = None,
        comment: Optional[str] = None
    ) -> bool:
        """
        更新文件元数据

        Args:
            project_id: Project ID
            filename: 文件名
            summary: 文件摘要
            size: 文件大小
            version_id: 版本ID
            agent: 操作者
            comment: 操作注释

        Returns:
            bool: 更新是否成功
        """
        try:
            now = datetime.utcnow()
            update_fields = {"documents.files.$.updated_at": now}

            if summary is not None:
                update_fields["documents.files.$.summary"] = summary

            if size is not None:
                update_fields["documents.files.$.size"] = size

            if version_id is not None:
                update_fields["documents.files.$.current_version_id"] = version_id

            # 如果提供了agent和comment，添加日志
            log_entry = None
            if agent and comment:
                log_id = str(uuid.uuid4())
                log_entry = {
                    "log_id": log_id,
                    "agent": agent,
                    "comment": comment,
                    "timestamp": now
                }

            # 执行更新
            if log_entry:
                result = await self.collection.update_one(
                    {"_id": project_id, "documents.files.filename": filename},
                    {
                        "$set": update_fields,
                        "$push": {"documents.files.$.logs": log_entry}
                    }
                )
            else:
                result = await self.collection.update_one(
                    {"_id": project_id, "documents.files.filename": filename},
                    {"$set": update_fields}
                )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"更新文件元数据失败 ({project_id}/{filename}): {str(e)}")
            return False

    async def remove_file_metadata(self, project_id: str, filename: str) -> bool:
        """
        删除文件元数据

        Args:
            project_id: Project ID
            filename: 文件名

        Returns:
            bool: 删除是否成功
        """
        try:
            result = await self.collection.update_one(
                {"_id": project_id},
                {
                    "$pull": {"documents.files": {"filename": filename}},
                    "$inc": {
                        "documents.total_count": -1,
                        "stats.total_files": -1
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"删除文件元数据失败 ({project_id}/{filename}): {str(e)}")
            return False

    async def get_file_metadata(self, project_id: str, filename: str) -> Optional[Dict[str, Any]]:
        """
        获取文件元数据

        Args:
            project_id: Project ID
            filename: 文件名

        Returns:
            Optional[Dict]: 文件元数据，不存在返回None
        """
        try:
            project = await self.collection.find_one(
                {"_id": project_id, "documents.files.filename": filename},
                {"documents.files.$": 1}
            )

            if project and "documents" in project and "files" in project["documents"]:
                files = project["documents"]["files"]
                if files:
                    return files[0]

            return None

        except Exception as e:
            logger.error(f"获取文件元数据失败 ({project_id}/{filename}): {str(e)}")
            return None

    async def get_all_files_metadata(self, project_id: str) -> Dict[str, Any]:
        """
        获取所有文件元数据

        Args:
            project_id: Project ID

        Returns:
            Dict: {"total_count": int, "files": List[Dict]}
        """
        try:
            project = await self.collection.find_one(
                {"_id": project_id},
                {"documents": 1}
            )

            if project and "documents" in project:
                return project["documents"]

            return {"total_count": 0, "files": []}

        except Exception as e:
            logger.error(f"获取所有文件元数据失败 ({project_id}): {str(e)}")
            return {"total_count": 0, "files": []}

    async def file_exists(self, project_id: str, filename: str) -> bool:
        """
        检查文件是否存在

        Args:
            project_id: Project ID
            filename: 文件名

        Returns:
            bool: 文件是否存在
        """
        try:
            count = await self.collection.count_documents({
                "_id": project_id,
                "documents.files.filename": filename
            })

            return count > 0

        except Exception as e:
            logger.error(f"检查文件是否存在失败 ({project_id}/{filename}): {str(e)}")
            return False

    async def update_conversation_count(self, project_id: str, increment: int) -> bool:
        """
        更新conversation计数

        Args:
            project_id: Project ID
            increment: 增量（正数增加，负数减少）

        Returns:
            bool: 更新是否成功
        """
        try:
            result = await self.collection.update_one(
                {"_id": project_id},
                {
                    "$inc": {"stats.conversation_count": increment},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"更新conversation计数失败 ({project_id}): {str(e)}")
            return False
