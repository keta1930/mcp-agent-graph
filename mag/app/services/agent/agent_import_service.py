"""
Agent 导入服务
使用工厂模式支持多种格式的Agent导入
"""
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from app.services.agent.importers import JSONImporter, JSONLImporter, ExcelImporter, ParquetImporter
from app.services.agent.import_report_generator import ImportReportGenerator
from app.services.agent.agent_service import agent_service
from app.infrastructure.database.mongodb import mongodb_client

logger = logging.getLogger(__name__)


class AgentImportService:
    """Agent 导入服务 - 工厂模式"""

    def __init__(self):
        """初始化导入服务，注册各种格式的导入器"""
        self.importers = {
            ".json": JSONImporter(),
            ".jsonl": JSONLImporter(),
            ".xlsx": ExcelImporter(),
            ".xls": ExcelImporter(),
            ".parquet": ParquetImporter(),
        }

    def _get_importer(self, file_extension: str, language: str = "zh"):
        """
        根据文件扩展名获取对应的导入器

        Args:
            file_extension: 文件扩展名（如 ".json"）
            language: 语言代码（"zh" 或 "en"），用于错误消息

        Returns:
            导入器实例

        Raises:
            ValueError: 不支持的文件格式
        """
        file_extension = file_extension.lower()
        if file_extension not in self.importers:
            supported = ", ".join(self.importers.keys())
            if language == "zh":
                raise ValueError(f"不支持的文件格式: {file_extension}，支持的格式: {supported}")
            else:
                raise ValueError(f"Unsupported file format: {file_extension}, supported formats: {supported}")

        return self.importers[file_extension]

    async def import_agents(
        self,
        file_content: bytes,
        file_extension: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        导入Agent配置

        Args:
            file_content: 文件内容（字节）
            file_extension: 文件扩展名（如 ".json"）
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 导入结果
            {
                "success": bool,
                "message": str,
                "results": List[Dict],  # 每个Agent的导入结果
                "statistics": {
                    "total": int,
                    "created": int,
                    "updated": int,
                    "failed": int
                }
            }
        """
        import_time = datetime.now()
        results = []

        try:
            # 1. 获取用户语言设置（用于所有错误消息和报告）
            user_language = await mongodb_client.user_repository.get_user_language(user_id)

            # 2. 获取对应的导入器
            importer = self._get_importer(file_extension, user_language)

            # 3. 解析文件内容
            try:
                agent_configs = await importer.parse(file_content)
            except ValueError as e:
                error_msg = f"文件解析失败: {str(e)}" if user_language == "zh" else f"File parsing failed: {str(e)}"
                return {
                    "success": False,
                    "message": error_msg,
                    "results": [],
                    "statistics": {
                        "total": 0,
                        "created": 0,
                        "updated": 0,
                        "failed": 0
                    }
                }

            # 4. 处理每个Agent配置
            for agent_config in agent_configs:
                result = await self._import_single_agent(agent_config, user_id)
                results.append(result)

            # 5. 统计结果
            statistics = {
                "total": len(results),
                "created": sum(1 for r in results if r["status"] == "created"),
                "updated": sum(1 for r in results if r["status"] == "updated"),
                "failed": sum(1 for r in results if r["status"] == "failed")
            }

            # 6. 生成报告（user_language已在步骤2获取）
            report_markdown = ImportReportGenerator.generate(
                user_id=user_id,
                file_format=file_extension.lstrip('.'),
                results=results,
                import_time=import_time,
                language=user_language
            )

            # 生成多语言消息
            if user_language == "zh":
                success_message = f"导入完成: 创建{statistics['created']}个, 更新{statistics['updated']}个, 失败{statistics['failed']}个"
            else:
                success_message = f"Import completed: {statistics['created']} created, {statistics['updated']} updated, {statistics['failed']} failed"

            return {
                "success": True,
                "message": success_message,
                "results": results,
                "statistics": statistics,
                "report_markdown": report_markdown
            }

        except Exception as e:
            logger.error(f"导入Agent失败: {str(e)}")
            # 尝试获取用户语言（可能在异常前未获取）
            try:
                user_language = await mongodb_client.user_repository.get_user_language(user_id)
            except:
                user_language = "zh"  # 默认中文

            error_msg = f"导入失败: {str(e)}" if user_language == "zh" else f"Import failed: {str(e)}"

            return {
                "success": False,
                "message": error_msg,
                "results": results,
                "statistics": {
                    "total": len(results),
                    "created": sum(1 for r in results if r["status"] == "created"),
                    "updated": sum(1 for r in results if r["status"] == "updated"),
                    "failed": sum(1 for r in results if r["status"] == "failed")
                }
            }

    async def _import_single_agent(
        self,
        agent_config: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        导入单个Agent

        Args:
            agent_config: Agent配置
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 导入结果
            {
                "agent_name": str,
                "status": str,  # "created", "updated", "failed"
                "error": str,   # 仅在失败时存在
                "backup_name": str,  # 仅在更新时存在（备份Agent的名称）
                "agent_config": Dict  # Agent配置
            }
        """
        agent_name = agent_config.get("name", "未知")

        try:
            # 获取用户语言设置（用于错误消息）
            user_language = await mongodb_client.user_repository.get_user_language(user_id)

            # 1. 深度验证Agent配置（包括模型、MCP服务器、系统工具等）
            is_valid, error_msg = await agent_service.validate_agent_config(
                agent_config, user_id
            )

            if not is_valid:
                return {
                    "agent_name": agent_name,
                    "status": "failed",
                    "error": error_msg,
                    "agent_config": agent_config
                }

            # 2. 检查Agent是否已存在
            existing_agent = await mongodb_client.agent_repository.get_agent(
                agent_name, user_id
            )

            if existing_agent:
                # Agent已存在，执行更新操作
                # 2.1 备份原Agent（创建带时间戳的备份版本）
                backup_name = await self._backup_agent(existing_agent, user_id)

                # 2.2 更新Agent
                update_result = await agent_service.update_agent(
                    agent_name=agent_name,
                    agent_config=agent_config,
                    user_id=user_id
                )

                if update_result.get("success"):
                    return {
                        "agent_name": agent_name,
                        "status": "updated",
                        "backup_name": backup_name,
                        "agent_config": agent_config
                    }
                else:
                    default_error = "Update failed" if user_language == "en" else "更新失败"
                    return {
                        "agent_name": agent_name,
                        "status": "failed",
                        "error": update_result.get("error", default_error),
                        "agent_config": agent_config
                    }
            else:
                # Agent不存在，执行创建操作
                create_result = await agent_service.create_agent(
                    agent_config=agent_config,
                    user_id=user_id
                )

                if create_result.get("success"):
                    return {
                        "agent_name": agent_name,
                        "status": "created",
                        "agent_config": agent_config
                    }
                else:
                    default_error = "Creation failed" if user_language == "en" else "创建失败"
                    return {
                        "agent_name": agent_name,
                        "status": "failed",
                        "error": create_result.get("error", default_error),
                        "agent_config": agent_config
                    }

        except Exception as e:
            logger.error(f"导入Agent失败 ({agent_name}): {str(e)}")
            return {
                "agent_name": agent_name,
                "status": "failed",
                "error": str(e),
                "agent_config": agent_config
            }

    async def _backup_agent(
        self,
        agent_doc: Dict[str, Any],
        user_id: str
    ) -> str:
        """
        备份Agent配置到MongoDB（创建带时间戳的备份版本）

        Args:
            agent_doc: Agent文档
            user_id: 用户ID

        Returns:
            str: 备份Agent名称
        """
        try:
            # 获取用户语言设置
            user_language = await mongodb_client.user_repository.get_user_language(user_id)

            original_name = agent_doc.get("name")
            agent_config = agent_doc.get("agent_config", {})
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            # 备份Agent名称: {original_name}_backup_{timestamp}
            backup_name = f"{original_name}_backup_{timestamp}"

            # 创建备份Agent配置（复制原配置并修改名称）
            backup_config = agent_config.copy()
            backup_config["name"] = backup_name

            # 在card中添加备份说明（根据用户语言）
            original_card = backup_config.get("card", "")
            backup_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            if user_language == "zh":
                backup_prefix = f"[备份于 {backup_time}] "
            else:
                backup_prefix = f"[Backed up at {backup_time}] "
            backup_config["card"] = backup_prefix + original_card
            
            # 在tags中添加backup标记
            backup_tags = backup_config.get("tags", [])
            if "backup" not in backup_tags:
                backup_tags.append("backup")
            backup_config["tags"] = backup_tags

            # 创建备份Agent
            backup_result = await agent_service.create_agent(
                agent_config=backup_config,
                user_id=user_id
            )

            if backup_result.get("success"):
                logger.info(f"成功备份Agent: {original_name} -> {backup_name}")
                return backup_name
            else:
                error_msg = backup_result.get("error", "Unknown error" if user_language == "en" else "未知错误")
                logger.error(f"备份Agent失败: {error_msg}")
                backup_failed_msg = "Backup failed" if user_language == "en" else "备份失败"
                return f"{backup_failed_msg}: {error_msg}"

        except Exception as e:
            logger.error(f"备份Agent失败: {str(e)}")
            # 备份失败不应阻止导入流程
            # 获取用户语言（如果之前获取失败）
            try:
                user_language = await mongodb_client.user_repository.get_user_language(user_id)
            except:
                user_language = "zh"
            backup_failed_msg = "Backup failed" if user_language == "en" else "备份失败"
            return f"{backup_failed_msg}: {str(e)}"


# 全局实例
agent_import_service = AgentImportService()
