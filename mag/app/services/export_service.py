import os
import tempfile
import zipfile
import logging
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.infrastructure.database.mongodb import mongodb_client
from app.infrastructure.storage.object_storage import minio_client
from .export.formatters.standard import StandardFormatter
from .export.writers.jsonl_writer import JSONLWriter
from .export.writers.parquet_writer import ParquetWriter
from .export.writers.csv_writer import CSVWriter
from .export.preview.jsonl_reader import JSONLPreviewReader
from .export.preview.parquet_reader import ParquetPreviewReader
from .export.preview.csv_reader import CSVPreviewReader
from .export.dataset_info_generator import DatasetInfoGenerator

logger = logging.getLogger(__name__)


class ExportService:
    """对话数据导出服务"""

    def __init__(self):
        # 注册格式化器
        self.formatters = {
            "standard": StandardFormatter()
        }

        # 注册写入器
        self.writers = {
            "jsonl": JSONLWriter(),
            "parquet": ParquetWriter(),
            "csv": CSVWriter()
        }

        # 注册预览读取器
        self.preview_readers = {
            "jsonl": JSONLPreviewReader(),
            "parquet": ParquetPreviewReader(),
            "csv": CSVPreviewReader()
        }

    def _get_storage_path(self, data_format: str, dataset_name: str, user_id: str = "default_user") -> str:
        """根据数据格式获取存储路径（包含user_id隔离）"""
        return f"conversation_export/{user_id}/{data_format}/{dataset_name}/"

    def _get_base_storage_path(self, data_format: str, user_id: str = "default_user") -> str:
        """根据数据格式获取基础存储路径（包含user_id隔离）"""
        return f"conversation_export/{user_id}/{data_format}/"

    async def export_conversations(self,
                                   dataset_name: str,
                                   file_name: str,
                                   conversation_ids: List[str],
                                   file_format: str = "jsonl",
                                   data_format: str = "standard",
                                   user_id: str = "default_user") -> Dict[str, Any]:
        """
        导出对话数据

        Args:
            dataset_name: 数据集名称
            file_name: 文件名称（不含扩展名）
            conversation_ids: 会话ID列表
            file_format: 文件格式（jsonl/parquet/csv）
            data_format: 数据格式（standard）
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 导出结果
        """
        try:
            # 验证参数
            if data_format not in self.formatters:
                return {"success": False, "message": f"不支持的数据格式: {data_format}"}

            if file_format not in self.writers:
                return {"success": False, "message": f"不支持的文件格式: {file_format}"}

            # 获取对话数据
            conversations = await self._get_conversations_data(conversation_ids)
            if not conversations:
                return {"success": False, "message": "未找到有效的对话数据"}

            # 格式化数据
            formatter = self.formatters[data_format]
            formatted_data = formatter.format(conversations)

            if not formatted_data:
                return {"success": False, "message": "格式化后没有有效数据"}

            # 写入文件并上传到MinIO
            writer = self.writers[file_format]
            full_file_name = file_name + writer.get_file_extension()

            with tempfile.TemporaryDirectory() as temp_dir:
                # 写入数据文件
                data_file_path = os.path.join(temp_dir, full_file_name)
                writer.write(formatted_data, data_file_path)

                # 生成dataset_info.json
                dataset_info = DatasetInfoGenerator.generate(
                    dataset_name, full_file_name, len(formatted_data)
                )
                dataset_info_path = os.path.join(temp_dir, "dataset_info.json")
                DatasetInfoGenerator.save_to_file(dataset_info, dataset_info_path)

                # 上传到MinIO
                storage_path = self._get_storage_path(data_format, dataset_name, user_id)

                # 上传数据文件
                data_object_name = storage_path + full_file_name
                minio_client.upload_file(data_object_name, data_file_path)

                # 上传dataset_info.json
                info_object_name = storage_path + "dataset_info.json"
                minio_client.upload_file(info_object_name, dataset_info_path)

                # 获取文件大小
                file_size = self._format_file_size(os.path.getsize(data_file_path))

            # 返回结果
            return {
                "success": True,
                "message": f"成功导出 {len(formatted_data)} 条数据",
                "dataset_name": dataset_name,
                "preview_data": formatted_data[:20],  # 前20条预览
                "total_records": len(formatted_data),
                "file_info": {
                    "file_format": file_format,
                    "file_size": file_size
                }
            }

        except Exception as e:
            logger.error(f"导出对话数据失败: {str(e)}")
            return {"success": False, "message": f"导出失败: {str(e)}"}

    async def download_dataset(self, dataset_name: str, data_format: str = "standard",
                             user_id: str = "default_user") -> Optional[str]:
        """
        下载数据集为ZIP文件

        Args:
            dataset_name: 数据集名称
            data_format: 数据格式
            user_id: 用户ID

        Returns:
            Optional[str]: 临时ZIP文件路径，失败返回None
        """
        try:
            storage_path = self._get_storage_path(data_format, dataset_name, user_id)

            # 列出该路径下的所有文件
            objects = minio_client.list_objects(storage_path)
            if not objects:
                return None

            # 创建临时ZIP文件
            temp_dir = tempfile.mkdtemp()
            zip_path = os.path.join(temp_dir, f"{dataset_name}.zip")

            with zipfile.ZipFile(zip_path, 'w') as zip_file:
                for obj in objects:
                    object_name = obj["object_name"]
                    file_name = object_name.replace(storage_path, "")

                    # 下载文件到临时位置
                    temp_file_path = os.path.join(temp_dir, file_name)
                    if minio_client.download_file(object_name, temp_file_path):
                        zip_file.write(temp_file_path, file_name)
                        os.remove(temp_file_path)

            return zip_path

        except Exception as e:
            logger.error(f"下载数据集失败: {str(e)}")
            return None

    async def preview_dataset(self, dataset_name: str, data_format: str = "standard",
                            user_id: str = "default_user") -> Dict[str, Any]:
        """
        预览数据集

        Args:
            dataset_name: 数据集名称
            data_format: 数据格式
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 预览结果
        """
        try:
            storage_path = self._get_storage_path(data_format, dataset_name, user_id)

            # 获取dataset_info.json
            info_object_name = storage_path + "dataset_info.json"
            info_content = minio_client.download_content(info_object_name)
            if not info_content:
                return {"success": False, "message": "未找到数据集信息"}

            dataset_info = json.loads(info_content)

            # 查找数据文件：优先从dataset_info中获取文件名
            target_file_name = dataset_info.get(dataset_name, {}).get("file_name")
            data_file = None
            if target_file_name:
                candidate = storage_path + target_file_name
                if minio_client.object_exists(candidate):
                    data_file = candidate
            if not data_file:
                # 回退：遍历目录选择第一个非dataset_info.json文件
                objects = minio_client.list_objects(storage_path)
                for obj in objects:
                    object_name = obj["object_name"]
                    if not object_name.endswith("dataset_info.json"):
                        data_file = object_name
                        break

            if not data_file:
                return {"success": False, "message": "未找到数据文件"}

            # 根据文件扩展名选择预览读取器
            _, ext = os.path.splitext(data_file)
            ext = ext.lower()
            ext_map = {
                ".jsonl": "jsonl",
                ".parquet": "parquet",
                ".csv": "csv",
            }
            reader_key = ext_map.get(ext)
            if not reader_key or reader_key not in self.preview_readers:
                return {"success": False, "message": f"不支持的预览格式: {ext}"}

            reader = self.preview_readers[reader_key]
            preview_data = reader.preview(data_file, max_records=20)

            return {
                "success": True,
                "dataset_name": dataset_name,
                "dataset_info": dataset_info,
                "preview_data": preview_data,
                "total_records": dataset_info.get(dataset_name, {}).get("num_samples", 0)
            }

        except Exception as e:
            logger.error(f"预览数据集失败: {str(e)}")
            return {"success": False, "message": f"预览失败: {str(e)}"}

    async def delete_dataset(self, dataset_name: str, data_format: str = "standard",
                           user_id: str = "default_user") -> Dict[str, Any]:
        """
        删除数据集

        Args:
            dataset_name: 数据集名称
            data_format: 数据格式
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            storage_path = self._get_storage_path(data_format, dataset_name, user_id)

            # 列出并删除所有文件
            objects = minio_client.list_objects(storage_path)
            deleted_count = 0

            for obj in objects:
                object_name = obj["object_name"]
                if minio_client.delete_object(object_name):
                    deleted_count += 1

            if deleted_count > 0:
                return {
                    "success": True,
                    "message": f"成功删除数据集 {dataset_name}",
                    "dataset_name": dataset_name
                }
            else:
                return {"success": False, "message": "数据集不存在或删除失败"}

        except Exception as e:
            logger.error(f"删除数据集失败: {str(e)}")
            return {"success": False, "message": f"删除失败: {str(e)}"}

    async def list_datasets(self, user_id: str = "default_user") -> Dict[str, Any]:
        """
        列出用户的所有格式的所有数据集

        Args:
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 数据集列表
        """
        try:
            base_path = f"conversation_export/{user_id}/"
            objects = minio_client.list_objects(base_path)

            # 提取数据集信息 (data_format/dataset_name)
            dataset_info = {}
            for obj in objects:
                object_name = obj["object_name"]
                # 提取相对路径
                relative_path = object_name.replace(base_path, "")
                path_parts = relative_path.split("/")

                if len(path_parts) >= 2:
                    data_format = path_parts[0]
                    dataset_name = path_parts[1]
                    key = f"{data_format}/{dataset_name}"

                    if key not in dataset_info:
                        dataset_info[key] = {
                            "data_format": data_format,
                            "dataset_name": dataset_name
                        }

            # 获取创建时间=
            exports = []
            for key, info in dataset_info.items():
                data_format = info["data_format"]
                dataset_name = info["dataset_name"]
                info_object_name = f"{base_path}{data_format}/{dataset_name}/dataset_info.json"
                obj_info = minio_client.get_object_info(info_object_name)
                if obj_info:
                    utc_time_str = obj_info.get("last_modified", "")
                    if utc_time_str:
                        # UTC时间转服务器本地时间
                        utc_dt = datetime.fromisoformat(utc_time_str.replace('Z', '+00:00'))
                        local_dt = utc_dt.astimezone()  # 获取本地时区
                        local_time_str = local_dt.strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        local_time_str = ""

                    exports.append({
                        "dataset_name": dataset_name,
                        "data_format": data_format,
                        "created_at": local_time_str
                    })

            # 按创建时间排序
            exports.sort(key=lambda x: x["created_at"], reverse=True)

            return {
                "success": True,
                "exports": exports
            }

        except Exception as e:
            logger.error(f"列出数据集失败: {str(e)}")
            return {"success": False, "exports": []}

    async def _get_conversations_data(self, conversation_ids: List[str]) -> List[Dict[str, Any]]:
        """获取对话数据"""
        conversations = []

        for conv_id in conversation_ids:
            try:
                conversation = await mongodb_client.get_conversation_with_messages(conv_id)
                if conversation:
                    conversations.append(conversation)
            except Exception as e:
                logger.warning(f"获取对话 {conv_id} 失败: {str(e)}")
                continue

        return conversations

    def _format_file_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 ** 2:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 ** 3:
            return f"{size_bytes / (1024 ** 2):.1f} MB"
        else:
            return f"{size_bytes / (1024 ** 3):.1f} GB"


# 全局实例
export_service = ExportService()