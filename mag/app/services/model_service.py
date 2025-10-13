import logging
import json
import re
from typing import Dict, List, Any, Optional, Union
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

logger = logging.getLogger(__name__)


class StreamAccumulator:
    """流式响应累积器 - 用于处理和累积流式API响应"""

    def __init__(self):
        self.accumulated_content = ""
        self.accumulated_reasoning = ""
        self.tool_calls_dict = {}
        self.api_usage = None

    def process_chunk(self, chunk):
        """处理单个chunk并累积数据

        Args:
            chunk: API返回的chunk对象
        """
        if chunk.choices and chunk.choices[0].delta:
            delta = chunk.choices[0].delta

            # 累积content
            if delta.content:
                self.accumulated_content += delta.content

            # 累积reasoning_content
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                self.accumulated_reasoning += delta.reasoning_content

            # 累积tool_calls
            if delta.tool_calls:
                for tool_call_delta in delta.tool_calls:
                    index = tool_call_delta.index

                    if index not in self.tool_calls_dict:
                        self.tool_calls_dict[index] = {
                            "id": tool_call_delta.id or "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""}
                        }

                    if tool_call_delta.id:
                        self.tool_calls_dict[index]["id"] = tool_call_delta.id

                    if tool_call_delta.function:
                        if tool_call_delta.function.name:
                            self.tool_calls_dict[index]["function"]["name"] += tool_call_delta.function.name
                        if tool_call_delta.function.arguments:
                            self.tool_calls_dict[index]["function"]["arguments"] += tool_call_delta.function.arguments

        # 收集usage信息
        if hasattr(chunk, "usage") and chunk.usage is not None:
            self.api_usage = {
                "total_tokens": chunk.usage.total_tokens,
                "prompt_tokens": chunk.usage.prompt_tokens,
                "completion_tokens": chunk.usage.completion_tokens
            }

    def get_tool_calls_list(self):
        """获取tool_calls列表"""
        return list(self.tool_calls_dict.values())

    def get_result(self):
        """获取累积的结果"""
        return {
            "accumulated_content": self.accumulated_content,
            "accumulated_reasoning": self.accumulated_reasoning,
            "tool_calls_dict": self.tool_calls_dict,
            "tool_calls_list": self.get_tool_calls_list(),
            "api_usage": self.api_usage
        }


