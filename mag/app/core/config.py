import platform
import os
from pathlib import Path
from dotenv import load_dotenv

project_root = Path(__file__).parent.parent.parent
mag_services_env_path = project_root / "docker" / "mag_services" / ".env"

if mag_services_env_path.exists():
    load_dotenv(mag_services_env_path)

class Settings:
    """应用配置设置"""

    # 应用版本和名称
    APP_NAME: str = "MAG - MCP Agent Graph"
    APP_VERSION: str = "2.0.0"

    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        f"mongodb://{os.getenv('MONGO_ROOT_USERNAME', 'admin')}:"
        f"{os.getenv('MONGO_ROOT_PASSWORD', 'securepassword123')}@"
        f"localhost:{os.getenv('MONGO_PORT', '27017')}/"
    )

    MONGODB_DB: str = os.getenv("MONGO_DATABASE", "mcp-agent-graph")

    # MinIO 配置
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", f"localhost:{os.getenv('MINIO_API_PORT', '9010')}")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ROOT_USER", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin123")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "mag")

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

    @property
    def CONVERSATION_DIR(self) -> Path:
        """获取会话存储目录"""
        return self.MAG_DIR / "conversation"

    @property
    def EXPORTS_DIR(self) -> Path:
        """获取导出文件存储目录"""
        return self.MAG_DIR / "exports"

    @property
    def MCP_TOOLS_DIR(self) -> Path:
        """获取AI生成的MCP工具存储目录"""
        return self.MAG_DIR / "mcp"

    def ensure_directories(self) -> None:
        """确保所有必要的目录存在"""
        self.MAG_DIR.mkdir(exist_ok=True)
        self.AGENT_DIR.mkdir(exist_ok=True)
        self.CONVERSATION_DIR.mkdir(exist_ok=True)
        self.EXPORTS_DIR.mkdir(exist_ok=True)
        self.MCP_TOOLS_DIR.mkdir(exist_ok=True)

    def get_mcp_tool_dir(self, tool_name: str) -> Path:
        """获取指定MCP工具的目录路径"""
        return self.MCP_TOOLS_DIR / tool_name

    def get_agent_dir(self, agent_name: str) -> Path:
        """获取指定Agent的配置目录路径"""
        return self.AGENT_DIR / agent_name

    def get_agent_config_path(self, agent_name: str) -> Path:
        """获取Agent目录中的配置文件路径"""
        return self.get_agent_dir(agent_name) / "config.json"

# 创建全局设置实例
settings = Settings()