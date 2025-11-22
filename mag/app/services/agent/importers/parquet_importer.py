"""
Parquet 格式 Agent 导入器
支持 .parquet 格式
"""
import logging
from typing import List, Dict, Any
import pandas as pd
from io import BytesIO
from .base import BaseImporter

logger = logging.getLogger(__name__)


class ParquetImporter(BaseImporter):
    """Parquet 格式导入器"""

    async def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        解析Parquet文件内容

        Parquet格式要求：
        - 必需列：name, card, model, category
        - 可选列：instruction, max_actions, mcp, system_tools, tags
        - mcp, system_tools, tags 列可以是字符串（逗号分隔）或列表

        Args:
            file_content: Parquet文件内容（字节）

        Returns:
            List[Dict[str, Any]]: Agent配置列表

        Raises:
            ValueError: Parquet格式错误或解析失败
        """
        try:
            # 读取Parquet文件
            df = pd.read_parquet(BytesIO(file_content))

            if df.empty:
                raise ValueError("Parquet文件为空")

            # 验证必需列
            required_columns = ['name', 'card', 'model', 'category']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"缺少必需列: {', '.join(missing_columns)}")

            # 解析每一行
            agents = []
            for idx, row in df.iterrows():
                try:
                    # 跳过空行
                    if pd.isna(row['name']) or not str(row['name']).strip():
                        continue

                    # 构建Agent配置
                    agent_config = {
                        'name': str(row['name']).strip(),
                        'card': str(row['card']).strip() if pd.notna(row['card']) else '',
                        'model': str(row['model']).strip() if pd.notna(row['model']) else '',
                        'category': str(row['category']).strip() if pd.notna(row['category']) else '',
                    }

                    # 可选字段
                    if 'instruction' in df.columns and pd.notna(row['instruction']):
                        agent_config['instruction'] = str(row['instruction']).strip()
                    else:
                        agent_config['instruction'] = ''

                    if 'max_actions' in df.columns and pd.notna(row['max_actions']):
                        try:
                            agent_config['max_actions'] = int(row['max_actions'])
                        except (ValueError, TypeError):
                            agent_config['max_actions'] = 50
                    else:
                        agent_config['max_actions'] = 50

                    # 处理列表字段
                    for field in ['mcp', 'system_tools', 'tags']:
                        if field in df.columns and pd.notna(row[field]):
                            value = row[field]
                            if isinstance(value, list):
                                # 已经是列表
                                agent_config[field] = [str(v).strip() for v in value if v]
                            elif isinstance(value, str):
                                # 字符串，按逗号分隔
                                agent_config[field] = [s.strip() for s in value.split(',') if s.strip()]
                            else:
                                agent_config[field] = []
                        else:
                            agent_config[field] = []

                    # 基础验证
                    is_valid, error_msg = self.validate_agent_config(agent_config)
                    if not is_valid:
                        logger.warning(f"跳过第{idx + 1}行: {error_msg}")
                        continue

                    agents.append(agent_config)

                except Exception as e:
                    logger.warning(f"跳过第{idx + 1}行: {str(e)}")
                    continue

            if not agents:
                raise ValueError("Parquet文件中没有有效的Agent配置")

            logger.info(f"成功解析Parquet文件，共{len(agents)}个Agent配置")
            return agents

        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"解析Parquet文件失败: {str(e)}")

    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名"""
        return [".parquet"]
