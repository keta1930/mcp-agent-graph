"""
Excel 格式 Agent 导入器
支持 .xlsx 和 .xls 格式
"""
import logging
from typing import List, Dict, Any
import pandas as pd
from io import BytesIO
from .base import BaseImporter

logger = logging.getLogger(__name__)


class ExcelImporter(BaseImporter):
    """Excel 格式导入器"""

    async def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        解析Excel文件内容

        Excel格式要求：
        - 第一行为列名（字段名）
        - 必需列：name, card, model, category
        - 可选列：instruction, max_actions, mcp, system_tools, tags
        - mcp, system_tools, tags 列使用逗号分隔多个值

        Args:
            file_content: Excel文件内容（字节）

        Returns:
            List[Dict[str, Any]]: Agent配置列表

        Raises:
            ValueError: Excel格式错误或解析失败
        """
        try:
            # 读取Excel文件
            df = pd.read_excel(BytesIO(file_content), engine='openpyxl')

            if df.empty:
                raise ValueError("Excel文件为空")

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

                    # 处理列表字段（逗号分隔）
                    if 'mcp' in df.columns and pd.notna(row['mcp']):
                        mcp_str = str(row['mcp']).strip()
                        agent_config['mcp'] = [s.strip() for s in mcp_str.split(',') if s.strip()]
                    else:
                        agent_config['mcp'] = []

                    if 'system_tools' in df.columns and pd.notna(row['system_tools']):
                        tools_str = str(row['system_tools']).strip()
                        agent_config['system_tools'] = [s.strip() for s in tools_str.split(',') if s.strip()]
                    else:
                        agent_config['system_tools'] = []

                    if 'tags' in df.columns and pd.notna(row['tags']):
                        tags_str = str(row['tags']).strip()
                        agent_config['tags'] = [s.strip() for s in tags_str.split(',') if s.strip()]
                    else:
                        agent_config['tags'] = []

                    # 基础验证
                    is_valid, error_msg = self.validate_agent_config(agent_config)
                    if not is_valid:
                        logger.warning(f"跳过第{idx + 2}行（Excel行号）: {error_msg}")
                        continue

                    agents.append(agent_config)

                except Exception as e:
                    logger.warning(f"跳过第{idx + 2}行（Excel行号）: {str(e)}")
                    continue

            if not agents:
                raise ValueError("Excel文件中没有有效的Agent配置")

            logger.info(f"成功解析Excel文件，共{len(agents)}个Agent配置")
            return agents

        except pd.errors.EmptyDataError:
            raise ValueError("Excel文件为空")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"解析Excel文件失败: {str(e)}")

    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名"""
        return [".xlsx", ".xls"]
