"""
系统工具执行器

处理内置系统工具的执行
"""
import json
import logging
from typing import Dict, Any
from app.services.tool_execution.base_executor import BaseToolExecutor
from app.services.system_tools import is_system_tool, get_tool_handler

logger = logging.getLogger(__name__)


class SystemToolExecutor(BaseToolExecutor):
    """系统工具执行器
    
    专门处理内置系统工具的调用
    """

    def can_handle(self, tool_name: str) -> bool:
        """判断是否为系统工具
        
        Args:
            tool_name: 工具名称
            
        Returns:
            True 如果是系统工具
        """
        return is_system_tool(tool_name)

    async def execute(self, tool_name: str, arguments: Dict[str, Any], 
                     tool_call_id: str, **context) -> Dict[str, Any]:
        """执行系统工具调用
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
            tool_call_id: 工具调用ID
            **context: 上下文参数（user_id, conversation_id, agent_id）
            
        Returns:
            工具执行结果
        """
        try:
            # 获取工具处理函数
            handler = get_tool_handler(tool_name)
            if not handler:
                logger.error(f"系统工具未找到处理函数: {tool_name}")
                return self._format_error(
                    tool_call_id, 
                    f"系统工具 {tool_name} 未找到处理函数"
                )

            # 添加上下文参数
            user_id = context.get("user_id")
            conversation_id = context.get("conversation_id")
            agent_id = context.get("agent_id")
            
            if user_id:
                arguments["user_id"] = user_id
            if conversation_id:
                arguments["conversation_id"] = conversation_id
            if agent_id:
                arguments["agent_id"] = agent_id

            # 执行工具
            logger.debug(f"调用系统工具 {tool_name}，参数: {arguments}")
            result = await handler(**arguments)

            # 格式化结果
            if isinstance(result, dict):
                content = json.dumps(result, ensure_ascii=False)
            else:
                content = str(result)

            return self._format_result(tool_call_id, content)

        except Exception as e:
            logger.error(f"系统工具 {tool_name} 执行失败: {str(e)}", exc_info=True)
            return self._format_error(
                tool_call_id, 
                f"系统工具 {tool_name} 执行失败：{str(e)}"
            )

    async def execute_stream(self, tool_name: str, arguments: Dict[str, Any], 
                            tool_call_id: str, **context):
        """执行系统工具调用（流式版本）
        
        专门用于 agent_task_executor 等需要流式输出的工具
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
            tool_call_id: 工具调用ID
            **context: 上下文参数
            
        Yields:
            str: SSE 事件字符串
            Dict: 最终工具结果
        """
        try:
            from app.services.system_tools.agent_tools import agent_task_executor
            
            # 添加上下文参数
            user_id = context.get("user_id")
            conversation_id = context.get("conversation_id")
            agent_id = context.get("agent_id")
            
            arguments["user_id"] = user_id
            arguments["conversation_id"] = conversation_id
            if agent_id:
                arguments["agent_id"] = agent_id
            
            # 调用流式执行版本
            async for item in agent_task_executor.handler(**arguments):
                if isinstance(item, str):
                    # SSE 事件
                    yield item
                else:
                    # 最终结果，格式化为工具结果
                    if isinstance(item, dict):
                        content = json.dumps(item, ensure_ascii=False)
                    else:
                        content = str(item)
                    
                    yield self._format_result(tool_call_id, content)
                    
        except Exception as e:
            logger.error(f"agent_task_executor 流式执行失败: {str(e)}", exc_info=True)
            yield self._format_error(
                tool_call_id, 
                f"agent_task_executor 执行失败：{str(e)}"
            )
