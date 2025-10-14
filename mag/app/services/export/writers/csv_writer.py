import json
import pandas as pd
from typing import List, Dict, Any
from .base import BaseWriter


class CSVWriter(BaseWriter):
    """CSV文件写入器"""

    def write(self, data: List[Dict[str, Any]], file_path: str) -> None:
        """将数据写入CSV文件"""
        # 将复杂字段序列化为JSON字符串
        processed_data = []
        for item in data:
            processed_item = item.copy()
            # 序列化复杂字段
            if "messages" in processed_item:
                processed_item["messages"] = json.dumps(processed_item["messages"], ensure_ascii=False)
            if "tools" in processed_item:
                processed_item["tools"] = json.dumps(processed_item["tools"], ensure_ascii=False)
            if "ability" in processed_item:
                processed_item["ability"] = json.dumps(processed_item["ability"], ensure_ascii=False)
            processed_data.append(processed_item)

        df = pd.DataFrame(processed_data)
        df.to_csv(file_path, index=False, encoding='utf-8')

    def get_file_extension(self) -> str:
        """获取文件扩展名"""
        return ".csv"