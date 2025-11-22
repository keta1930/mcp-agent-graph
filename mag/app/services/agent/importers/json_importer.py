"""
JSON 格式 Agent 导入器
支持单个或多个Agent的JSON文件导入
"""
import json
import logging
from typing import List, Dict, Any
from .base import BaseImporter

logger = logging.getLogger(__name__)


class JSONImporter(BaseImporter):
    """JSON 格式导入器"""

    async def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        解析JSON文件内容

        支持两种格式：
        1. 单个Agent对象: {"name": "...", "model": "...", ...}
        2. Agent数组: [{"name": "...", ...}, {"name": "...", ...}]

        Args:
            file_content: JSON文件内容（字节）

        Returns:
            List[Dict[str, Any]]: Agent配置列表

        Raises:
            ValueError: JSON格式错误或解析失败
        """
        try:
            # 解码为字符串
            content_str = file_content.decode('utf-8')

            # 解析JSON
            data = json.loads(content_str)

            # 处理单个对象或数组
            if isinstance(data, dict):
                # 单个Agent对象
                agents = [data]
            elif isinstance(data, list):
                # Agent数组
                agents = data
            else:
                raise ValueError(f"不支持的JSON格式，期望对象或数组，实际: {type(data)}")

            # 验证每个Agent配置
            validated_agents = []
            for idx, agent_config in enumerate(agents):
                if not isinstance(agent_config, dict):
                    logger.warning(f"跳过无效的Agent配置（索引{idx}）: 不是字典类型")
                    continue

                # 基础验证
                is_valid, error_msg = self.validate_agent_config(agent_config)
                if not is_valid:
                    logger.warning(f"跳过无效的Agent配置（索引{idx}）: {error_msg}")
                    continue

                # 设置默认值
                agent_config.setdefault("instruction", "")
                agent_config.setdefault("max_actions", 50)
                agent_config.setdefault("mcp", [])
                agent_config.setdefault("system_tools", [])
                agent_config.setdefault("tags", [])

                validated_agents.append(agent_config)

            if not validated_agents:
                raise ValueError("文件中没有有效的Agent配置")

            logger.info(f"成功解析JSON文件，共{len(validated_agents)}个Agent配置")
            return validated_agents

        except json.JSONDecodeError as e:
            raise ValueError(f"JSON格式错误: {str(e)}")
        except UnicodeDecodeError as e:
            raise ValueError(f"文件编码错误，请使用UTF-8编码: {str(e)}")
        except Exception as e:
            raise ValueError(f"解析JSON文件失败: {str(e)}")

    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名"""
        return [".json"]
