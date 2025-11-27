"""
Agent 导入报告生成器
生成详细的导入结果报告（Markdown格式）
"""
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ImportReportGenerator:
    """导入报告生成器"""

    # 中文文案
    TEXTS_ZH = {
        "title": "# Agent 导入报告",
        "import_time": "**导入时间**",
        "user_id": "**用户ID**",
        "file_format": "**文件格式**",
        "total_count": "**总数量**",
        "statistics_title": "## 导入结果统计",
        "created": "✅ 成功创建",
        "updated": "🔄 成功更新",
        "failed": "❌ 失败",
        "details_title": "## 详细结果",
        "category": "分类",
        "model": "模型",
        "tags": "标签",
        "backup_name": "备份Agent名称",
        "error": "错误",
        "report_time": "*报告生成时间: ",
        "unknown": "未知",
        "unknown_error": "未知错误",
    }

    # 英文文案
    TEXTS_EN = {
        "title": "# Agent Import Report",
        "import_time": "**Import Time**",
        "user_id": "**User ID**",
        "file_format": "**File Format**",
        "total_count": "**Total Count**",
        "statistics_title": "## Import Statistics",
        "created": "✅ Successfully Created",
        "updated": "🔄 Successfully Updated",
        "failed": "❌ Failed",
        "details_title": "## Detailed Results",
        "category": "Category",
        "model": "Model",
        "tags": "Tags",
        "backup_name": "Backup Agent Name",
        "error": "Error",
        "report_time": "*Report generated at: ",
        "unknown": "Unknown",
        "unknown_error": "Unknown error",
    }

    @staticmethod
    def generate(
        user_id: str,
        file_format: str,
        results: List[Dict[str, Any]],
        import_time: datetime = None,
        language: str = "zh"
    ) -> str:
        """
        生成Markdown格式的导入报告

        Args:
            user_id: 用户ID
            file_format: 文件格式
            results: 导入结果列表
            import_time: 导入时间
            language: 语言代码（"zh" 或 "en"），默认为中文

        Returns:
            str: Markdown格式的报告内容
        """
        if import_time is None:
            import_time = datetime.now()

        # 选择对应语言的文案
        texts = ImportReportGenerator.TEXTS_ZH if language == "zh" else ImportReportGenerator.TEXTS_EN

        # 统计结果
        total = len(results)
        created = sum(1 for r in results if r["status"] == "created")
        updated = sum(1 for r in results if r["status"] == "updated")
        failed = sum(1 for r in results if r["status"] == "failed")

        # 生成报告
        lines = [
            texts["title"],
            "",
            f"{texts['import_time']}: {import_time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"{texts['user_id']}: {user_id}",
            f"{texts['file_format']}: {file_format}",
            f"{texts['total_count']}: {total}",
            "",
            texts["statistics_title"],
            f"- {texts['created']}: {created}",
            f"- {texts['updated']}: {updated}",
            f"- {texts['failed']}: {failed}",
            "",
            "---",
            "",
            texts["details_title"],
            ""
        ]

        # 成功创建的Agent
        if created > 0:
            lines.append(f"### {texts['created']} ({created})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "created":
                    agent_config = result.get("agent_config", {})
                    lines.append(f"{idx}. **{result['agent_name']}**")
                    lines.append(f"   - {texts['category']}: {agent_config.get('category', 'N/A')}")
                    lines.append(f"   - {texts['model']}: {agent_config.get('model', 'N/A')}")
                    tags = agent_config.get('tags', [])
                    if tags:
                        lines.append(f"   - {texts['tags']}: {', '.join(tags)}")
                    lines.append("")
                    idx += 1
            lines.append("")

        # 成功更新的Agent
        if updated > 0:
            lines.append(f"### {texts['updated']} ({updated})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "updated":
                    agent_config = result.get("agent_config", {})
                    lines.append(f"{idx}. **{result['agent_name']}**")
                    lines.append(f"   - {texts['category']}: {agent_config.get('category', 'N/A')}")
                    lines.append(f"   - {texts['model']}: {agent_config.get('model', 'N/A')}")
                    tags = agent_config.get('tags', [])
                    if tags:
                        lines.append(f"   - {texts['tags']}: {', '.join(tags)}")
                    if result.get("backup_name"):
                        lines.append(f"   - {texts['backup_name']}: {result['backup_name']}")
                    lines.append("")
                    idx += 1
            lines.append("")

        # 失败的Agent
        if failed > 0:
            lines.append(f"### {texts['failed']} ({failed})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "failed":
                    agent_name = result.get("agent_name", texts["unknown"])
                    error = result.get("error", texts["unknown_error"])
                    lines.append(f"{idx}. **{agent_name}**")
                    lines.append(f"   - {texts['error']}: {error}")
                    lines.append("")
                    idx += 1
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append(texts["report_time"] + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "*")

        return "\n".join(lines)
