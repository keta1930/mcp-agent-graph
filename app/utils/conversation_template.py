import time
from typing import Dict, List, Any, Optional


class ConversationTemplate:
    """会话模板生成器"""

    @staticmethod
    def generate_conversation_filename(graph_name: str) -> str:
        """生成会话文件名 - 图名称+执行时间"""
        # 使用年月日小时分钟格式
        time_str = time.strftime("%Y%m%d_%H%M%S", time.localtime())
        # 替换图名称中可能的特殊字符
        safe_graph_name = graph_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        return f"{safe_graph_name}_{time_str}"

    @staticmethod
    def generate_header(graph_name: str, conversation_id: str, input_text: str, start_time: str = None) -> str:
        """生成会话头部"""
        if start_time is None:
            start_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        return f"""# 图执行: {graph_name}
**开始时间**: {start_time}
**会话ID**: {conversation_id}

## 输入
```
{input_text}
```

## 执行进度
"""

    @staticmethod
    def generate_node_section(node: Dict[str, Any]) -> str:
        """生成节点执行部分"""
        node_name = node.get("node_name", "未知节点")
        node_input = node.get("input", "")
        node_output = node.get("output", "")

        # 处理工具调用
        tool_calls_content = ""
        tool_calls = node.get("tool_calls", [])
        tool_results = node.get("tool_results", [])

        if tool_calls or tool_results:
            tool_calls_content = "\n**工具调用**:\n"
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
                    tool_calls_content += f"  - 结果: {content[:100]}...(截断)\n"

        # 处理子图
        subgraph_content = ""
        if node.get("is_subgraph", False):
            subgraph_content = "\n**子图**: " + node.get("subgraph_name", "未知子图") + "\n"
            subgraph_results = node.get("subgraph_results", [])
            for sub_node in subgraph_results:
                subgraph_content += ConversationTemplate.generate_node_section(sub_node)

        return f"""
### 节点: {node_name}
**输入**:
```
{node_input}
```

**输出**:
```
{node_output}
```
{tool_calls_content}
{subgraph_content}
"""

    @staticmethod
    def generate_final_output(output: str) -> str:
        """生成最终输出部分"""
        return f"""
## 最终输出
```
{output}
```
"""

    @staticmethod
    def generate_template(conversation: Dict[str, Any]) -> str:
        """生成完整的会话模板"""
        graph_name = conversation.get("graph_name", "未知图")
        conversation_id = conversation.get("conversation_id", "未知ID")

        # 查找初始输入
        input_text = ""
        for result in conversation.get("results", []):
            if result.get("is_start_input", False):
                input_text = result.get("input", "")
                break

        if not input_text and "input" in conversation:
            input_text = conversation.get("input", "")

        # 获取开始时间
        start_time = conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))

        # 生成头部
        template = ConversationTemplate.generate_header(graph_name, conversation_id, input_text, start_time)

        # 生成节点执行部分 - 确保包含所有节点
        node_results = conversation.get("node_results", [])
        for node_result in node_results:
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                template += ConversationTemplate.generate_node_section(node_result)

        # 生成最终输出
        final_output = conversation.get("output", "")
        template += ConversationTemplate.generate_final_output(final_output)

        return template

    @staticmethod
    def update_template(existing_template: str, conversation: Dict[str, Any]) -> str:
        """更新现有模板，确保所有节点信息都被包含"""
        # 由于增量更新复杂且容易出错，这里直接重新生成完整模板
        return ConversationTemplate.generate_template(conversation)