import asyncio
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
import os
from pathlib import Path

from app.core.file_manager import FileManager
from app.services.mongodb_service import mongodb_service
from app.services.model_service import model_service
from app.utils.text_parser import parse_ai_mcp_generation_response

logger = logging.getLogger(__name__)


class AIMCPGenerator:
    """AI MCP生成器 - 负责多轮交互式MCP服务器生成"""

    def __init__(self):
        pass

    async def ai_generate_stream(self,
                                 requirement: str,
                                 model_name: str,
                                 conversation_id: Optional[str] = None,
                                 user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """
        AI生成MCP的流式接口
        """
        try:
            # 检查是否为结束指令
            if requirement.strip() == "<end>END</end>":
                # 处理结束指令
                async for chunk in self._handle_end_instruction(conversation_id):
                    yield chunk
                return

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
                conversation_id = await self._create_conversation(user_id, requirement)
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
                existing_conversation = await mongodb_service.get_mcp_generation_conversation(conversation_id)
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
                    success = await self._create_conversation(user_id, requirement, conversation_id)
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
            conversation_data = await mongodb_service.get_mcp_generation_conversation(conversation_id)
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
            await mongodb_service.add_message_to_mcp_generation(conversation_id, assistant_message)

            # 更新token使用量
            if api_usage:
                await mongodb_service.update_mcp_generation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=api_usage["prompt_tokens"],
                    completion_tokens=api_usage["completion_tokens"]
                )

            # 解析响应并更新结果
            await self._parse_and_update_results(conversation_id, accumulated_content)

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"AI MCP生成流式处理出错: {str(e)}")
            error_chunk = {
                "error": {
                    "message": str(e),
                    "type": "api_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    async def _handle_end_instruction(self, conversation_id: Optional[str]) -> AsyncGenerator[str, None]:
        """处理结束指令"""
        try:
            if not conversation_id:
                error_chunk = {
                    "error": {
                        "message": "没有提供对话ID",
                        "type": "parameter_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"
                return

            # 检查是否完成了所有阶段
            completion_result = await self._check_completion(conversation_id)
            if completion_result["completed"]:
                # 组装最终MCP配置并创建工具
                final_result = await self._assemble_final_mcp(conversation_id)
                if final_result["success"]:
                    # 发送完成信息
                    completion_chunk = {
                        "completion": {
                            "tool_name": final_result["tool_name"],
                            "message": f"MCP工具 '{final_result['tool_name']}' 生成完成！"
                        }
                    }
                    yield f"data: {json.dumps(completion_chunk)}\n\n"
                else:
                    error_chunk = {
                        "error": {
                            "message": f"组装最终MCP工具失败: {final_result.get('error', '未知错误')}",
                            "type": "assembly_error"
                        }
                    }
                    yield f"data: {json.dumps(error_chunk)}\n\n"
            else:
                # 发送未完成信息
                missing_fields = completion_result.get("missing", [])
                incomplete_chunk = {
                    "incomplete": {
                        "message": f"MCP工具设计尚未完成，缺少: {', '.join(missing_fields)}",
                        "missing_fields": missing_fields
                    }
                }
                yield f"data: {json.dumps(incomplete_chunk)}\n\n"

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"处理结束指令时出错: {str(e)}")
            error_chunk = {
                "error": {
                    "message": str(e),
                    "type": "end_instruction_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    async def _parse_and_update_results(self, conversation_id: str, response_content: str):
        """解析AI响应并更新结果"""
        try:
            # 解析响应内容
            parsed_results = parse_ai_mcp_generation_response(response_content)

            # 只包含非空的结果
            update_data = {}
            for key, value in parsed_results.items():
                if key != "raw_response" and value is not None:
                    if key in ["script_files"] and isinstance(value, dict) and len(value) > 0:
                        update_data[key] = value
                    elif key in ["delete_script_files"] and isinstance(value, list) and len(value) > 0:
                        update_data[key] = value
                    elif key not in ["script_files", "delete_script_files"]:
                        update_data[key] = value

            if update_data:
                await mongodb_service.update_mcp_generation_parsed_results(
                    conversation_id, update_data
                )
                logger.info(f"更新MCP解析结果: {list(update_data.keys())}")

        except Exception as e:
            logger.error(f"解析和更新结果时出错: {str(e)}")

    async def _create_conversation(self, user_id: str, requirement: str,
                                   conversation_id: Optional[str] = None) -> Optional[str]:
        """创建新的MCP生成对话"""
        try:
            # 如果没有提供conversation_id，自动生成
            if conversation_id is None:
                conversation_id = f"mcp_{uuid.uuid4().hex[:16]}"

            # 创建对话
            success = await mongodb_service.create_mcp_generation_conversation(
                conversation_id=conversation_id,
                user_id=user_id
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
            await mongodb_service.add_message_to_mcp_generation(conversation_id, system_message)

            # 添加用户需求消息
            user_message = {
                "role": "user",
                "content": requirement
            }
            await mongodb_service.add_message_to_mcp_generation(conversation_id, user_message)

            logger.info(f"创建MCP生成对话成功: {conversation_id}")
            return conversation_id

        except Exception as e:
            logger.error(f"创建MCP生成对话时出错: {str(e)}")
            return None

    async def _continue_conversation(self, conversation_id: str, requirement: str) -> bool:
        """继续现有对话"""
        try:
            # 确保对话存在
            conversation_data = await mongodb_service.get_mcp_generation_conversation(conversation_id)
            if not conversation_data:
                logger.error(f"对话不存在: {conversation_id}")
                return False

            # 添加新的用户消息
            user_message = {
                "role": "user",
                "content": requirement
            }
            return await mongodb_service.add_message_to_mcp_generation(conversation_id, user_message)

        except Exception as e:
            logger.error(f"继续对话时出错: {str(e)}")
            return False

    async def _build_system_prompt(self) -> str:
        """构建系统提示词"""
        try:
            # 1. 连接所有服务器以确保所有工具可用
            from app.services.mcp_service import mcp_service
            connect_result = await mcp_service.connect_all_servers()
            logger.info(f"连接所有服务器结果: {connect_result}")

            # 2. 获取所有工具信息
            all_tools_data = await mcp_service.get_all_tools()

            # 3. 处理工具描述
            tools_description = ""

            if not all_tools_data:
                tools_description = "当前没有可用的MCP工具。\n\n"
            else:
                tools_description += "# 现有工具列表\n\n"

                for server_name, tools in all_tools_data.items():
                    if tools:
                        tools_description += f"## 服务：{server_name}\n\n"
                        for tool in tools:
                            tool_name = tool.get("name", "未知工具")
                            tool_desc = tool.get("description", "无描述")
                            tools_description += f"- **{tool_name}**：{tool_desc}\n"
                        tools_description += "\n"

            # 4. 读取MCP生成模板文件
            template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates",
                                         "mcp_generator_template.md")

            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    template_content = f.read()
            except FileNotFoundError:
                logger.error(f"找不到MCP生成模板文件: {template_path}")
                raise FileNotFoundError(f"MCP生成模板文件不存在: {template_path}")

            # 5. 替换模板中的占位符
            system_prompt = template_content.replace("{TOOLS_DESCRIPTION}", tools_description)
            system_prompt = system_prompt.replace("{REQUIREMENT}", "{REQUIREMENT}")  # 保持占位符，在实际使用时替换

            return system_prompt

        except Exception as e:
            logger.error(f"构建系统提示词时出错: {str(e)}")
            raise e

    async def _check_completion(self, conversation_id: str) -> Dict[str, Any]:
        """检查是否完成了所有必需阶段"""
        try:
            conversation_data = await mongodb_service.get_mcp_generation_conversation(conversation_id)
            if not conversation_data:
                return {"completed": False, "missing": ["conversation_data"]}

            parsed_results = conversation_data.get("parsed_results", {})

            # 检查必需的字段（新增folder_name）
            required_fields = ["analysis", "todo", "folder_name", "script_files", "dependencies", "readme"]
            missing_fields = []

            for field in required_fields:
                value = parsed_results.get(field)
                if field == "script_files":
                    if not value or len(value) == 0:
                        missing_fields.append(field)
                    elif "main.py" not in value:
                        missing_fields.append("main.py脚本")
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

    async def _assemble_final_mcp(self, conversation_id: str) -> Dict[str, Any]:
        """组装最终MCP工具并创建、注册"""
        try:
            conversation_data = await mongodb_service.get_mcp_generation_conversation(conversation_id)
            if not conversation_data:
                return {"success": False, "error": "获取对话数据失败"}

            parsed_results = conversation_data.get("parsed_results", {})

            # 使用LLM生成的folder_name
            folder_name = parsed_results.get("folder_name")
            if not folder_name:
                return {"success": False, "error": "缺少文件夹名称"}

            # 确保工具名称唯一
            original_name = folder_name
            counter = 1
            while FileManager.mcp_tool_exists(folder_name):
                folder_name = f"{original_name}_{counter}"
                counter += 1

            # 构建最终MCP配置
            script_files = parsed_results.get("script_files", {})
            dependencies = parsed_results.get("dependencies", "")
            readme = parsed_results.get("readme", "# MCP Tool\n\nAI生成的MCP工具")

            # 创建MCP工具
            success = FileManager.create_mcp_tool(
                folder_name,
                script_files,
                readme,
                dependencies
            )

            if not success:
                return {"success": False, "error": "创建MCP工具文件失败"}

            # 注册MCP工具到配置
            register_success = await self.register_ai_mcp_tool_stdio(folder_name)
            if not register_success:
                # 注册失败，清理文件
                FileManager.delete_mcp_tool(folder_name)
                return {"success": False, "error": "注册MCP工具到配置失败"}

            logger.info(f"成功创建并注册MCP工具: {folder_name}")

            return {
                "success": True,
                "tool_name": folder_name
            }

        except Exception as e:
            logger.error(f"组装最终MCP工具时出错: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_mcp_generator_template(self, requirement: str, all_tools_data: Dict[str, List[Dict]] = None) -> str:
        """
        获取MCP生成器的提示词模板

        Args:
            requirement: 用户需求
            all_tools_data: 所有工具数据，如果为None则需要外部提供

        Returns:
            生成的提示词模板
        """
        try:
            # 1. 读取模板文件
            current_file_dir = Path(__file__).parent.parent.parent
            template_path = current_file_dir / "templates" / "mcp_generator_template.md"

            if not template_path.exists():
                raise FileNotFoundError("找不到MCP生成器模板文件")

            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()

            # 2. 处理工具描述
            tools_description = ""

            if not all_tools_data:
                tools_description = "当前没有可用的MCP工具。\n\n"
            else:
                tools_description += "# 现有工具列表\n\n"

                for server_name, tools in all_tools_data.items():
                    if tools:
                        tools_description += f"## 服务：{server_name}\n\n"
                        for tool in tools:
                            tool_name = tool.get("name", "未知工具")
                            tool_desc = tool.get("description", "无描述")
                            tools_description += f"- **{tool_name}**：{tool_desc}\n"
                        tools_description += "\n"

            # 3. 替换模板中的占位符
            final_prompt = template_content.replace("{REQUIREMENT}", requirement)
            final_prompt = final_prompt.replace("{TOOLS_DESCRIPTION}", tools_description)

            return final_prompt

        except Exception as e:
            logger.error(f"生成MCP生成器模板时出错: {str(e)}")
            raise

    async def register_ai_mcp_tool_stdio(self, tool_name: str) -> bool:
        """注册AI生成的MCP工具到配置（使用stdio）"""
        try:
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()

            # 获取工具的虚拟环境Python路径和主脚本路径
            venv_python = FileManager.get_mcp_tool_venv_python(tool_name)
            main_script = FileManager.get_mcp_tool_main_script(tool_name)

            if not venv_python or not main_script:
                logger.error(f"找不到工具 {tool_name} 的Python解释器或主脚本")
                return False

            # 添加新的MCP服务器配置（使用stdio）
            current_config.setdefault("mcpServers", {})[tool_name] = {
                "autoApprove": [],
                "disabled": False,
                "timeout": 60,
                "command": str(venv_python),
                "args": [str(main_script)],
                "transportType": "stdio",
                "ai_generated": True  # 标记为AI生成的工具
            }

            # 保存配置
            from app.services.mcp_service import mcp_service
            success = await mcp_service.update_config(current_config)
            if success.get("status", {}).get("message"):
                logger.info(f"成功注册AI生成的MCP工具: {tool_name}")
                return True
            else:
                logger.error(f"注册MCP工具失败: {success}")
                return False

        except Exception as e:
            logger.error(f"注册AI生成的MCP工具时出错: {str(e)}")
            return False

    async def unregister_ai_mcp_tool_stdio(self, tool_name: str) -> bool:
        """从配置中注销AI生成的MCP工具"""
        try:
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()

            # 删除MCP服务器配置
            if tool_name in current_config.get("mcpServers", {}):
                del current_config["mcpServers"][tool_name]

                # 保存配置
                from app.services.mcp_service import mcp_service
                success = await mcp_service.update_config(current_config)
                if success.get("status", {}).get("message"):
                    logger.info(f"成功注销AI生成的MCP工具: {tool_name}")
                    return True
                else:
                    logger.error(f"注销MCP工具失败: {success}")
                    return False
            else:
                logger.warning(f"MCP工具 {tool_name} 在配置中不存在")
                return True

        except Exception as e:
            logger.error(f"注销AI生成的MCP工具时出错: {str(e)}")
            return False