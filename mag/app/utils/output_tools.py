import re
from typing import Dict, List, Any


class GraphPromptTemplate:
    """Graph Prompt模板处理器"""

    # 支持节点输出引用的正则表达式
    PLACEHOLDER_PATTERN = r'\{\{([^}]+)\}\}'

    def __init__(self):
        pass

    def parse_placeholder(self, placeholder: str) -> Dict[str, Any]:
        """
        解析占位符，返回类型和参数

        Args:
            placeholder: 占位符内容（不含大括号）

        Returns:
            Dict包含：
            {
                "type": "single|joint",
                "nodes": [{"name": "node1", "count": "3"}, ...],
            }
        """
        placeholder = placeholder.strip()

        # 检查是否为联合输出引用（包含|分隔符）
        if '|' in placeholder:
            # 解析联合输出格式：node1:3|node2:2|node3:1
            node_configs = []
            parts = placeholder.split('|')

            for part in parts:
                part = part.strip()
                if ':' in part:
                    node_name, count_str = part.split(':', 1)
                    node_name = node_name.strip()
                    count_str = count_str.strip()
                else:
                    node_name = part.strip()
                    count_str = "1"

                # 验证count参数
                if count_str != "all":
                    try:
                        count = int(count_str)
                        if count <= 0:
                            count_str = "1"
                        else:
                            count_str = str(count)
                    except ValueError:
                        count_str = "1"

                node_configs.append({
                    "name": node_name,
                    "count": count_str
                })

            return {
                "type": "joint",
                "nodes": node_configs
            }

        # 单节点引用
        if ':' in placeholder:
            node_name, count_str = placeholder.split(':', 1)
            node_name = node_name.strip()
            count_str = count_str.strip()
        else:
            node_name = placeholder.strip()
            count_str = "1"

        # 验证count参数
        if count_str != "all":
            try:
                count = int(count_str)
                if count <= 0:
                    count_str = "1"
                else:
                    count_str = str(count)
            except ValueError:
                count_str = "1"

        return {
            "type": "single",
            "nodes": [{"name": node_name, "count": count_str}]
        }

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

    def render_joint_output(self, joint_config: List[Dict[str, str]],
                            all_outputs: Dict[str, List[str]]) -> str:
        """
        渲染联合输出，实现交错逻辑

        Args:
            joint_config: 联合配置列表 [{"name": "node1", "count": "3"}, ...]
            all_outputs: 所有节点的输出历史

        Returns:
            格式化的交错输出字符串
        """
        # 收集每个节点需要的输出
        node_outputs_map = {}
        max_rounds = 0

        for config in joint_config:
            node_name = config["name"]
            count_mode = config["count"]

            outputs = self.get_node_outputs(node_name, count_mode, all_outputs)
            node_outputs_map[node_name] = outputs
            max_rounds = max(max_rounds, len(outputs))

        # 按轮次交错生成输出
        joint_results = []

        for round_idx in range(max_rounds):
            for config in joint_config:
                node_name = config["name"]
                node_outputs = node_outputs_map[node_name]

                # 如果该节点在当前轮次有输出
                if round_idx < len(node_outputs):
                    content = node_outputs[round_idx]
                    joint_results.append({
                        "node": node_name,
                        "round": round_idx + 1,
                        "content": content
                    })

        return self.format_joint_outputs(joint_results)

    def format_joint_outputs(self, joint_results: List[Dict[str, Any]]) -> str:
        """
        格式化联合输出

        Args:
            joint_results: [
                {"node": "node1", "round": 1, "content": "..."},
                {"node": "node2", "round": 1, "content": "..."},
                ...
            ]

        Returns:
            格式化后的字符串
        """
        if not joint_results:
            return ""

        formatted_parts = []
        for item in joint_results:
            header = f"{item['node']}-round{item['round']}output："
            formatted_parts.append(f"{header}\n{item['content']}")

        return "\n".join(formatted_parts)

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
        处理模板中的动态节点占位符

        Args:
            template: 包含节点占位符的模板字符串（提示词引用已预处理）
            node_outputs: 节点输出历史 {node_name: [output1, output2, ...]}

        Returns:
            渲染后的字符串，所有节点占位符被替换为对应内容
        """

        def replace_placeholder(match):
            placeholder_content = match.group(1)  # 获取括号内的内容

            # 解析占位符类型和参数
            parsed = self.parse_placeholder(placeholder_content)
            placeholder_type = parsed["type"]

            if placeholder_type == "joint":
                # 联合输出引用
                joint_config = parsed["nodes"]
                return self.render_joint_output(joint_config, node_outputs)

            elif placeholder_type == "single":
                # 单节点引用
                node_config = parsed["nodes"][0]
                node_name = node_config["name"]
                count_mode = node_config["count"]

                outputs = self.get_node_outputs(node_name, count_mode, node_outputs)
                return self.format_outputs(outputs)

            # 未知类型，返回原占位符
            return match.group(0)

        # 使用正则表达式替换所有节点占位符
        return re.sub(self.PLACEHOLDER_PATTERN, replace_placeholder, template)