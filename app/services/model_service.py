import logging
import json
import re
from typing import Dict, List, Any, Optional, Union
from openai import OpenAI
from openai.types.chat import ChatCompletion

from app.core.file_manager import FileManager
from app.models.schema import ModelConfig

logger = logging.getLogger(__name__)


class ModelService:
    """模型服务管理"""

    def __init__(self):
        self.models: List[Dict[str, Any]] = []
        self.clients: Dict[str, OpenAI] = {}

    def initialize(self) -> None:
        """初始化模型配置"""
        self.models = FileManager.load_model_config()
        self._initialize_clients()

    def _initialize_clients(self) -> None:
        """初始化所有模型的客户端"""
        for model_config in self.models:
            try:
                client = OpenAI(
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
            # 创建客户端实例以验证配置是否有效
            client = OpenAI(
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
            # 创建客户端实例以验证配置是否有效
            client = OpenAI(
                api_key=model_config["api_key"],
                base_url=model_config["base_url"]
            )

            # 更新模型
            self.models[index] = model_config
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

    def extract_tool_calls(self, content: str) -> List[Dict[str, Any]]:
        """从模型输出中提取工具调用"""
        pattern = r'<tool>\s*<n>(.*?)</n>\s*<server>(.*?)</server>\s*<params>\s*([\s\S]*?)\s*</params>\s*</tool>'
        matches = re.findall(pattern, content)

        tool_calls = []
        for match in matches:
            tool_name, server_name, params_str = match
            try:
                # 尝试解析参数JSON
                params = json.loads(params_str.strip())
                tool_calls.append({
                    "tool_name": tool_name.strip(),
                    "server_name": server_name.strip(),
                    "params": params
                })
            except json.JSONDecodeError as e:
                logger.error(f"无法解析工具参数JSON: {params_str}")
                logger.error(f"错误: {str(e)}")

        return tool_calls

    def format_tool_result(self, tool_name: str, server_name: str, result: Dict[str, Any]) -> str:
        """格式化工具调用结果为XML"""
        if "error" in result:
            return f"""<tool_result>
                    <n>{tool_name}</n>
                    <server>{server_name}</server>
                    <e>{result["error"]}</e>
                    </tool_result>"""
        else:
            return f"""<tool_result>
                    <n>{tool_name}</n>
                    <server>{server_name}</server>
                    <r>
                    {result["content"]}
                    </r>
                    </tool_result>"""

    def create_system_prompt(self, mcp_servers: List[str], mcp_tools: Dict[str, List[Dict[str, Any]]]) -> str:
        """创建系统提示词"""
        # 基础系统提示词
        system_prompt = "你是一个有用的助手，你可以使用以下工具来帮助回答问题。使用工具时，请使用以下格式：\n\n"
        system_prompt += "<tool>\n<n>工具名称</n>\n<server>服务器名称</server>\n<params>\n参数JSON对象\n</params>\n</tool>\n\n"
        system_prompt += "例如：\n\n<tool>\n<n>search</n>\n<server>search_server</server>\n<params>\n{\"query\": \"人工智能\"}\n</params>\n</tool>\n\n"

        # 添加可用的工具
        if mcp_servers and mcp_tools:
            system_prompt += "可用的工具有：\n\n"

            for server_name in mcp_servers:
                if server_name in mcp_tools and mcp_tools[server_name]:
                    system_prompt += f"## 服务器: {server_name}\n\n"

                    for tool in mcp_tools[server_name]:
                        system_prompt += f"### 工具: {tool['name']}\n"
                        system_prompt += f"描述: {tool['description']}\n"
                        system_prompt += "参数格式:\n"
                        system_prompt += f"```\n{json.dumps(tool['input_schema'], ensure_ascii=False, indent=2)}\n```\n\n"

        system_prompt += "记住，如果你需要使用工具，请使用正确的XML格式进行调用，确保<params>中的JSON格式正确。工具的响应将在下一条消息中提供给你。\n"
        system_prompt += "如果你不需要使用工具，可以直接回答问题。"

        return system_prompt

    async def call_model(self,
                         model_name: str,
                         messages: List[Dict[str, Any]],
                         tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """调用模型API，支持handoffs工具调用"""
        client = self.clients.get(model_name)
        if not client:
            return {"status": "error", "error": f"模型 '{model_name}' 未配置或初始化失败"}

        model_config = self.get_model(model_name)
        if not model_config:
            return {"status": "error", "error": f"找不到模型 '{model_name}' 的配置"}

        try:
            # 准备调用参数
            params = {
                "model": model_config["model"],
                "messages": messages
            }

            # 如果提供了工具，添加到参数中
            if tools:
                params["tools"] = tools

            # 调用模型API
            response = client.chat.completions.create(**params)

            # 处理工具调用
            tool_calls = []
            if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
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

            return {
                "status": "success",
                "content": response.choices[0].message.content or "",
                "tool_calls": tool_calls
            }

        except Exception as e:
            logger.error(f"调用模型 '{model_name}' 时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

# 创建全局模型服务实例
model_service = ModelService()