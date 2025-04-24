import os
import platform
from pathlib import Path
from typing import Dict, Any, Optional, List

# 检查是否在Docker环境中
IN_DOCKER = os.environ.get('APP_ENV') == 'production'

# 尝试导入Docker环境的配置覆盖
if IN_DOCKER:
    try:
        from app.core.docker_config_override import get_mag_dir
    except ImportError:
        get_mag_dir = None


class Settings:
    """应用配置设置"""

    # 应用版本和名称
    APP_NAME: str = "MAG - MCP Agent Graph"
    APP_VERSION: str = "0.1.0"

    # 根据操作系统确定配置目录
    @property
    def MAG_DIR(self) -> Path:
        """获取MAG配置目录"""

        # 默认行为
        system = platform.system()
        home = Path.home()

        if system == "Windows":
            return home / ".mag"
        elif system == "Darwin":  # macOS
            return home / ".mag"
        elif system == "Linux":
            return home / ".mag"
        else:
            return home / ".mag"

    @property
    def AGENT_DIR(self) -> Path:
        """获取Agent配置目录"""
        return self.MAG_DIR / "agent"

    @property
    def MODEL_PATH(self) -> Path:
        """获取模型配置文件路径"""
        return self.MAG_DIR / "model.json"

    @property
    def MCP_PATH(self) -> Path:
        """获取MCP配置文件路径"""
        return self.MAG_DIR / "mcp.json"

    def ensure_directories(self) -> None:
        """确保所有必要的目录存在"""
        self.MAG_DIR.mkdir(exist_ok=True)
        self.AGENT_DIR.mkdir(exist_ok=True)

    def get_agent_path(self, agent_name: str) -> Path:
        """获取指定Agent的配置文件路径"""
        return self.AGENT_DIR / f"{agent_name}.json"


# 创建全局设置实例
settings = Settings()