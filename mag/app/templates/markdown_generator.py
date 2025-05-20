from typing import Dict, List, Any, Optional
from .template_utils import format_timestamp, get_node_execution_sequence, get_input_from_conversation
from .flow_diagram import FlowDiagram

class MarkdownGenerator:
    """Markdown会话模板生成器"""

    @staticmethod
    def generate_header(graph_name: str, conversation_id: str, input_text: str, start_time: str = None) -> str:
        """生成会话头部"""
        if start_time is None:
            start_time = format_timestamp()

        return f"""# 图执行: {graph_name}
**开始时间**: {start_time}
**会话ID**: {conversation_id}

<details open>
<summary><b>📝 用户输入</b></summary>


{input_text}

</details>

## 执行进度
"""

    @staticmethod
    def generate_node_section(node: Dict[str, Any]) -> str:
        """生成节点执行部分"""
        node_name = node.get("node_name", "未知节点")
        node_input = node.get("input", "")
        node_output = node.get("output", "")
        execution_order = node.get("_execution_order", "")
        
        # 构建节点标题，包括执行顺序
        node_title = f"🔄 节点: {node_name}"
        if execution_order:
            node_title += f" (步骤 {execution_order})"

        # 处理工具调用
        tool_calls_content = ""
        tool_calls = node.get("tool_calls", [])
        tool_results = node.get("tool_results", [])

        if tool_calls or tool_results:
            tool_calls_content = "\n\n<details>\n<summary><b>🔧 工具调用</b></summary>\n\n"
            for i, tool in enumerate(tool_calls):
                tool_name = tool.get("tool_name", "未知工具")
                tool_calls_content += f"- **{tool_name}**\n"

            for i, result in enumerate(tool_results):
                tool_name = result.get("tool_name", "未知工具")
                content = result.get("content", "")
                error = result.get("error", "")
                if error:
                    tool_calls_content += f"  - 错误: {error}\n"
                else:
                    tool_calls_content += f"  - 结果: {content}\n"
            
            tool_calls_content += "</details>\n"

        # 处理子图
        subgraph_content = ""
        if node.get("is_subgraph", False):
            subgraph_content = f"\n<details>\n<summary><b>📊 子图: {node.get('subgraph_name', '未知子图')}</b></summary>\n\n"
            subgraph_results = node.get("subgraph_results", [])
            for sub_node in subgraph_results:
                subgraph_content += MarkdownGenerator.generate_node_section(sub_node)

            subgraph_content += "</details>\n"

        return f"""
<details>
<summary><b>{node_title}</b></summary>

<details>
<summary><b>输入</b></summary>


{node_input}

</details>

<details>
<summary><b>输出</b></summary>


{node_output}

</details>

{tool_calls_content}
{subgraph_content}
</details>
"""

    @staticmethod
    def generate_flow_diagram_section(conversation: Dict[str, Any]) -> str:
        """生成流程图部分"""
        mermaid_diagram = FlowDiagram.generate_mermaid_diagram(conversation)
        
        return f"""
## 执行流程图

<details open>
<summary><b>📊 流程图</b></summary>

```mermaid
{mermaid_diagram}
```
</details>
"""

    @staticmethod
    def generate_final_output(output: str) -> str:
        """生成最终输出部分"""
        return f"""
## 最终输出

<details open>
<summary><b>📊 执行结果</b></summary>

{output}
</details>
"""

    @staticmethod
    def generate_template(conversation: Dict[str, Any]) -> str:
        """生成完整的会话模板，按节点执行顺序排列"""
        graph_name = conversation.get("graph_name", "未知图")
        conversation_id = conversation.get("conversation_id", "未知ID")
        
        # 获取用户输入
        input_text = get_input_from_conversation(conversation)
        
        # 获取开始时间
        start_time = conversation.get("start_time", format_timestamp())

        # 生成头部
        template = MarkdownGenerator.generate_header(graph_name, conversation_id, input_text, start_time)

        # 生成流程图
        template += MarkdownGenerator.generate_flow_diagram_section(conversation)

        # 获取按执行顺序排列的节点结果
        node_sequence = get_node_execution_sequence(conversation)
        
        # 为每个节点添加执行顺序标记
        for i, node in enumerate(node_sequence):
            node['_execution_order'] = i + 1
        
        # 生成节点执行部分 - 按执行顺序排列
        for node_result in node_sequence:
            template += MarkdownGenerator.generate_node_section(node_result)

        # 生成最终输出
        final_output = conversation.get("output", "")
        template += MarkdownGenerator.generate_final_output(final_output)

        return template

    @staticmethod
    def update_template(existing_template: str, conversation: Dict[str, Any]) -> str:
        """更新现有模板，确保所有节点信息都被包含"""
        # 由于增量更新复杂且容易出错，这里直接重新生成完整模板
        return MarkdownGenerator.generate_template(conversation)