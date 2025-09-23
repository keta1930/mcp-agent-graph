import re
from typing import Dict, List, Any, Tuple


class GraphPromptTemplate:
    """Graph Prompt模板处理器 - 支持{{node:count}}语法"""

    # 占位符正则表达式：匹配 {{node}} 或 {{node:count}}
    PLACEHOLDER_PATTERN = r'\{\{([^}]+)\}\}'

    def parse_placeholder(self, placeholder: str) -> Tuple[str, str]:
        """
        解析占位符内容

        Args:
            placeholder: 占位符内容（不含大括号），如 "node" 或 "node:3" 或 "node:all"

        Returns:
            (node_name, count_mode): 节点名和数量模式
        """
        # 分割节点名和数量模式
        if ":" in placeholder:
            parts = placeholder.split(":", 1)
            node_name = parts[0].strip()
            count_mode = parts[1].strip()
        else:
            node_name = placeholder.strip()
            count_mode = "1"  # 默认获取最新1条

        # 验证数量模式
        if count_mode != "all":
            try:
                count = int(count_mode)
                if count <= 0:
                    count_mode = "1"  # 无效数字时fallback到1
                else:
                    count_mode = str(count)  # 确保是字符串格式
            except ValueError:
                count_mode = "1"  # 无法解析时fallback到1

        return node_name, count_mode

    def get_node_outputs(self, node_name: str, count_mode: str,
                         all_outputs: Dict[str, List[str]]) -> List[str]:
        """
        获取节点的指定数量输出

        Args:
            node_name: 节点名称
            count_mode: 数量模式 ("1", "3", "all"等)
            all_outputs: 所有节点的输出历史 {node_name: [output1, output2, ...]}

        Returns:
            符合条件的输出列表，按时间顺序（最新在最后）
        """
        # 节点不存在时返回空列表
        if node_name not in all_outputs:
            return []

        node_outputs = all_outputs[node_name]

        # 节点无输出时返回空列表
        if not node_outputs:
            return []

        if count_mode == "all":
            return node_outputs.copy()  # 返回所有历史输出
        else:
            try:
                count = int(count_mode)
                return node_outputs[-count:] if count > 0 else []  # 返回最新count条
            except ValueError:
                return node_outputs[-1:] if node_outputs else []  # fallback到最新1条

    def format_outputs(self, outputs: List[str]) -> str:
        """
        格式化输出内容列表

        Args:
            outputs: 输出内容列表

        Returns:
            格式化后的字符串
        """
        if not outputs:
            return ""

        # 单条输出直接返回
        if len(outputs) == 1:
            return outputs[0]

        # 多条输出使用分隔符连接
        return "\n\n---\n\n".join(outputs)

    def render_template(self, template: str, node_outputs: Dict[str, List[str]]) -> str:
        """
        渲染模板，替换所有占位符

        Args:
            template: 包含占位符的模板字符串
            node_outputs: 节点输出历史 {node_name: [output1, output2, ...]}

        Returns:
            渲染后的字符串，所有占位符被替换为对应内容
        """

        def replace_placeholder(match):
            placeholder_content = match.group(1)  # 获取括号内的内容
            node_name, count_mode = self.parse_placeholder(placeholder_content)

            # 获取节点输出
            outputs = self.get_node_outputs(node_name, count_mode, node_outputs)

            # 格式化并返回
            return self.format_outputs(outputs)

        # 使用正则表达式替换所有占位符
        return re.sub(self.PLACEHOLDER_PATTERN, replace_placeholder, template)
