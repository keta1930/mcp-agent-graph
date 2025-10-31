import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from openai import AsyncOpenAI
from app.services.model.param_builder import ParamBuilder
from app.services.model.stream_handler import StreamHandler
from app.services.model.response_parser import ResponseParser

logger = logging.getLogger(__name__)


class ModelService:
    """模型服务管理 - 提供模型调用能力（SSE流式 + 非SSE）"""

    def __init__(self):
        self.mongodb_client = None
        self.clients: Dict[str, AsyncOpenAI] = {}
        self.param_builder = ParamBuilder()
        self.response_parser = ResponseParser()

    async def initialize(self, mongodb_client) -> None:
        """初始化模型服务

        Args:
            mongodb_client: MongoDB服务实例
        """
        self.mongodb_client = mongodb_client
        await self._initialize_clients()

    async def _initialize_clients(self) -> None:
        """初始化所有模型的异步客户端"""
        try:
            models = await self.mongodb_client.list_model_configs(include_api_key=True)
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

    # ========== 模型配置管理方法 ==========

    async def get_all_models(self) -> List[Dict[str, Any]]:
        """获取所有模型配置（不包含API密钥）"""
        try:
            models = await self.mongodb_client.list_model_configs(include_api_key=False)
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
            model = await self.mongodb_client.get_model_config(model_name, include_api_key=False)
            if model:
                model.pop('created_at', None)
                model.pop('updated_at', None)
            return model
        except Exception as e:
            logger.error(f"获取模型配置失败 {model_name}: {str(e)}")
            return None

    async def get_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取特定模型的配置（包含API密钥）"""
        try:
            return await self.mongodb_client.get_model_config(model_name, include_api_key=True)
        except Exception as e:
            logger.error(f"获取模型配置失败 {model_name}: {str(e)}")
            return None

    async def add_model(self, model_config: Dict[str, Any]) -> bool:
        """添加新模型配置"""
        try:
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            result = await self.mongodb_client.create_model_config(model_config)

            if result.get("success"):
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
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            result = await self.mongodb_client.update_model_config(model_name, model_config)

            if result.get("success"):
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
            result = await self.mongodb_client.delete_model_config(model_name)

            if result.get("success"):
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

    # ========== 参数处理方法 ==========

    def prepare_api_params(self, base_params: Dict[str, Any], model_config: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """准备完整的API调用参数"""
        return self.param_builder.prepare_api_params(base_params, model_config)

    @staticmethod
    def filter_reasoning_content(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """过滤消息中的reasoning_content字段"""
        return ResponseParser.filter_reasoning_content(messages)

    # ========== SSE流式调用方法 ==========

    async def stream_chat_with_tools(self,
                                     model_name: str,
                                     messages: List[Dict[str, Any]],
                                     tools: Optional[List[Dict[str, Any]]] = None,
                                     yield_chunks: bool = True) -> AsyncGenerator[str | Dict[str, Any], None]:
        """SSE流式调用模型（用于chat/graph/mcp的流式场景）

        Args:
            model_name: 模型名称
            messages: 消息列表
            tools: 工具列表（可选）
            yield_chunks: 是否实时yield SSE chunk数据

        Yields:
            如果 yield_chunks=True:
                - 中间yield: SSE格式字符串 "data: {...}\\n\\n"
                - 最后yield: 累积结果字典
            如果 yield_chunks=False:
                - 只在最后yield累积结果字典

        最后一条累积结果格式:
            {
                "accumulated_content": str,
                "accumulated_reasoning": str,
                "tool_calls": List[Dict],
                "api_usage": Dict
            }
        """
        client = self.clients.get(model_name)
        if not client:
            raise ValueError(f"模型 '{model_name}' 未配置或初始化失败")

        model_config = await self.get_model(model_name)
        if not model_config:
            raise ValueError(f"找不到模型 '{model_name}' 的配置")

        try:
            # 准备基本调用参数
            base_params = {
                "model": model_config["model"],
                "messages": messages,
                "stream": True,
                "stream_options": {"include_usage": True}
            }

            if tools:
                base_params["tools"] = tools

            # 使用参数构建器准备参数
            params, extra_kwargs = self.param_builder.prepare_api_params(base_params, model_config)

            # 调用模型获取流
            stream = await client.chat.completions.create(**params, **extra_kwargs)

            # 使用流处理器处理流式响应
            async for item in StreamHandler.stream_and_accumulate(stream, yield_chunks):
                yield item

        except Exception as e:
            logger.error(f"SSE流式调用模型 '{model_name}' 时出错: {str(e)}")
            raise

    # ========== 非SSE调用方法 ==========

    async def call_model(self,
                        model_name: str,
                        messages: List[Dict[str, Any]],
                        tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """调用模型API（非SSE场景，用于生成标题、压缩对话等静态调用）

        注意：此方法不支持工具调用，tools参数保留仅为兼容性考虑。
        如需工具调用支持，请使用 stream_chat_with_tools() 方法。

        Args:
            model_name: 模型名称
            messages: 消息列表
            tools: 工具列表（保留参数，但不会被使用）

        Returns:
            {
                "status": "success" | "error",
                "content": str
            }
        """
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

            if tools:
                base_params["tools"] = tools

            # 使用参数构建器准备参数
            params, extra_kwargs = self.param_builder.prepare_api_params(base_params, model_config)

            # 检查是否启用流式返回
            is_stream = model_config.get('stream', False)

            if is_stream:
                return await self._handle_stream_response(client, params, **extra_kwargs)
            else:
                response = await client.chat.completions.create(**params, **extra_kwargs)
                return await self._handle_normal_response(response)

        except Exception as e:
            logger.error(f"调用模型 '{model_name}' 时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _handle_stream_response(self, client, params, **extra_kwargs):
        """处理流式响应（非SSE场景）"""
        try:
            stream_params = params.copy()
            stream_params["stream"] = True

            stream = await client.chat.completions.create(**stream_params, **extra_kwargs)

            content_parts = []

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    delta = chunk.choices[0].delta

                    if delta.content:
                        content_parts.append(delta.content)

            full_content = "".join(content_parts)
            cleaned_content = self.response_parser.clean_content(full_content)

            return {
                "status": "success",
                "content": cleaned_content
            }

        except Exception as e:
            logger.error(f"处理流式响应时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _handle_normal_response(self, response):
        """处理普通响应（非SSE场景）"""
        try:
            message_content = response.choices[0].message.content or ""
            cleaned_content = self.response_parser.clean_content(message_content)

            return {
                "status": "success",
                "content": cleaned_content
            }

        except Exception as e:
            logger.error(f"处理普通响应时出错: {str(e)}")
            return {"status": "error", "error": str(e)}


# 创建全局模型服务实例
model_service = ModelService()
