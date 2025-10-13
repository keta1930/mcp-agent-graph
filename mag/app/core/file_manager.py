import json
import os
import time
import tempfile
import shutil
import threading
import platform
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import re
import copy
import subprocess
import sys
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

    # ===== MCP 工具管理 =====
    @staticmethod
    def list_mcp_tools() -> List[str]:
        """列出所有AI生成的MCP工具"""
        try:
            tools = []
            if settings.MCP_TOOLS_DIR.exists():
                for d in settings.MCP_TOOLS_DIR.glob("*/"):
                    if d.is_dir():
                        tools.append(d.name)
            return sorted(tools)
        except Exception as e:
            logger.error(f"列出MCP工具时出错: {str(e)}")
            return []

    @staticmethod
    def create_mcp_tool(tool_name: str, script_files: Dict[str, str],
                        readme: str, dependencies: str) -> bool:
        """创建MCP工具目录和文件"""
        try:
            tool_dir = settings.get_mcp_tool_dir(tool_name)
            tool_dir.mkdir(parents=True, exist_ok=True)

            # 保存脚本文件
            for filename, content in script_files.items():
                script_path = tool_dir / filename
                with open(script_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                # 如果是Python文件，设置可执行权限
                if filename.endswith('.py'):
                    script_path.chmod(0o755)

            # 保存README文件
            readme_path = tool_dir / "README.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme)

            # 创建虚拟环境和安装依赖
            if dependencies.strip():
                # 1. 初始化uv项目（创建pyproject.toml）
                result = subprocess.run([
                    "uv", "init", "--bare"
                ], capture_output=True, text=True, cwd=str(tool_dir))

                if result.returncode != 0:
                    logger.error(f"初始化uv项目失败: {result.stderr}")
                    return False

                # 2. 创建虚拟环境
                result = subprocess.run([
                    "uv", "venv", str(tool_dir / ".venv")
                ], capture_output=True, text=True, cwd=str(tool_dir))

                if result.returncode != 0:
                    logger.error(f"创建虚拟环境失败: {result.stderr}")
                    return False

                # 3. 安装依赖
                deps = [dep.strip() for dep in dependencies.split() if dep.strip()]
                if deps:
                    result = subprocess.run([
                                                "uv", "add"
                                            ] + deps, capture_output=True, text=True, cwd=str(tool_dir))

                    if result.returncode != 0:
                        logger.error(f"安装依赖失败: {result.stderr}")
                        return False

            logger.info(f"成功创建MCP工具: {tool_name}")
            return True

        except Exception as e:
            logger.error(f"创建MCP工具 {tool_name} 时出错: {str(e)}")
            return False

    @staticmethod
    def delete_mcp_tool(tool_name: str) -> bool:
        """删除MCP工具目录"""
        try:
            tool_dir = settings.get_mcp_tool_dir(tool_name)
            if tool_dir.exists():
                shutil.rmtree(tool_dir)
                logger.info(f"已删除MCP工具目录: {tool_dir}")
                return True
            else:
                logger.warning(f"MCP工具目录不存在: {tool_dir}")
                return False
        except Exception as e:
            logger.error(f"删除MCP工具 {tool_name} 时出错: {str(e)}")
            return False

    @staticmethod
    def mcp_tool_exists(tool_name: str) -> bool:
        """检查MCP工具是否存在"""
        tool_dir = settings.get_mcp_tool_dir(tool_name)
        return tool_dir.exists() and tool_dir.is_dir()

    @staticmethod
    def get_mcp_tool_main_script(tool_name: str) -> Optional[Path]:
        """获取MCP工具的主脚本路径"""
        tool_dir = settings.get_mcp_tool_dir(tool_name)
        if not tool_dir.exists():
            return None

        # 常见的主脚本名称
        main_scripts = ["main_server.py", "server.py", "main.py"]
        for script_name in main_scripts:
            script_path = tool_dir / script_name
            if script_path.exists():
                return script_path

        # 如果没找到，返回第一个.py文件
        for py_file in tool_dir.glob("*.py"):
            return py_file

        return None

    @staticmethod
    def get_mcp_tool_venv_python(tool_name: str) -> Optional[Path]:
        """获取MCP工具虚拟环境的Python解释器路径"""
        tool_dir = settings.get_mcp_tool_dir(tool_name)
        venv_dir = tool_dir / ".venv"

        if not venv_dir.exists():
            return None

        # 根据操作系统确定Python解释器路径
        system = platform.system()
        if system == "Windows":
            python_path = venv_dir / "Scripts" / "python.exe"
        else:
            python_path = venv_dir / "bin" / "python"

        return python_path if python_path.exists() else None