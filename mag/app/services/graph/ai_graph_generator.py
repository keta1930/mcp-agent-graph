import asyncio
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
import os

from app.core.file_manager import FileManager
from app.services.mongodb_service import mongodb_service
from app.services.model_service import model_service
from app.services.mcp_service import mcp_service
from app.utils.text_parser import parse_ai_generation_response
from app.models.schema import GraphConfig, AgentNode

logger = logging.getLogger(__name__)


class AIGraphGenerator:
    """AI图生成器 - 负责多轮交互式图生成"""

    def __init__(self):
        pass

    async def ai_generate_stream(self,
                                 requirement: str,
                                 model_name: str,
                                 conversation_id: Optional[str] = None,
                                 user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """
        AI生成图的流式接口

        Args:
            requirement: 用户需求或继续指令
            model_name: 使用的模型名称
            conversation_id: 对话ID，为空时创建新对话
            user_id: 用户ID

        Yields:
            SSE格式的流式数据
        """
        try:
            # 验证模型是否存在
            model_config = model_service.get_model(model_name)
            if not model_config:
                error_chunk = {
                    "error": {
                        "message": f"找不到模型配置: {model_name}",
                        "type": "model_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"
                return

            # 创建或继续对话
            if conversation_id is None:
                # 没有conversation_id，创建新对话
                conversation_id = await self._create_conversation(user_id, model_name, requirement)
                if not conversation_id:
                    error_chunk = {
                        "error": {
                            "message": "创建对话失败",
                            "type": "database_error"
                        }
                    }
                    yield f"data: {json.dumps(error_chunk)}\n\n"
                    yield "data: [DONE]\n\n"
                    return
            else:
                # 有conversation_id，检查是否存在
                existing_conversation = await mongodb_service.get_graph_generation_conversation(conversation_id)
                if existing_conversation:
                    # 对话存在，继续对话
                    success = await self._continue_conversation(conversation_id, requirement)
                    if not success:
                        error_chunk = {
                            "error": {
                                "message": "继续对话失败",
                                "type": "database_error"
                            }
                        }
                        yield f"data: {json.dumps(error_chunk)}\n\n"
                        yield "data: [DONE]\n\n"
                        return
                else:
                    # 对话不存在，使用该conversation_id创建新对话
                    success = await self._create_conversation(user_id, model_name, requirement, conversation_id)
                    if not success:
                        error_chunk = {
                            "error": {
                                "message": "创建对话失败",
                                "type": "database_error"
                            }
                        }
                        yield f"data: {json.dumps(error_chunk)}\n\n"
                        yield "data: [DONE]\n\n"
                        return

            # 获取对话历史构建消息上下文
            conversation_data = await mongodb_service.get_graph_generation_conversation(conversation_id)
            if not conversation_data:
                error_chunk = {
                    "error": {
                        "message": "获取对话数据失败",
                        "type": "database_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"
                return

            messages = conversation_data.get("messages", [])

            # 获取模型客户端
            client = model_service.clients.get(model_name)
            if not client:
                error_chunk = {
                    "error": {
                        "message": f"模型客户端未初始化: {model_name}",
                        "type": "model_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"
                return

            # 准备API调用参数
            base_params = {
                "model": model_config["model"],
                "messages": messages,
                "stream": True
            }

            params, extra_kwargs = model_service.prepare_api_params(base_params, model_config)

            # 调用模型进行流式生成
            stream = await client.chat.completions.create(**params, **extra_kwargs)

            # 收集响应数据
            accumulated_content = ""
            api_usage = None

            # 处理流式响应
            async for chunk in stream:
                chunk_dict = chunk.model_dump()
                yield f"data: {json.dumps(chunk_dict)}\n\n"

                if chunk.choices and chunk.choices[0].delta:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        accumulated_content += delta.content

                if hasattr(chunk, 'usage') and chunk.usage:
                    api_usage = {
                        "total_tokens": chunk.usage.total_tokens,
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens
                    }

                if chunk.choices and chunk.choices[0].finish_reason:
                    break

            # 构建assistant消息
            assistant_message = {
                "role": "assistant",
                "content": accumulated_content or ""
            }

            # 添加assistant消息到数据库
            await mongodb_service.add_message_to_graph_generation(conversation_id, assistant_message)

            # 更新token使用量
            if api_usage:
                await mongodb_service.update_graph_generation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=api_usage["prompt_tokens"],
                    completion_tokens=api_usage["completion_tokens"]
                )

            # 解析响应并更新结果
            await self._parse_and_update_results(conversation_id, accumulated_content)

            # 检查是否完成了所有阶段
            completion_result = await self._check_completion(conversation_id)
            if completion_result["completed"]:
                # 组装最终图配置并保存
                final_result = await self._assemble_final_graph(conversation_id)
                if final_result["success"]:
                    # 发送完成信息
                    completion_chunk = {
                        "completion": {
                            "graph_name": final_result["graph_name"],
                            "message": f"图 '{final_result['graph_name']}' 生成完成！"
                        }
                    }
                    yield f"data: {json.dumps(completion_chunk)}\n\n"

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"AI图生成流式处理出错: {str(e)}")
            error_chunk = {
                "error": {
                    "message": str(e),
                    "type": "api_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    async def _create_conversation(self, user_id: str, model_name: str, requirement: str,
                                   conversation_id: Optional[str] = None) -> Optional[str]:
        """创建新的图生成对话"""
        try:
            # 如果没有提供conversation_id，自动生成
            if conversation_id is None:
                conversation_id = f"gen_{uuid.uuid4().hex[:16]}"

            # 创建对话
            success = await mongodb_service.create_graph_generation_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                model_name=model_name
            )

            if not success:
                return None

            # 构建系统提示词
            system_prompt = await self._build_system_prompt()

            # 添加系统消息
            system_message = {
                "role": "system",
                "content": system_prompt
            }
            await mongodb_service.add_message_to_graph_generation(conversation_id, system_message)

            # 添加用户需求消息
            user_message = {
                "role": "user",
                "content": requirement
            }
            await mongodb_service.add_message_to_graph_generation(conversation_id, user_message)

            logger.info(f"创建图生成对话成功: {conversation_id}")
            return conversation_id

        except Exception as e:
            logger.error(f"创建图生成对话时出错: {str(e)}")
            return None

    async def _continue_conversation(self, conversation_id: str, requirement: str) -> bool:
        """继续现有对话"""
        try:
            # 确保对话存在
            conversation_data = await mongodb_service.get_graph_generation_conversation(conversation_id)
            if not conversation_data:
                logger.error(f"对话不存在: {conversation_id}")
                return False

            # 添加新的用户消息
            user_message = {
                "role": "user",
                "content": requirement
            }
            return await mongodb_service.add_message_to_graph_generation(conversation_id, user_message)

        except Exception as e:
            logger.error(f"继续对话时出错: {str(e)}")
            return False

    async def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        try:
            # 获取可用模型列表
            models = model_service.get_all_models()
            models_description = "当前可用的模型：\n"
            for model in models:
                models_description += f"- {model['name']}: {model.get('model', 'N/A')}\n"

            # 1. 连接所有服务器以确保所有工具可用
            connect_result = await mcp_service.connect_all_servers()
            logger.info(f"连接所有服务器结果: {connect_result}")

            # 2. 获取所有工具信息
            all_tools_data = await mcp_service.get_all_tools()

            # 3. 过滤和转换工具信息为文本描述，添加清晰的标签
            tools_description = ""

            if not all_tools_data:
                tools_description = "当前没有可用的MCP工具。\n\n"
            else:
                tools_description += "# 可用MCP工具\n\n"

                # 统计服务器和工具总数
                server_count = len(all_tools_data)
                total_tools = sum(len(tools) for tools in all_tools_data.values())
                tools_description += f"系统中共有 {server_count} 个MCP服务，提供 {total_tools} 个工具。\n\n"

                # 遍历每个服务器
                for server_name, tools in all_tools_data.items():
                    tools_description += f"## 服务：{server_name}\n\n"

                    if not tools:
                        tools_description += "此服务未提供工具。\n\n"
                        continue

                    # 显示此服务的工具数量
                    tools_description += f"此服务提供 {len(tools)} 个工具：\n\n"

                    # 遍历服务提供的每个工具
                    for i, tool in enumerate(tools, 1):
                        # 从工具数据中提取需要的字段
                        tool_name = tool.get("name", "未知工具")
                        tool_desc = tool.get("description", "无描述")

                        # 添加工具标签和编号
                        tools_description += f"### 工具 {i}：{tool_name}\n\n"
                        tools_description += f"**工具说明**：{tool_desc}\n\n"

                        # 添加分隔符，除非是最后一个工具
                        if i < len(tools):
                            tools_description += "---\n\n"

                    tools_description += "***\n\n"

            template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates",
                                         "prompt_template.md")

            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    template_content = f.read()
            except FileNotFoundError:
                logger.error(f"找不到提示词模板文件: {template_path}")
                raise FileNotFoundError(f"提示词模板文件不存在: {template_path}")

            # 替换占位符
            system_prompt = template_content.replace("{MODELS_DESCRIPTION}", models_description)
            system_prompt = system_prompt.replace("{TOOLS_DESCRIPTION}", tools_description)

            return system_prompt

        except Exception as e:
            logger.error(f"构建系统提示词时出错: {str(e)}")
            raise e  # 直接抛出异常，不使用默认提示词

    async def _parse_and_update_results(self, conversation_id: str, response_content: str):
        """解析AI响应并更新结果"""
        try:
            # 解析响应内容
            parsed_results = parse_ai_generation_response(response_content)

            # 只更新非空的结果
            update_data = {}
            for key, value in parsed_results.items():
                if key != "raw_response" and value is not None:
                    if key == "nodes" and len(value) > 0:
                        update_data[key] = value
                    elif key != "nodes":
                        update_data[key] = value

            if update_data:
                await mongodb_service.update_graph_generation_parsed_results(
                    conversation_id, update_data
                )
                logger.info(f"更新解析结果: {list(update_data.keys())}")

        except Exception as e:
            logger.error(f"解析和更新结果时出错: {str(e)}")

    async def _check_completion(self, conversation_id: str) -> Dict[str, Any]:
        """检查是否完成了所有必需阶段"""
        try:
            conversation_data = await mongodb_service.get_graph_generation_conversation(conversation_id)
            if not conversation_data:
                return {"completed": False, "missing": ["conversation_data"]}

            parsed_results = conversation_data.get("parsed_results", {})

            # 检查必需的字段
            required_fields = ["analysis", "todo", "graph_name", "graph_description", "nodes", "end_template"]
            missing_fields = []

            for field in required_fields:
                value = parsed_results.get(field)
                if field == "nodes":
                    if not value or len(value) == 0:
                        missing_fields.append(field)
                else:
                    if not value:
                        missing_fields.append(field)

            completed = len(missing_fields) == 0

            return {
                "completed": completed,
                "missing": missing_fields,
                "parsed_results": parsed_results
            }

        except Exception as e:
            logger.error(f"检查完成状态时出错: {str(e)}")
            return {"completed": False, "missing": ["error"], "error": str(e)}

    async def _assemble_final_graph(self, conversation_id: str) -> Dict[str, Any]:
        """组装最终图配置并保存"""
        try:
            conversation_data = await mongodb_service.get_graph_generation_conversation(conversation_id)
            if not conversation_data:
                return {"success": False, "error": "获取对话数据失败"}

            parsed_results = conversation_data.get("parsed_results", {})

            # 构建最终图配置
            graph_config = {
                "name": parsed_results.get("graph_name"),
                "description": parsed_results.get("graph_description", ""),
                "nodes": parsed_results.get("nodes", []),
                "end_template": parsed_results.get("end_template")
            }

            # 验证图配置
            try:
                validated_config = GraphConfig(**graph_config)
            except Exception as e:
                return {"success": False, "error": f"图配置验证失败: {str(e)}"}

            # 保存图配置到文件系统
            from app.services.graph_service import graph_service
            save_success = graph_service.save_graph(validated_config.name, validated_config.dict())

            if not save_success:
                return {"success": False, "error": "保存图配置到文件系统失败"}

            # 更新数据库中的最终配置
            await mongodb_service.update_graph_generation_final_config(
                conversation_id, validated_config.dict()
            )

            logger.info(f"成功组装并保存图: {validated_config.name}")

            return {
                "success": True,
                "graph_name": validated_config.name,
                "graph_config": validated_config.dict()
            }

        except Exception as e:
            logger.error(f"组装最终图配置时出错: {str(e)}")
            return {"success": False, "error": str(e)}