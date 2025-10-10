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
    def ensure_attachment_dir_atomic(conversation_id: str) -> Path:
        """确保附件目录存在"""
        attachment_dir = FileManager.get_conversation_attachment_dir(conversation_id)

        # 使用 exist_ok=True 来处理并发创建
        try:
            attachment_dir.mkdir(parents=True, exist_ok=True)
            return attachment_dir
        except FileExistsError:
            # 目录已存在，这是正常情况
            return attachment_dir
        except Exception as e:
            logger.error(f"创建附件目录时出错: {str(e)}")
            raise

    @staticmethod
    def ensure_attachment_dir(conversation_id: str) -> Path:
        """确保附件目录存在并返回路径"""
        return FileManager.ensure_attachment_dir_atomic(conversation_id)

    @staticmethod
    def cleanup_conversation_files(conversation_id: str):
        """清理会话文件（用于错误恢复）"""
        try:
            conversation_dir = FileManager.get_conversation_dir(conversation_id)
            if conversation_dir.exists():
                shutil.rmtree(conversation_dir)
                logger.info(f"已清理会话文件: {conversation_dir}")
        except Exception as e:
            logger.error(f"清理会话文件时出错: {str(e)}")

    @staticmethod
    def save_node_output_to_file_atomic(conversation_id: str, node_name: str,
                                        content: str, file_ext: str) -> Optional[str]:
        """保存节点输出到文件"""
        try:
            # 创建时间戳（包含微秒）
            now = time.time()
            timestamp = time.strftime("%H%M%S", time.localtime(now))
            microseconds = int((now % 1) * 1000000)
            full_timestamp = f"{timestamp}_{microseconds:06d}"

            # 确保附件目录存在
            attachment_dir = FileManager.ensure_attachment_dir(conversation_id)

            # 生成唯一文件名
            base_filename = f"{node_name}_{full_timestamp}"
            filename = f"{base_filename}.{file_ext}"
            file_path = attachment_dir / filename

            # 如果文件已存在，添加计数器
            counter = 1
            while file_path.exists():
                filename = f"{base_filename}_{counter}.{file_ext}"
                file_path = attachment_dir / filename
                counter += 1
                if counter > 100:  # 防止无限循环
                    logger.error(f"无法生成唯一文件名: {base_filename}")
                    return None

            # 使用临时文件+原子重命名
            with tempfile.NamedTemporaryFile(
                    mode='w',
                    encoding='utf-8',
                    dir=str(attachment_dir),
                    prefix=f"temp_{node_name}_",
                    suffix=f".{file_ext}",
                    delete=False
            ) as temp_file:
                temp_file.write(content)
                temp_path = temp_file.name

            # 重命名
            shutil.move(temp_path, str(file_path))

            logger.info(f"保存节点输出: {file_path}")
            return str(file_path)

        except Exception as e:
            logger.error(f"保存节点输出时出错: {str(e)}")
            # 清理临时文件
            try:
                if 'temp_path' in locals() and Path(temp_path).exists():
                    Path(temp_path).unlink()
            except:
                pass
            return None

    @staticmethod
    def save_node_output_to_file(conversation_id: str, node_name: str, content: str, file_ext: str) -> Optional[str]:
        """将节点输出保存到文件"""   
        return FileManager.save_node_output_to_file_atomic(conversation_id, node_name, content, file_ext)

    @staticmethod
    def get_conversation_attachments(conversation_id: str) -> List[Dict[str, Any]]:
        """获取会话附件目录中的所有文件信息"""
        attachment_dir = FileManager.get_conversation_attachment_dir(conversation_id)

        if not attachment_dir.exists():
            return []

        attachments = []
        for file_path in attachment_dir.glob("*"):
            if file_path.is_file():
                # 获取文件信息
                file_info = {
                    "name": file_path.name,
                    "path": str(file_path),
                    "size": file_path.stat().st_size,
                    "type": file_path.suffix.lstrip('.').lower(),  # 文件类型（扩展名）
                    "modified": time.ctime(file_path.stat().st_mtime),  # 修改时间
                    "relative_path": f"attachment/{file_path.name}"
                }
                attachments.append(file_info)

        # 按修改时间排序，最新的在前
        attachments.sort(key=lambda x: os.path.getmtime(x["path"]), reverse=True)

        return attachments

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