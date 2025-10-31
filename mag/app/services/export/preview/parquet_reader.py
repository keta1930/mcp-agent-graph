import os
import tempfile
import pandas as pd
from typing import List, Dict, Any
from app.infrastructure.storage.object_storage import minio_client
from .base import BasePreviewReader


class ParquetPreviewReader(BasePreviewReader):
    """Parquet 预览读取器"""

    def preview(self, object_name: str, max_records: int = 20) -> List[Dict[str, Any]]:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file = os.path.join(temp_dir, "preview.parquet")
            ok = minio_client.download_file(object_name, temp_file)
            if not ok:
                return []
            try:
                df = pd.read_parquet(temp_file)
                df = df.head(max_records)
            except Exception:
                return []

            records = df.to_dict(orient="records")
            return [self.normalize_row(r) for r in records]