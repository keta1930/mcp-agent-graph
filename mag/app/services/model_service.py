import logging
import json
import re
from typing import Dict, List, Any, Optional, Union
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

from app.core.file_manager import FileManager
from app.models.schema import ModelConfig

logger = logging.getLogger(__name__)


class ModelService:
    """模型服务管理 - 专注于模型调用和参数处理"""

    def __init__(self):
        self.models: List[Dict[str, Any]] = []
        self.clients: Dict[str, AsyncOpenAI] = {}

    def initialize(self) -> None:
        """初始化模型配置"""
        self.models = FileManager.load_model_config()
        self._initialize_clients()

    def _initialize_clients(self) -> None:
        """初始化所有模型的异步客户端"""
        for model_config in self.models:
            try:
                client = AsyncOpenAI(
                    api_key=model_config["api_key"],
                    base_url=model_config["base_url"]
                )
                self.clients[model_config["name"]] = client
            except Exception as e:
                logger.error(f"初始化模型 '{model_config['name']}' 客户端时出错: {str(e)}")

    def get_all_models(self) -> List[Dict[str, Any]]:
        """获取所有模型配置（不包含API密钥）"""
        return [{
            "name": model["name"],
            "base_url": model["base_url"],
            "model": model.get("model", "")
        } for model in self.models]
    
    def get_model_for_edit(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取特定模型的完整配置（用于编辑，不包含API密钥）"""
        model = self.get_model(model_name)
        if not model:
            return None
        
        # 创建配置副本，移除API密钥
        edit_config = model.copy()
        edit_config.pop('api_key', None)
        
        return edit_config

    def get_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取特定模型的配置"""
        for model in self.models:
            if model["name"] == model_name:
                return model
        return None

    def add_model(self, model_config: Dict[str, Any]) -> bool:
        """添加新模型配置"""
        # 检查是否已存在同名模型
        if any(model["name"] == model_config["name"] for model in self.models):
            return False

        try:
            # 创建异步客户端实例以验证配置是否有效
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            # 添加到列表
            self.models.append(model_config)
            self.clients[model_config["name"]] = client

            # 保存到文件
            FileManager.save_model_config(self.models)

            return True
        except Exception as e:
            logger.error(f"添加模型 '{model_config['name']}' 时出错: {str(e)}")
            return False

    def update_model(self, model_name: str, model_config: Dict[str, Any]) -> bool:
        """更新现有模型配置"""
        index = None
        for i, model in enumerate(self.models):
            if model["name"] == model_name:
                index = i
                break

        if index is None:
            return False

        try:
            # 如果新配置中没有API密钥，保持原有的API密钥
            if 'api_key' not in model_config or not model_config['api_key']:
                model_config['api_key'] = self.models[index]['api_key']
            
            # 创建异步客户端实例以验证配置是否有效
            client = AsyncOpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            # 更新模型
            old_name = self.models[index]["name"]
            self.models[index] = model_config
            
            # 更新客户端映射
            if old_name != model_config["name"] and old_name in self.clients:
                del self.clients[old_name]
            self.clients[model_config["name"]] = client

            # 保存到文件
            FileManager.save_model_config(self.models)

            return True
        except Exception as e:
            logger.error(f"更新模型 '{model_name}' 时出错: {str(e)}")
            return False

    def delete_model(self, model_name: str) -> bool:
        """删除模型配置"""
        # 查找模型索引
        index = None
        for i, model in enumerate(self.models):
            if model["name"] == model_name:
                index = i
                break

        if index is None:
            return False

        # 移除模型
        del self.models[index]
        if model_name in self.clients:
            del self.clients[model_name]

        # 保存到文件
        FileManager.save_model_config(self.models)

        return True

    # === 新增：模型参数处理方法 ===

    def add_model_params(self, params: Dict[str, Any], model_config: Dict[str, Any]) -> None:
        """
        添加模型配置参数到API调用参数中
        
        Args:
            params: API调用参数字典，会被直接修改
            model_config: 模型配置字典
        """
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
        """
        获取额外的请求参数
        
        Args:
            model_config: 模型配置字典
            
        Returns:
            包含额外请求参数的字典
        """
        extra_kwargs = {}
        if model_config.get('extra_headers'):
            extra_kwargs['extra_headers'] = model_config['extra_headers']
        if model_config.get('timeout'):
            extra_kwargs['timeout'] = model_config['timeout']
        if model_config.get('extra_body'):
            extra_kwargs['extra_body'] = model_config['extra_body']
        return extra_kwargs

    def prepare_api_params(self, base_params: Dict[str, Any], model_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        准备完整的API调用参数
        
        Args:
            base_params: 基础参数（model, messages等）
            model_config: 模型配置
            
        Returns:
            包含所有参数和额外配置的元组 (params, extra_kwargs)
        """
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

        model_config = self.get_model(model_name)
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


# 创建全局模型服务实例
model_service = ModelService()