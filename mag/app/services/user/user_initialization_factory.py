"""
用户初始化工厂

使用工厂模式为新注册用户创建默认资源（模型、Agent、Graph、Prompt、对话等）
资源配置从 JSON 文件中加载
"""
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, List
from uuid import uuid4
from pathlib import Path

logger = logging.getLogger(__name__)


class UserInitializationFactory:
    """用户初始化工厂类 - 负责创建用户的默认资源"""

    def __init__(self, mongodb_client):
        """
        初始化工厂

        Args:
            mongodb_client: MongoDB客户端实例
        """
        self.mongodb_client = mongodb_client
        # 获取模板文件的基础路径
        self.templates_base_path = Path(__file__).parent / "initialization_templates"

    async def initialize_user_resources(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """
        为新用户初始化所有默认资源

        Args:
            user_id: 用户ID
            language: 语言偏好 ('en' 或 'zh')

        Returns:
            初始化结果字典
        """
        results = {
            "user_id": user_id,
            "language": language,
            "models": {"success": False, "created": []},
            "agents": {"success": False, "created": []},
            "graphs": {"success": False, "created": []},
            "prompts": {"success": False, "created": []},
            "conversations": {"success": False, "created": []},
        }

        try:
            # 1. 创建默认模型（语言无关，所以可以从任意语言目录加载）
            models_result = await self._create_default_models(user_id, language)
            results["models"] = models_result

            # 2. 创建默认 Agent（根据语言）
            agents_result = await self._create_default_agents(user_id, language)
            results["agents"] = agents_result

            # 3. 创建默认 Graph（根据语言）
            graphs_result = await self._create_default_graphs(user_id, language)
            results["graphs"] = graphs_result

            # 4. 创建默认 Prompt（根据语言）
            prompts_result = await self._create_default_prompts(user_id, language)
            results["prompts"] = prompts_result

            # 5. 创建默认对话（根据语言）
            conversations_result = await self._create_default_conversations(user_id, language)
            results["conversations"] = conversations_result

            logger.info(f"用户 {user_id} 初始化完成 (语言: {language}): {results}")

            return results

        except Exception as e:
            logger.error(f"用户 {user_id} 初始化失败: {str(e)}")
            return results

    def _load_json_templates(self, language: str, resource_type: str) -> List[Dict[str, Any]]:
        """
        从指定语言和资源类型目录加载所有 JSON 配置文件

        Args:
            language: 语言代码 ('en' 或 'zh')
            resource_type: 资源类型 ('models', 'agents', 'graphs', 'prompts', 'conversations')

        Returns:
            配置列表
        """
        templates = []
        template_dir = self.templates_base_path / language / resource_type

        if not template_dir.exists():
            logger.warning(f"模板目录不存在: {template_dir}")
            return templates

        try:
            for json_file in template_dir.glob("*.json"):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        templates.append(config)
                        logger.debug(f"加载模板: {json_file.name}")
                except Exception as e:
                    logger.error(f"加载模板文件失败 {json_file}: {str(e)}")

        except Exception as e:
            logger.error(f"读取模板目录失败 {template_dir}: {str(e)}")

        return templates

    async def _create_default_models(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """创建默认模型配置（从 JSON 文件加载）"""
        try:
            from app.services.model.model_service import model_service

            models_data = self._load_json_templates(language, "models")

            created_models = []
            for model_data in models_data:
                try:
                    # 使用 ModelService 创建模型
                    success = await model_service.add_model(
                        user_id=user_id,
                        model_config=model_data
                    )

                    if success:
                        created_models.append(model_data["name"])
                        logger.info(f"为用户 {user_id} 创建模型: {model_data['name']}")
                    else:
                        logger.warning(f"创建模型失败: {model_data['name']}")

                except Exception as e:
                    logger.error(f"创建模型 {model_data.get('name', 'unknown')} 时出错: {str(e)}")

            return {
                "success": len(created_models) > 0,
                "created": created_models,
                "total": len(models_data)
            }

        except Exception as e:
            logger.error(f"创建默认模型失败: {str(e)}")
            return {"success": False, "created": [], "total": 0}

    async def _create_default_agents(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """创建默认 Agent（从 JSON 文件加载）"""
        try:
            from app.services.agent.agent_service import agent_service

            agents_data = self._load_json_templates(language, "agents")

            created_agents = []
            for agent_data in agents_data:
                try:
                    # 使用 AgentService 创建 Agent（会自动创建 memory 文档）
                    result = await agent_service.create_agent(
                        agent_config=agent_data,
                        user_id=user_id
                    )

                    if result.get("success"):
                        agent_name = result.get("agent_name")
                        created_agents.append(agent_name)
                        logger.info(f"为用户 {user_id} 创建 Agent: {agent_name}")
                    else:
                        logger.warning(f"创建 Agent 失败: {agent_data['name']}, {result.get('error')}")

                except Exception as e:
                    logger.error(f"创建 Agent {agent_data.get('name', 'unknown')} 时出错: {str(e)}")

            return {
                "success": len(created_agents) > 0,
                "created": created_agents,
                "total": len(agents_data)
            }

        except Exception as e:
            logger.error(f"创建默认 Agent 失败: {str(e)}")
            return {"success": False, "created": [], "total": 0}

    async def _create_default_graphs(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """创建默认 Graph（从 JSON 文件加载）"""
        try:
            from app.services.graph.graph_service import graph_service

            graphs_data = self._load_json_templates(language, "graphs")

            created_graphs = []
            for graph_data in graphs_data:
                try:
                    # 使用 GraphService 创建 Graph
                    success = await graph_service.save_graph(
                        graph_name=graph_data["name"],
                        config=graph_data,
                        user_id=user_id
                    )

                    if success:
                        created_graphs.append(graph_data["name"])
                        logger.info(f"为用户 {user_id} 创建 Graph: {graph_data['name']}")
                    else:
                        logger.warning(f"创建 Graph 失败: {graph_data['name']}")

                except Exception as e:
                    logger.error(f"创建 Graph {graph_data.get('name', 'unknown')} 时出错: {str(e)}")

            return {
                "success": len(created_graphs) > 0,
                "created": created_graphs,
                "total": len(graphs_data)
            }

        except Exception as e:
            logger.error(f"创建默认 Graph 失败: {str(e)}")
            return {"success": False, "created": [], "total": 0}

    async def _create_default_prompts(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """创建默认 Prompt（从 JSON 文件加载）"""
        try:
            from app.models.prompt_schema import PromptCreate
            from app.services.prompt.prompt_service import prompt_service

            prompts_data = self._load_json_templates(language, "prompts")

            created_prompts = []
            for prompt_data in prompts_data:
                try:
                    prompt_create = PromptCreate(**prompt_data)
                    # 使用 PromptService 创建 Prompt
                    result = await prompt_service.create_prompt(
                        prompt_data=prompt_create,
                        user_id=user_id
                    )

                    if result.get("success"):
                        created_prompts.append(prompt_data["name"])
                        logger.info(f"为用户 {user_id} 创建 Prompt: {prompt_data['name']}")
                    else:
                        logger.warning(f"创建 Prompt 失败: {prompt_data['name']}, {result.get('message')}")

                except Exception as e:
                    logger.error(f"创建 Prompt {prompt_data.get('name', 'unknown')} 时出错: {str(e)}")

            return {
                "success": len(created_prompts) > 0,
                "created": created_prompts,
                "total": len(prompts_data)
            }

        except Exception as e:
            logger.error(f"创建默认 Prompt 失败: {str(e)}")
            return {"success": False, "created": [], "total": 0}

    async def _create_default_conversations(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """创建默认演示对话"""
        try:
            conversations_dir = self.templates_base_path / language / "conversations"
            metadata_dir = conversations_dir / "metadata"
            data_dir = conversations_dir / "data"
            files_dir = conversations_dir / "files"

            if not metadata_dir.exists() or not data_dir.exists():
                logger.warning(f"对话模板目录不存在: {conversations_dir}")
                return {"success": False, "created": [], "total": 0}

            created_conversations = []

            for metadata_file in sorted(metadata_dir.glob("*.json")):
                try:
                    data_file = data_dir / metadata_file.name

                    if not data_file.exists():
                        logger.warning(f"找不到对应的数据文件: {data_file}")
                        continue

                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata_doc = json.load(f)

                    with open(data_file, 'r', encoding='utf-8') as f:
                        data_doc = json.load(f)

                    conversation_id = str(uuid4())
                    now = datetime.now()

                    metadata_doc["_id"] = conversation_id
                    metadata_doc["user_id"] = user_id
                    metadata_doc["created_at"] = now
                    metadata_doc["updated_at"] = now

                    data_doc["_id"] = conversation_id
                    data_doc["conversation_id"] = conversation_id

                    documents = metadata_doc.get("documents", {})
                    files_list = documents.get("files", [])

                    if files_list and files_dir.exists():
                        from app.infrastructure.storage.object_storage.conversation_document_manager import ConversationDocumentManager
                        doc_manager = ConversationDocumentManager()

                        for file_meta in files_list:
                            filename = file_meta.get("filename")
                            if filename:
                                file_path = files_dir / filename

                                if file_path.exists():
                                    with open(file_path, 'r', encoding='utf-8') as f:
                                        file_content = f.read()

                                    result = await doc_manager.create_file(
                                        user_id=user_id,
                                        conversation_id=conversation_id,
                                        filename=filename,
                                        content=file_content
                                    )

                                    if result:
                                        file_meta["current_version_id"] = result["version_id"]
                                        file_meta["size"] = result["size"]
                                        file_meta["created_at"] = now
                                        file_meta["updated_at"] = now

                                        if "logs" in file_meta:
                                            for log in file_meta["logs"]:
                                                log["timestamp"] = now

                                        logger.info(f"上传文件到MinIO: {filename} -> {conversation_id}")
                                    else:
                                        logger.warning(f"上传文件失败: {filename}")
                                else:
                                    logger.warning(f"文件不存在: {file_path}")

                    await self.mongodb_client.conversations_collection.insert_one(metadata_doc)
                    logger.info(f"插入conversations文档: {conversation_id}")

                    await self.mongodb_client.agent_run_collection.insert_one(data_doc)
                    logger.info(f"插入agent_run文档: {conversation_id}")

                    created_conversations.append(metadata_doc.get("title", conversation_id))
                    logger.info(f"为用户 {user_id} 创建演示对话: {metadata_doc.get('title')} ({conversation_id})")

                except Exception as e:
                    logger.error(f"创建对话时出错 {metadata_file.name}: {str(e)}")
                    import traceback
                    logger.error(traceback.format_exc())

            return {
                "success": len(created_conversations) > 0,
                "created": created_conversations,
                "total": len(list(metadata_dir.glob("*.json")))
            }

        except Exception as e:
            logger.error(f"创建默认对话失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "created": [], "total": 0}
