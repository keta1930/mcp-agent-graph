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

    @staticmethod
    def generate(
        user_id: str,
        file_format: str,
        results: List[Dict[str, Any]],
        import_time: datetime = None
    ) -> str:
        """
        生成Markdown格式的导入报告

        Args:
            user_id: 用户ID
            file_format: 文件格式
            results: 导入结果列表
            import_time: 导入时间

        Returns:
            str: Markdown格式的报告内容
        """
        if import_time is None:
            import_time = datetime.now()

        # 统计结果
        total = len(results)
        created = sum(1 for r in results if r["status"] == "created")
        updated = sum(1 for r in results if r["status"] == "updated")
        failed = sum(1 for r in results if r["status"] == "failed")

        # 生成报告
        lines = [
            "# Agent 导入报告",
            "",
            f"**导入时间**: {import_time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"**用户ID**: {user_id}",
            f"**文件格式**: {file_format}",
            f"**总数量**: {total}",
            "",
            "## 导入结果统计",
            f"- ✅ 成功创建: {created}",
            f"- 🔄 成功更新: {updated}",
            f"- ❌ 失败: {failed}",
            "",
            "---",
            "",
            "## 详细结果",
            ""
        ]

        # 成功创建的Agent
        if created > 0:
            lines.append(f"### ✅ 成功创建 ({created})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "created":
                    agent_config = result.get("agent_config", {})
                    lines.append(f"{idx}. **{result['agent_name']}**")
                    lines.append(f"   - 分类: {agent_config.get('category', 'N/A')}")
                    lines.append(f"   - 模型: {agent_config.get('model', 'N/A')}")
                    tags = agent_config.get('tags', [])
                    if tags:
                        lines.append(f"   - 标签: {', '.join(tags)}")
                    lines.append("")
                    idx += 1
            lines.append("")

        # 成功更新的Agent
        if updated > 0:
            lines.append(f"### 🔄 成功更新 ({updated})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "updated":
                    agent_config = result.get("agent_config", {})
                    lines.append(f"{idx}. **{result['agent_name']}**")
                    lines.append(f"   - 分类: {agent_config.get('category', 'N/A')}")
                    lines.append(f"   - 模型: {agent_config.get('model', 'N/A')}")
                    tags = agent_config.get('tags', [])
                    if tags:
                        lines.append(f"   - 标签: {', '.join(tags)}")
                    if result.get("backup_name"):
                        lines.append(f"   - 备份Agent名称: {result['backup_name']}")
                    lines.append("")
                    idx += 1
            lines.append("")

        # 失败的Agent
        if failed > 0:
            lines.append(f"### ❌ 失败 ({failed})")
            lines.append("")
            idx = 1
            for result in results:
                if result["status"] == "failed":
                    agent_name = result.get("agent_name", "未知")
                    error = result.get("error", "未知错误")
                    lines.append(f"{idx}. **{agent_name}**")
                    lines.append(f"   - 错误: {error}")
                    lines.append("")
                    idx += 1
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("*报告生成时间: " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "*")

        return "\n".join(lines)
