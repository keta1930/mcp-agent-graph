import json
from typing import List, Dict, Any
from .base import BaseWriter


class JSONLWriter(BaseWriter):
    """JSONL文件写入器"""

    def write(self, data: List[Dict[str, Any]], file_path: str) -> None:
        """将数据写入JSONL文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            for item in data:
                json_line = json.dumps(item, ensure_ascii=False)
                f.write(json_line + '\n')

    def get_file_extension(self) -> str:
        """获取文件扩展名"""
        return ".jsonl"