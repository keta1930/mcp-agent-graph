"""
JSONL 格式 Agent 导入器
支持每行一个JSON对象的JSONL文件导入
"""
import json
import logging
from typing import List, Dict, Any
from .base import BaseImporter

logger = logging.getLogger(__name__)


class JSONLImporter(BaseImporter):
    """JSONL 格式导入器"""

    async def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        解析JSONL文件内容

        每行一个JSON对象: {"name": "...", "model": "...", ...}

        Args:
            file_content: JSONL文件内容（字节）

        Returns:
            List[Dict[str, Any]]: Agent配置列表

        Raises:
            ValueError: JSONL格式错误或解析失败
        """
        try:
            # 解码为字符串
            content_str = file_content.decode('utf-8')

            # 按行分割
            lines = content_str.strip().split('\n')

            if not lines or (len(lines) == 1 and not lines[0].strip()):
                raise ValueError("JSONL文件为空")

            # 解析每一行
            agents = []
            for line_num, line in enumerate(lines, start=1):
                line = line.strip()

                # 跳过空行
                if not line:
                    continue

                try:
                    # 解析JSON对象
                    agent_config = json.loads(line)

                    if not isinstance(agent_config, dict):
                        logger.warning(f"跳过第{line_num}行: 不是JSON对象")
                        continue

                    # 基础验证
                    is_valid, error_msg = self.validate_agent_config(agent_config)
                    if not is_valid:
                        logger.warning(f"跳过第{line_num}行: {error_msg}")
                        continue

                    # 设置默认值
                    agent_config.setdefault("instruction", "")
                    agent_config.setdefault("max_actions", 50)
                    agent_config.setdefault("mcp", [])
                    agent_config.setdefault("system_tools", [])
                    agent_config.setdefault("tags", [])

                    agents.append(agent_config)

                except json.JSONDecodeError as e:
                    logger.warning(f"跳过第{line_num}行: JSON格式错误 - {str(e)}")
                    continue

            if not agents:
                raise ValueError("文件中没有有效的Agent配置")

            logger.info(f"成功解析JSONL文件，共{len(agents)}个Agent配置")
            return agents

        except UnicodeDecodeError as e:
            raise ValueError(f"文件编码错误，请使用UTF-8编码: {str(e)}")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"解析JSONL文件失败: {str(e)}")

    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名"""
        return [".jsonl"]
