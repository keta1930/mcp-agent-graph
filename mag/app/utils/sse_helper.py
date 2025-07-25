import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class SSEHelper:
    """SSE工具类 - 混合方案：OpenAI标准 + 最小化自定义事件"""

    @staticmethod
    def format_sse_data(data: Dict[str, Any]) -> str:
        """格式化SSE数据"""
        try:
            return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"格式化SSE数据时出错: {str(e)}")
            return f"data: {json.dumps({'error': {'message': str(e), 'type': 'format_error'}}, ensure_ascii=False)}\n\n"

    @staticmethod
    def format_done() -> str:
        """格式化结束标记"""
        return "data: [DONE]\n\n"

    @staticmethod
    def send_node_start(node_name: str, level: int) -> str:
        """发送节点开始事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "node_start",
            "node_name": node_name,
            "level": level
        })

    @staticmethod
    def send_node_end(node_name: str) -> str:
        """发送节点结束事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "node_end",
            "node_name": node_name
        })

    @staticmethod
    def send_graph_complete(final_result: str, execution_chain: list) -> str:
        """发送图完成事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "graph_complete",
            "final_result": final_result,
            "execution_chain": execution_chain
        })

    @staticmethod
    def send_error(message: str) -> str:
        """发送错误事件"""
        return SSEHelper.format_sse_data({
            "error": {
                "message": message,
                "type": "execution_error"
            }
        })

    @staticmethod
    def send_openai_chunk(chunk_data: Dict[str, Any]) -> str:
        """发送OpenAI标准格式的chunk - 保持原生格式"""
        return SSEHelper.format_sse_data(chunk_data)

    @staticmethod
    def send_tool_message(tool_call_id: str, content: str) -> str:
        """发送工具结果消息 - OpenAI标准格式"""
        return SSEHelper.format_sse_data({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": content
        })