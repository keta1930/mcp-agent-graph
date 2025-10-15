import json
from typing import List, Dict, Any
from app.core.minio_client import minio_client
from .base import BasePreviewReader


class JSONLPreviewReader(BasePreviewReader):
    """JSONL 预览读取器"""

    def preview(self, object_name: str, max_records: int = 20) -> List[Dict[str, Any]]:
        content = minio_client.download_content(object_name)
        if not content:
            return []
        preview_data: List[Dict[str, Any]] = []
        lines = content.strip().split('\n')[:max_records]
        for line in lines:
            try:
                item = json.loads(line)
                preview_data.append(self.normalize_row(item))
            except Exception:
                continue
        return preview_data