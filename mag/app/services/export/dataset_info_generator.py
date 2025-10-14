import json
from typing import Dict, Any


class DatasetInfoGenerator:
    """dataset_info.json生成器"""

    @staticmethod
    def generate(dataset_name: str, file_name: str, num_samples: int) -> Dict[str, Any]:
        """
        生成dataset_info.json内容

        Args:
            dataset_name: 数据集名称
            file_name: 数据文件名（包含扩展名）
            num_samples: 样本数量

        Returns:
            Dict[str, Any]: dataset_info字典
        """
        return {
            dataset_name: {
                "file_name": file_name,
                "formatting": "sharegpt",
                "num_samples": num_samples,
                "columns": {
                    "messages": "messages"
                },
                "tags": {
                    "role_tag": "role",
                    "content_tag": "content",
                    "user_tag": "user",
                    "observation_tag": "tool",
                    "assistant_tag": "assistant",
                    "function_tag": "function_call",
                    "system_tag": "system"
                }
            }
        }

    @staticmethod
    def save_to_file(dataset_info: Dict[str, Any], file_path: str) -> None:
        """
        保存dataset_info到文件

        Args:
            dataset_info: dataset_info字典
            file_path: 保存路径
        """
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(dataset_info, f, ensure_ascii=False, indent=2)