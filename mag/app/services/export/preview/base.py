import json
from typing import List, Dict, Any


def _maybe_json_load(value: Any) -> Any:
    """尝试将字符串解析为JSON，其他类型原样返回。"""
    if isinstance(value, str):
        text = value.strip()
        if (text.startswith("{") and text.endswith("}")) or (text.startswith("[") and text.endswith("]")):
            try:
                return json.loads(text)
            except Exception:
                return value
    return value


class BasePreviewReader:
    """基础预览读取器接口"""

    def preview(self, object_name: str, max_records: int = 20) -> List[Dict[str, Any]]:
        """从对象存储读取前 max_records 条记录进行预览"""
        raise NotImplementedError

    @staticmethod
    def normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
        """规范化一行数据，将可能的JSON字符串字段解析为对象。"""
        normalized = {}
        for k, v in row.items():
            normalized[k] = _maybe_json_load(v)
        return normalized