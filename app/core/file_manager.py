import json
import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

from app.core.config import settings

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
            return [f.stem for f in settings.AGENT_DIR.glob("*.json")]
        except Exception as e:
            logger.error(f"Error listing agents: {str(e)}")
            return []

    @staticmethod
    def load_agent(agent_name: str) -> Optional[Dict[str, Any]]:
        """加载特定Agent的配置"""
        agent_path = settings.get_agent_path(agent_name)
        if not agent_path.exists():
            return None
        return FileManager.load_json(agent_path)

    @staticmethod
    def save_agent(agent_name: str, config: Dict[str, Any]) -> bool:
        """保存Agent配置"""
        agent_path = settings.get_agent_path(agent_name)
        return FileManager.save_json(agent_path, config)

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
                return False  # 目标名称已存在

            # 加载配置，修改后保存到新文件
            config = FileManager.load_json(old_path)
            FileManager.save_json(new_path, config)
            old_path.unlink()  # 删除旧文件

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

        Args:
            conversation_id: 会话ID
            node_name: 节点名称
            content: 要保存的内容
            file_ext: 文件扩展名（不带点）

        Returns:
            保存文件的路径，如果保存失败则返回None
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