import json
import os
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