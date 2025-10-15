import os
import tempfile
import pandas as pd
from typing import List, Dict, Any
from app.core.minio_client import minio_client
from .base import BasePreviewReader


class CSVPreviewReader(BasePreviewReader):
    """CSV 预览读取器"""

    def preview(self, object_name: str, max_records: int = 20) -> List[Dict[str, Any]]:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file = os.path.join(temp_dir, "preview.csv")
            ok = minio_client.download_file(object_name, temp_file)
            if not ok:
                return []
            try:
                df = pd.read_csv(temp_file, nrows=max_records)
            except Exception:
                return []

            records = df.to_dict(orient="records")
            return [self.normalize_row(r) for r in records]