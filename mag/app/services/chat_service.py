import json
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from app.infrastructure.database.mongodb import mongodb_client
from app.services.model_service import model_service
from app.services.mcp_service import mcp_service
from app.services.mcp.tool_executor import ToolExecutor
from app.services.chat.message_builder import MessageBuilder
from app.services.chat.stream_executor import StreamExecutor
from app.services.chat.round_saver import RoundSaver
from app.services.chat.prompts import get_summarize_prompt
from app.utils.text_tool import detect_language

logger = logging.getLogger(__name__)


class ChatService:
    """Chat服务 - 负责聊天业务逻辑和MongoDB交互"""

    def __init__(self):
        self.active_streams = {}
        self.tool_executor = ToolExecutor(mcp_service)
        self.message_builder = MessageBuilder(mongodb_client)
        self.stream_executor = StreamExecutor(self.tool_executor)
        self.round_saver = RoundSaver(mongodb_client)

    async def chat_completions_stream(self,
                                      conversation_id: Optional[str],
                                      user_prompt: str,
                                      system_prompt: str = "",
                                      mcp_servers: List[str] = None,
                                      model_name: str = None,
                                      user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """Chat completions流式接口

        Args:
            conversation_id: 对话ID（None表示临时对话）
            user_prompt: 用户提示词
            system_prompt: 系统提示词
            mcp_servers: MCP服务器列表
            model_name: 模型名称
            user_id: 用户ID

        Yields:
            SSE格式的流式数据
        """
        if not model_name:
            raise ValueError("必须指定模型名称")

        if mcp_servers is None:
            mcp_servers = []

        try:
            # 只有非临时对话才确保对话存在
            if conversation_id is not None:
                await mongodb_client.ensure_conversation_exists(conversation_id, user_id)

            # 构建消息上下文
            if conversation_id is not None:
                messages = await self.message_builder.build_chat_messages(
                    conversation_id, user_prompt, system_prompt
                )
            else:
                messages = self.message_builder.build_temporary_chat_messages(
                    user_prompt, system_prompt
                )

            # 验证消息格式
            messages = self.message_builder.validate_messages(messages)

            # 使用MCP服务准备工具
            tools = await mcp_service.prepare_chat_tools(mcp_servers)

            # 执行完整的流式执行流程
            execution_result = None
            async for item in self.stream_executor.execute_complete_flow(
                model_name=model_name,
                messages=messages,
                tools=tools,
                mcp_servers=mcp_servers,
                conversation_id=conversation_id,
                max_iterations=10
            ):
                if isinstance(item, str):
                    # SSE chunk，直接转发
                    yield item
                else:
                    # 完整结果
                    execution_result = item

            # 处理执行结果
            if execution_result:
                # 持久对话保存到数据库
                if conversation_id is not None:
                    await self.round_saver.save_complete_round(
                        conversation_id=conversation_id,
                        round_messages=execution_result["round_messages"],
                        token_usage=execution_result["round_token_usage"],
                        user_id=user_id,
                        model_name=model_name,
                        tools_schema=tools or []
                    )
                else:
                    logger.info(f"临时对话完成，跳过数据库保存。Token使用量: {execution_result['round_token_usage']}")

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Chat completions流式处理出错: {str(e)}")
            error_chunk = {
                "error": {
                    "message": str(e),
                    "type": "api_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    async def compact_conversation(self,
                             conversation_id: str,
                             model_name: str,
                             compact_type: str = "brutal",
                             compact_threshold: int = 2000,
                             user_id: str = "default_user") -> Dict[str, Any]:
        """压缩对话内容

        Args:
            conversation_id: 对话ID
            model_name: 模型名称
            compact_type: 压缩类型（brutal/precise）
            compact_threshold: 压缩阈值
            user_id: 用户ID

        Returns:
            压缩结果
        """
        try:
            # 验证参数
            if compact_type not in ['brutal', 'precise']:
                return {"status": "error", "error": "压缩类型必须是 'brutal' 或 'precise'"}

            # 验证模型是否存在
            model_config = await model_service.get_model(model_name)
            if not model_config:
                return {"status": "error", "error": f"找不到模型配置: {model_name}"}

            # 创建总结回调函数（用于精确压缩）
            summarize_callback = None
            if compact_type == "precise":
                summarize_callback = lambda content: self._summarize_tool_content(content, model_name)

            # 调用MongoDB服务执行压缩
            result = await mongodb_client.compact_conversation(
                conversation_id=conversation_id,
                compact_type=compact_type,
                compact_threshold=compact_threshold,
                summarize_callback=summarize_callback,
                user_id=user_id
            )

            logger.info(f"对话压缩完成: {conversation_id}, 结果: {result.get('status')}")
            return result

        except Exception as e:
            logger.error(f"压缩对话时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _summarize_tool_content(self, content: str, model_name: str) -> Dict[str, Any]:
        """使用模型总结工具结果进行压缩内容

        Args:
            content: 待总结内容
            model_name: 模型名称

        Returns:
            总结结果
        """
        try:
            language = detect_language(content)
            prompt_template = get_summarize_prompt(language)
            truncated_content = content
            summary_prompt = prompt_template.format(content=truncated_content)

            # 构建消息
            messages = [
                {"role": "user", "content": summary_prompt}
            ]

            # 调用模型
            result = await model_service.call_model(
                model_name=model_name,
                messages=messages
            )

            if result.get("status") == "success":
                summary_content = result.get("content", "").strip()

                return {
                    "status": "success",
                    "content": summary_content
                }
            else:
                logger.warning(f"内容总结失败: {result.get('error', '未知错误')}")
                return {"status": "error", "error": result.get("error", "总结失败")}

        except Exception as e:
            logger.error(f"总结工具内容时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def get_conversations_list(self, user_id: str = "default_user",
                                     limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取对话列表"""
        try:
            return await mongodb_client.list_conversations(user_id, limit, skip)
        except Exception as e:
            logger.error(f"获取对话列表出错: {str(e)}")
            return []

    async def get_conversation_detail(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话详情"""
        try:
            return await mongodb_client.get_conversation_with_messages(conversation_id)
        except Exception as e:
            logger.error(f"获取对话详情出错: {str(e)}")
            return None

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        try:
            return await mongodb_client.delete_conversation(conversation_id)
        except Exception as e:
            logger.error(f"删除对话出错: {str(e)}")
            return False


# 创建全局Chat服务实例
chat_service = ChatService()
