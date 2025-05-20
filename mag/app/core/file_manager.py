import json
import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import re
import shutil
from app.core.config import settings
import copy
logger = logging.getLogger(__name__)


class FileManager:
    """处理MAG系统的文件操作"""

    @staticmethod
    def initialize() -> None:
        """初始化文件系统，确保必要的目录和文件存在"""
        # 确保目录存在
        settings.ensure_directories()

        # 初始化默认MCP配置（如果不存在）
        if not settings.MCP_PATH.exists():
            FileManager.save_mcp_config({"mcpServers": {}})
            logger.info(f"Created default MCP config at {settings.MCP_PATH}")

        # 初始化默认模型配置（如果不存在）
        if not settings.MODEL_PATH.exists():
            FileManager.save_model_config([])
            logger.info(f"Created default model config at {settings.MODEL_PATH}")

    @staticmethod
    def load_json(file_path: Path) -> Dict[str, Any]:
        """从文件加载JSON配置"""
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading JSON from {file_path}: {str(e)}")
            return {}

    @staticmethod
    def save_json(file_path: Path, data: Dict[str, Any]) -> bool:
        """保存JSON配置到文件"""
        try:
            # 确保目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving JSON to {file_path}: {str(e)}")
            return False

    @staticmethod
    def load_mcp_config() -> Dict[str, Any]:
        """加载MCP配置"""
        return FileManager.load_json(settings.MCP_PATH)

    @staticmethod
    def save_mcp_config(config: Dict[str, Any]) -> bool:
        """保存MCP配置"""
        return FileManager.save_json(settings.MCP_PATH, config)

    @staticmethod
    def load_model_config() -> List[Dict[str, Any]]:
        """加载模型配置"""
        data = FileManager.load_json(settings.MODEL_PATH)
        return data.get("models", []) if isinstance(data, dict) else []

    @staticmethod
    def save_model_config(models: List[Dict[str, Any]]) -> bool:
        """保存模型配置"""
        return FileManager.save_json(settings.MODEL_PATH, {"models": models})

    @staticmethod
    def list_agents() -> List[str]:
        """列出所有可用的Agent"""
        try:
            agents = set()

            # 处理旧格式（直接在agent目录下的JSON文件）
            for f in settings.AGENT_DIR.glob("*.json"):
                agents.add(f.stem)

            # 处理新格式（agent子目录中的config.json文件）
            for d in settings.AGENT_DIR.glob("*/"):
                if d.is_dir() and (d / "config.json").exists():
                    agents.add(d.name)

            return sorted(list(agents))
        except Exception as e:
            logger.error(f"列出Agent时出错: {str(e)}")
            return []

    @staticmethod
    def save_agent(agent_name: str, config: Dict[str, Any]) -> bool:
        """保存Agent配置"""
        try:
            # 创建Agent目录
            agent_dir = settings.get_agent_dir(agent_name)
            agent_dir.mkdir(parents=True, exist_ok=True)

            # 复制配置的深拷贝以避免修改原始数据
            config_copy = copy.deepcopy(config)

            # 处理提示词文件
            if "nodes" in config_copy:
                # 收集所有节点的提示词
                node_prompts = {}
                for i, node in enumerate(config_copy["nodes"]):
                    node_name = node.get("name", f"node_{i}")

                    # 收集节点的提示词
                    prompts = {}
                    if "system_prompt" in node:
                        prompts["system_prompt"] = node["system_prompt"]
                    if "user_prompt" in node:
                        prompts["user_prompt"] = node["user_prompt"]

                    if prompts:
                        node_prompts[node_name] = prompts

                # 处理提示词文件
                if node_prompts:
                    processed_prompts = FileManager.copy_prompt_files(agent_name, node_prompts)

                    # 更新节点的提示词
                    for i, node in enumerate(config_copy["nodes"]):
                        node_name = node.get("name", f"node_{i}")
                        if node_name in processed_prompts:
                            node_result = processed_prompts[node_name]

                            if "system_prompt" in node_result:
                                node["system_prompt"] = node_result["system_prompt"]
                            if "user_prompt" in node_result:
                                node["user_prompt"] = node_result["user_prompt"]

            # 保存配置到config.json
            config_path = settings.get_agent_config_path(agent_name)
            return FileManager.save_json(config_path, config_copy)
        except Exception as e:
            logger.error(f"保存Agent {agent_name} 时出错: {str(e)}")
            return False

    @staticmethod
    def load_agent(agent_name: str) -> Optional[Dict[str, Any]]:
        """加载Agent配置"""
        config_path = settings.get_agent_config_path(agent_name)

        if config_path.exists():
            return FileManager.load_json(config_path)

        legacy_path = settings.get_agent_path(agent_name)

        if legacy_path.exists():
            config = FileManager.load_json(legacy_path)
            return config

        return None

    @staticmethod
    def delete_agent(agent_name: str) -> bool:
        """删除Agent配置"""
        try:
            agent_path = settings.get_agent_path(agent_name)
            if agent_path.exists():
                agent_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting agent {agent_name}: {str(e)}")
            return False

    @staticmethod
    def rename_agent(old_name: str, new_name: str) -> bool:
        """重命名Agent"""
        try:
            old_path = settings.get_agent_path(old_name)
            new_path = settings.get_agent_path(new_name)

            if not old_path.exists():
                return False

            if new_path.exists():
                return False

            # 加载配置
            config = FileManager.load_json(old_path)
            FileManager.save_json(new_path, config)
            old_path.unlink()

            return True
        except Exception as e:
            logger.error(f"Error renaming agent {old_name} to {new_name}: {str(e)}")
            return False

    # ===== 会话文件管理 =====

    @staticmethod
    def get_conversation_dir(conversation_id: str) -> Path:
        """获取会话目录路径"""
        return settings.CONVERSATION_DIR / conversation_id

    @staticmethod
    def get_conversation_attachment_dir(conversation_id: str) -> Path:
        """获取会话附件目录路径"""
        return FileManager.get_conversation_dir(conversation_id) / "attachment"

    @staticmethod
    def ensure_attachment_dir(conversation_id: str) -> Path:
        """确保附件目录存在并返回路径"""
        attachment_dir = FileManager.get_conversation_attachment_dir(conversation_id)
        attachment_dir.mkdir(parents=True, exist_ok=True)
        return attachment_dir

    @staticmethod
    def save_node_output_to_file(conversation_id: str, node_name: str, content: str, file_ext: str) -> Optional[str]:
        """
        将节点输出保存到文件
        """
        try:
            # 创建时间戳（小时分钟秒）
            timestamp = time.strftime("%H%M%S", time.localtime())

            # 确保附件目录存在
            attachment_dir = FileManager.ensure_attachment_dir(conversation_id)

            # 构建文件名: 节点名+时间戳.扩展名
            filename = f"{node_name}_{timestamp}.{file_ext}"
            file_path = attachment_dir / filename

            # 保存内容到文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            logger.info(f"节点 '{node_name}' 的输出已保存到: {file_path}")

            return str(file_path)
        except Exception as e:
            logger.error(f"保存节点 '{node_name}' 输出到文件时出错: {str(e)}")
            return None

    @staticmethod
    def get_conversation_md_path(conversation_id: str) -> Path:
        """获取会话Markdown文件路径"""
        return FileManager.get_conversation_dir(conversation_id) / f"{conversation_id}.md"

    @staticmethod
    def get_conversation_json_path(conversation_id: str) -> Path:
        """获取会话JSON文件路径"""
        return FileManager.get_conversation_dir(conversation_id) / f"{conversation_id}.json"

    @staticmethod
    def get_conversation_html_path(conversation_id: str) -> Path:
        """获取会话HTML文件路径"""
        return FileManager.get_conversation_dir(conversation_id) / f"{conversation_id}.html"

    @staticmethod
    def save_conversation(conversation_id: str, graph_name: str,
                          start_time: str, md_content: str, json_content: Dict[str, Any],
                          html_content: str = None) -> bool:
        """保存会话内容到Markdown、JSON和HTML文件"""
        try:
            # 创建会话目录
            conversation_dir = FileManager.get_conversation_dir(conversation_id)
            conversation_dir.mkdir(parents=True, exist_ok=True)

            # 保存Markdown文件
            md_path = FileManager.get_conversation_md_path(conversation_id)
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_content)

            # 保存JSON文件
            json_path = FileManager.get_conversation_json_path(conversation_id)
            FileManager.save_json(json_path, json_content)

            # 保存HTML文件（如果提供了HTML内容）
            if html_content:
                html_path = FileManager.get_conversation_html_path(conversation_id)
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)

            return True
        except Exception as e:
            logger.error(f"保存会话 {conversation_id} 时出错: {str(e)}")
            return False

    @staticmethod
    def update_conversation(conversation_id: str, md_content: str, json_content: Dict[str, Any],
                            html_content: str = None) -> bool:
        """更新会话内容"""
        try:
            # 确保会话目录存在
            conversation_dir = FileManager.get_conversation_dir(conversation_id)
            conversation_dir.mkdir(parents=True, exist_ok=True)

            # 更新Markdown文件
            md_path = FileManager.get_conversation_md_path(conversation_id)
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_content)

            # 更新JSON文件
            json_path = FileManager.get_conversation_json_path(conversation_id)
            FileManager.save_json(json_path, json_content)

            # 更新HTML文件（如果提供了HTML内容）
            if html_content:
                html_path = FileManager.get_conversation_html_path(conversation_id)
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)

            return True
        except Exception as e:
            logger.error(f"更新会话 {conversation_id} 时出错: {str(e)}")
            return False

    @staticmethod
    def delete_conversation(conversation_id: str) -> bool:
        """删除会话文件"""
        try:
            success = True
            conversation_dir = FileManager.get_conversation_dir(conversation_id)

            # 检查会话目录是否存在
            if not conversation_dir.exists():
                return False

            # 删除目录中的所有文件
            for file_path in conversation_dir.glob("*"):
                try:
                    if file_path.is_dir():
                        # 递归删除子目录（如attachment）
                        for sub_file in file_path.glob("*"):
                            sub_file.unlink()
                        file_path.rmdir()
                    else:
                        file_path.unlink()
                except Exception as e:
                    logger.error(f"删除文件 {file_path} 时出错: {str(e)}")
                    success = False

            # 删除会话目录
            try:
                conversation_dir.rmdir()
            except Exception as e:
                logger.error(f"删除会话目录 {conversation_dir} 时出错: {str(e)}")
                success = False

            return success
        except Exception as e:
            logger.error(f"删除会话 {conversation_id} 时出错: {str(e)}")
            return False

    @staticmethod
    def load_conversation_md(conversation_id: str) -> Optional[str]:
        """加载会话Markdown内容"""
        try:
            md_path = FileManager.get_conversation_md_path(conversation_id)
            if not md_path.exists():
                return None
            with open(md_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"加载会话Markdown {conversation_id} 时出错: {str(e)}")
            return None

    @staticmethod
    def load_conversation_json(conversation_id: str) -> Optional[Dict[str, Any]]:
        """加载会话JSON内容"""
        try:
            json_path = FileManager.get_conversation_json_path(conversation_id)
            if not json_path.exists():
                return None
            return FileManager.load_json(json_path)
        except Exception as e:
            logger.error(f"加载会话JSON {conversation_id} 时出错: {str(e)}")
            return None

    @staticmethod
    def list_conversations() -> List[str]:
        """列出所有会话"""
        try:
            # 列出会话目录中的所有子目录
            conversation_dirs = [d.name for d in settings.CONVERSATION_DIR.iterdir()
                                 if d.is_dir() and (d / f"{d.name}.md").exists()]
            return conversation_dirs
        except Exception as e:
            logger.error(f"列出会话时出错: {str(e)}")
            return []

    @staticmethod
    def extract_prompt_file_paths(prompt: str) -> List[str]:
        """从提示词中提取文件路径"""
        if not prompt:
            return []

        # 使用正则表达式匹配 {file_path} 格式
        pattern = r'\{([^{}]+)\}'
        matches = re.findall(pattern, prompt)

        # 过滤
        file_paths = []
        for match in matches:
            if Path(match).exists() or '.' in match:
                file_paths.append(match)

        return file_paths

    @staticmethod
    def copy_prompt_files(agent_name: str, node_prompts: Dict[str, str]) -> Dict[str, Dict[str, str]]:
        """复制提示词中引用的文件到Agent目录，并返回更新后的提示词和文件映射"""
        # 确保Agent目录和提示词目录存在
        agent_dir = settings.get_agent_dir(agent_name)
        agent_dir.mkdir(parents=True, exist_ok=True)

        prompt_dir = settings.get_agent_prompt_dir(agent_name)
        prompt_dir.mkdir(parents=True, exist_ok=True)

        result = {}

        # 处理每个节点的提示词
        for node_name, prompts in node_prompts.items():
            node_result = {'files': {}}

            for prompt_type, prompt in prompts.items():
                if not prompt:
                    node_result[prompt_type] = prompt
                    continue

                # 提取文件路径
                file_paths = FileManager.extract_prompt_file_paths(prompt)
                updated_prompt = prompt

                # 处理每个文件
                for file_path in file_paths:
                    source_path = Path(file_path)
                    if not source_path.exists():
                        logger.warning(f"提示词引用的文件不存在: {file_path}")
                        continue

                    # 使用原始文件名
                    file_name = source_path.name
                    dest_path = prompt_dir / file_name

                    # 复制文件
                    try:
                        shutil.copy2(source_path, dest_path)
                        logger.info(f"已复制文件 {source_path} 到 {dest_path}")

                        # 更新提示词，仅使用文件名
                        updated_prompt = updated_prompt.replace(f"{{{file_path}}}", f"{{{file_name}}}")

                        # 记录文件映射
                        node_result['files'][file_path] = file_name
                    except Exception as e:
                        logger.error(f"复制文件时出错 {source_path}: {str(e)}")

                node_result[prompt_type] = updated_prompt

            result[node_name] = node_result

        return result

    @staticmethod
    def get_prompt_file_content(agent_name: str, file_name: str) -> Optional[str]:
        """获取Agent提示词目录中的文件内容"""
        prompt_file_path = settings.get_agent_prompt_dir(agent_name) / file_name

        if not prompt_file_path.exists():
            logger.warning(f"提示词文件不存在: {prompt_file_path}")
            return None

        try:
            with open(prompt_file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"读取提示词文件出错 {prompt_file_path}: {str(e)}")
            return None

    @staticmethod
    def replace_prompt_file_placeholders(agent_name: str, prompt: str) -> str:
        """替换提示词中的文件占位符为文件内容"""
        if not prompt:
            return prompt

        # 查找所有占位符
        pattern = r'\{([^{}]+)\}'
        matches = re.findall(pattern, prompt)

        updated_prompt = prompt

        for file_name in matches:
            # 只处理看起来像文件名的占位符
            if '.' in file_name:
                file_content = FileManager.get_prompt_file_content(agent_name, file_name)
                if file_content is not None:
                    # 替换占位符为文件内容
                    updated_prompt = updated_prompt.replace(f"{{{file_name}}}", file_content)

        return updated_prompt