class ModelService:
    """模型服务管理 - MongoDB版本"""

    def __init__(self):
        self.mongodb_service = None
        self.clients: Dict[str, AsyncOpenAI] = {}

    async def initialize(self, mongodb_service) -> None:
        """
        初始化模型服务

        Args:
            mongodb_service: MongoDB服务实例
        """
        self.mongodb_service = mongodb_service
        await self._initialize_clients()

    async def _initialize_clients(self) -> None:
        """初始化所有模型的异步客户端"""
        try:
            models = await self.mongodb_service.list_model_configs(include_api_key=True)
            for model_config in models:
                try:
                    client = AsyncOpenAI(
                        api_key=model_config["api_key"],
                        base_url=model_config["base_url"]
                    )
                    self.clients[model_config["name"]] = client
                except Exception as e:
                    logger.error(f"初始化模型 '{model_config['name']}' 客户端时出错: {str(e)}")
        except Exception as e:
            logger.error(f"初始化模型客户端列表时出错: {str(e)}")

    async def get_all_models(self) -> List[Dict[str, Any]]:
        """获取所有模型配置（不包含API密钥）"""
        try:
            models = await self.mongodb_service.list_model_configs(include_api_key=False)
            # 只返回基本信息
            return [{
                "name": model["name"],
                "base_url": model["base_url"],
                "model": model.get("model", "")
            } for model in models]
        except Exception as e:
            logger.error(f"获取所有模型配置失败: {str(e)}")
            return []

    async def get_model_for_edit(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取特定模型的完整配置（用于编辑，不包含API密钥）"""
        try:
            model = await self.mongodb_service.get_model_config(model_name, include_api_key=False)
            if model:
                # 移除时间戳字段
                model.pop('created_at', None)
                model.pop('updated_at', None)
            return model
        except Exception as e:
            logger.error(f"获取模型配置失败 {model_name}: {str(e)}")
            return None

    async def get_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取特定模型的配置（包含API密钥）"""
        try:
            return await self.mongodb_service.get_model_config(model_name, include_api_key=True)
        except Exception as e:
            logger.error(f"获取模型配置失败 {model_name}: {str(e)}")
            return None

    async def add_model(self, model_config: Dict[str, Any]) -> bool:
        """添加新模型配置"""
        try:
            # 验证配置是否有效
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            # 添加到MongoDB
            result = await self.mongodb_service.create_model_config(model_config)

            if result.get("success"):
                # 添加客户端
                self.clients[model_config["name"]] = client
                logger.info(f"模型 '{model_config['name']}' 添加成功")
                return True
            else:
                logger.warning(f"添加模型失败: {result.get('message')}")
                return False

        except Exception as e:
            logger.error(f"添加模型 '{model_config.get('name')}' 时出错: {str(e)}")
            return False

    async def update_model(self, model_name: str, model_config: Dict[str, Any]) -> bool:
        """更新现有模型配置"""
        try:
            # 验证配置是否有效
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            # 更新MongoDB
            result = await self.mongodb_service.update_model_config(model_name, model_config)

            if result.get("success"):
                # 更新客户端映射
                old_name = model_name
                new_name = model_config.get("name", model_name)

                if old_name != new_name and old_name in self.clients:
                    del self.clients[old_name]

                self.clients[new_name] = client
                logger.info(f"模型 '{model_name}' 更新成功")
                return True
            else:
                logger.warning(f"更新模型失败: {result.get('message')}")
                return False

        except Exception as e:
            logger.error(f"更新模型 '{model_name}' 时出错: {str(e)}")
            return False

    async def delete_model(self, model_name: str) -> bool:
        """删除模型配置"""
        try:
            # 从MongoDB删除
            result = await self.mongodb_service.delete_model_config(model_name)

            if result.get("success"):
                # 移除客户端
                if model_name in self.clients:
                    del self.clients[model_name]
                logger.info(f"模型 '{model_name}' 删除成功")
                return True
            else:
                logger.warning(f"删除模型失败: {result.get('message')}")
                return False

        except Exception as e:
            logger.error(f"删除模型 '{model_name}' 时出错: {str(e)}")
            return False

    # === 模型参数处理方法 ===

    def add_model_params(self, params: Dict[str, Any], model_config: Dict[str, Any]) -> None:
        """添加模型配置参数到API调用参数中"""
        optional_params = [
            'temperature', 'max_tokens', 'max_completion_tokens',
            'top_p', 'frequency_penalty', 'presence_penalty', 'n',
            'stop', 'seed', 'logprobs', 'top_logprobs'
        ]

        for param in optional_params:
            if param in model_config and model_config[param] is not None:
                if param in ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']:
                    params[param] = float(model_config[param])
                elif param in ['max_tokens', 'max_completion_tokens', 'n', 'seed', 'top_logprobs']:
                    params[param] = int(model_config[param])
                else:
                    params[param] = model_config[param]

    def get_extra_kwargs(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取额外的请求参数"""
        extra_kwargs = {}
        if model_config.get('extra_headers'):
            extra_kwargs['extra_headers'] = model_config['extra_headers']
        if model_config.get('timeout'):
            extra_kwargs['timeout'] = model_config['timeout']
        if model_config.get('extra_body'):
            extra_kwargs['extra_body'] = model_config['extra_body']
        return extra_kwargs

    def prepare_api_params(self, base_params: Dict[str, Any], model_config: Dict[str, Any]) -> Dict[str, Any]:
        """准备完整的API调用参数"""
        # 复制基础参数以避免修改原始字典
        params = base_params.copy()

        # 添加模型配置参数
        self.add_model_params(params, model_config)

        # 获取额外参数
        extra_kwargs = self.get_extra_kwargs(model_config)

        return params, extra_kwargs

    async def call_model(self,
                        model_name: str,
                        messages: List[Dict[str, Any]],
                        tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """调用模型API，支持所有配置参数和流式返回"""
        client = self.clients.get(model_name)
        if not client:
            return {"status": "error", "error": f"模型 '{model_name}' 未配置或初始化失败"}

        model_config = await self.get_model(model_name)
        if not model_config:
            return {"status": "error", "error": f"找不到模型 '{model_name}' 的配置"}

        try:
            # 准备基本调用参数
            base_params = {
                "model": model_config["model"],
                "messages": messages
            }

            # 如果提供了工具，添加到参数中
            if tools:
                base_params["tools"] = tools

            # 使用新的参数准备方法
            params, extra_kwargs = self.prepare_api_params(base_params, model_config)

            # 检查是否启用流式返回
            is_stream = model_config.get('stream', False)

            if is_stream:
                # 处理流式返回
                return await self._handle_stream_response(client, params, **extra_kwargs)
            else:
                # 处理普通返回
                response = await client.chat.completions.create(**params, **extra_kwargs)
                return await self._handle_normal_response(response)

        except Exception as e:
            logger.error(f"调用模型 '{model_name}' 时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _handle_stream_response(self, client, params, **extra_kwargs):
        """处理流式响应"""
        try:
            # 为流式响应设置stream参数
            stream_params = params.copy()
            stream_params["stream"] = True

            stream = await client.chat.completions.create(**stream_params, **extra_kwargs)

            content_parts = []
            tool_calls = []
            current_tool_calls = {}  # 用于跟踪正在构建的工具调用

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    delta = chunk.choices[0].delta

                    # 收集内容
                    if delta.content:
                        content_parts.append(delta.content)

                    # 收集工具调用
                    if delta.tool_calls:
                        for tool_call_delta in delta.tool_calls:
                            index = tool_call_delta.index

                            if index not in current_tool_calls:
                                current_tool_calls[index] = {
                                    "id": tool_call_delta.id or "",
                                    "type": tool_call_delta.type or "function",
                                    "function": {
                                        "name": "",
                                        "arguments": ""
                                    }
                                }

                            # 更新工具调用信息
                            if tool_call_delta.id:
                                current_tool_calls[index]["id"] = tool_call_delta.id
                            if tool_call_delta.type:
                                current_tool_calls[index]["type"] = tool_call_delta.type

                            if tool_call_delta.function:
                                if tool_call_delta.function.name:
                                    current_tool_calls[index]["function"]["name"] += tool_call_delta.function.name
                                if tool_call_delta.function.arguments:
                                    current_tool_calls[index]["function"]["arguments"] += tool_call_delta.function.arguments

            # 保存原始工具调用信息（用于构造标准消息格式）
            raw_tool_calls = list(current_tool_calls.values())

            # 处理完整的工具调用
            for tool_call_data in current_tool_calls.values():
                tool_name = tool_call_data["function"]["name"]

                if tool_name:
                    try:
                        tool_args = json.loads(tool_call_data["function"]["arguments"] or "{}")
                    except json.JSONDecodeError:
                        logger.error(f"工具参数JSON无效: {tool_call_data['function']['arguments']}")
                        tool_args = {}

                    # 处理handoffs工具
                    if tool_name.startswith("transfer_to_"):
                        selected_node = tool_name[len("transfer_to_"):]
                        tool_calls.append({
                            "tool_name": tool_name,
                            "content": f"选择了节点: {selected_node}",
                            "selected_node": selected_node
                        })
                    else:
                        # 普通工具调用
                        tool_calls.append({
                            "tool_name": tool_name,
                            "params": tool_args
                        })

            # 清理内容
            full_content = "".join(content_parts)
            cleaned_content = self._clean_content(full_content)

            return {
                "status": "success",
                "content": cleaned_content,
                "tool_calls": tool_calls,
                "raw_tool_calls": raw_tool_calls
            }

        except Exception as e:
            logger.error(f"处理流式响应时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _handle_normal_response(self, response):
        """处理普通响应"""
        try:
            # 提取消息内容
            message_content = response.choices[0].message.content or ""

            # 清理内容
            cleaned_content = self._clean_content(message_content)

            # 处理工具调用
            tool_calls = []
            raw_tool_calls = []
            if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
                # 保存原始工具调用信息
                for tool_call in response.choices[0].message.tool_calls:
                    raw_tool_calls.append({
                        "id": tool_call.id,
                        "type": tool_call.type,
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": tool_call.function.arguments
                        }
                    })

                # 处理简化的工具调用信息
                for tool_call in response.choices[0].message.tool_calls:
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        logger.error(f"工具参数JSON无效: {tool_call.function.arguments}")
                        tool_args = {}

                    tool_name = tool_call.function.name

                    # 处理handoffs工具
                    if tool_name.startswith("transfer_to_"):
                        selected_node = tool_name[len("transfer_to_"):]
                        tool_calls.append({
                            "tool_name": tool_name,
                            "content": f"选择了节点: {selected_node}",
                            "selected_node": selected_node
                        })
                    else:
                        # 普通工具调用
                        tool_calls.append({
                            "tool_name": tool_name,
                            "params": tool_args
                        })

            return {
                "status": "success",
                "content": cleaned_content,
                "tool_calls": tool_calls,
                "raw_tool_calls": raw_tool_calls
            }

        except Exception as e:
            logger.error(f"处理普通响应时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _clean_content(self, content: str) -> str:
        """清理模型输出内容"""
        if not content:
            return ""

        # 清理</think>之前的文本
        think_pattern = r".*?</think>"
        cleaned_content = re.sub(think_pattern, "", content, flags=re.DOTALL)

        return cleaned_content.strip()

    @staticmethod
    def filter_reasoning_content(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """过滤消息中的reasoning_content字段"""
        return [{k: v for k, v in msg.items() if k != "reasoning_content"} for msg in messages]


# 创建全局模型服务实例
model_service = ModelService()
