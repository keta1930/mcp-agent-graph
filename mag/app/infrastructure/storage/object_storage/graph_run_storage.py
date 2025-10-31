"""
Graph Run Storage Manager - 管理 MinIO 中的 graph run 结果存储
存储路径: mag/graph-run-results/{graph_name}/{graph_run_id}/
"""
import time
import logging
from typing import Optional, List, Dict, Any
from .minio_client import minio_client

logger = logging.getLogger(__name__)


class GraphRunStorageManager:
    """Graph Run 结果存储管理器 - 使用 MinIO 存储"""

    # MinIO 存储路径前缀
    STORAGE_PREFIX = "graph-run-results"

    @staticmethod
    def _get_object_path(graph_name: str, graph_run_id: str, filename: str) -> str:
        """
        构建 MinIO 对象路径

        Args:
            graph_name: 图名称
            graph_run_id: 图运行ID
            filename: 文件名

        Returns:
            str: 完整的对象路径
        """
        return f"{GraphRunStorageManager.STORAGE_PREFIX}/{graph_name}/{graph_run_id}/{filename}"

    @staticmethod
    def _get_run_prefix(graph_name: str, graph_run_id: str) -> str:
        """
        获取特定 graph run 的路径前缀

        Args:
            graph_name: 图名称
            graph_run_id: 图运行ID

        Returns:
            str: 路径前缀
        """
        return f"{GraphRunStorageManager.STORAGE_PREFIX}/{graph_name}/{graph_run_id}/"

    @staticmethod
    def save_node_output(
        graph_name: str,
        graph_run_id: str,
        node_name: str,
        content: str,
        file_ext: str
    ) -> Optional[str]:
        """
        保存节点输出到 MinIO

        Args:
            graph_name: 图名称
            graph_run_id: 图运行ID (conversation_id)
            node_name: 节点名称
            content: 内容
            file_ext: 文件扩展名

        Returns:
            Optional[str]: MinIO 对象路径，失败时返回 None
        """
        try:
            # 创建时间戳（包含微秒）
            now = time.time()
            timestamp = time.strftime("%H%M%S", time.localtime(now))
            microseconds = int((now % 1) * 1000000)
            full_timestamp = f"{timestamp}_{microseconds:06d}"

            # 生成文件名
            filename = f"{node_name}_{full_timestamp}.{file_ext}"

            # 构建对象路径
            object_path = GraphRunStorageManager._get_object_path(
                graph_name, graph_run_id, filename
            )

            # 检查文件是否存在，如果存在则添加计数器
            counter = 1
            original_object_path = object_path
            while minio_client.object_exists(object_path) and counter <= 100:
                filename = f"{node_name}_{full_timestamp}_{counter}.{file_ext}"
                object_path = GraphRunStorageManager._get_object_path(
                    graph_name, graph_run_id, filename
                )
                counter += 1

            if counter > 100:
                logger.error(f"无法生成唯一文件名: {node_name}_{full_timestamp}")
                return None

            # 上传内容到 MinIO
            content_type = GraphRunStorageManager._get_content_type(file_ext)
            success = minio_client.upload_content(
                object_name=object_path,
                content=content,
                content_type=content_type
            )

            if success:
                logger.info(f"保存节点输出到 MinIO: {object_path}")
                return object_path
            else:
                logger.error(f"上传节点输出失败: {object_path}")
                return None

        except Exception as e:
            logger.error(f"保存节点输出时出错: {str(e)}")
            return None

    @staticmethod
    def _get_content_type(file_ext: str) -> str:
        """
        根据文件扩展名获取 content type

        Args:
            file_ext: 文件扩展名

        Returns:
            str: content type
        """
        content_type_map = {
            "txt": "text/plain",
            "md": "text/markdown",
            "json": "application/json",
            "html": "text/html",
            "xml": "application/xml",
            "csv": "text/csv",
            "pdf": "application/pdf",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "svg": "image/svg+xml"
        }
        return content_type_map.get(file_ext.lower(), "application/octet-stream")

    @staticmethod
    def get_run_attachments(graph_name: str, graph_run_id: str) -> List[Dict[str, Any]]:
        """
        获取特定 graph run 的所有附件信息

        Args:
            graph_name: 图名称
            graph_run_id: 图运行ID

        Returns:
            List[Dict[str, Any]]: 附件信息列表
        """
        try:
            prefix = GraphRunStorageManager._get_run_prefix(graph_name, graph_run_id)
            objects = minio_client.list_objects(prefix=prefix, include_metadata=False)

            attachments = []
            for obj in objects:
                # 提取文件名（去除路径前缀）
                object_name = obj["object_name"]
                filename = object_name[len(prefix):]

                attachment_info = {
                    "name": filename,
                    "path": object_name,
                    "size": obj["size"],
                    "type": obj.get("content_type", ""),
                    "modified": obj.get("last_modified", ""),
                    "etag": obj.get("etag", "")
                }
                attachments.append(attachment_info)

            # 按修改时间排序，最新的在前
            attachments.sort(key=lambda x: x.get("modified", ""), reverse=True)

            return attachments

        except Exception as e:
            logger.error(f"获取 graph run 附件时出错: {str(e)}")
            return []

    @staticmethod
    def get_attachment_content(object_path: str) -> Optional[str]:
        """
        获取附件内容

        Args:
            object_path: MinIO 对象路径

        Returns:
            Optional[str]: 附件内容，失败时返回 None
        """
        try:
            content = minio_client.download_content(object_path)
            return content
        except Exception as e:
            logger.error(f"下载附件内容时出错: {str(e)}")
            return None

    @staticmethod
    def delete_run_attachments(graph_name: str, graph_run_id: str) -> bool:
        """
        删除特定 graph run 的所有附件

        Args:
            graph_name: 图名称
            graph_run_id: 图运行ID

        Returns:
            bool: 是否成功删除
        """
        try:
            prefix = GraphRunStorageManager._get_run_prefix(graph_name, graph_run_id)
            objects = minio_client.list_objects(prefix=prefix)

            success = True
            for obj in objects:
                if not minio_client.delete_object(obj["object_name"]):
                    success = False
                    logger.error(f"删除对象失败: {obj['object_name']}")

            if success:
                logger.info(f"成功删除 graph run 附件: {graph_name}/{graph_run_id}")

            return success

        except Exception as e:
            logger.error(f"删除 graph run 附件时出错: {str(e)}")
            return False

    @staticmethod
    def delete_attachment(object_path: str) -> bool:
        """
        删除单个附件

        Args:
            object_path: MinIO 对象路径

        Returns:
            bool: 是否成功删除
        """
        try:
            return minio_client.delete_object(object_path)
        except Exception as e:
            logger.error(f"删除附件时出错: {str(e)}")
            return False


# 创建全局实例
graph_run_storage = GraphRunStorageManager()
