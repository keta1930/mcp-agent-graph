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

    @staticmethod
    def list_agents() -> List[str]:
        """列出所有可用的Agent"""
        try:
            agents = []
            # 只处理新格式（agent子目录中的config.json文件）
            for d in settings.AGENT_DIR.glob("*/"):
                if d.is_dir() and (d / "config.json").exists():
                    agents.append(d.name)
            return sorted(agents)
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
        # 只从新格式目录加载
        config_path = settings.get_agent_config_path(agent_name)
        if config_path.exists():
            return FileManager.load_json(config_path)
        return None

    @staticmethod
    def delete_agent(agent_name: str) -> bool:
        """删除Agent配置"""
        try:
            # 删除图目录（新格式）
            agent_dir = settings.get_agent_dir(agent_name)
            if agent_dir.exists():
                shutil.rmtree(agent_dir)
                logger.info(f"已删除图目录: {agent_dir}")
                return True
            else:
                logger.warning(f"图目录不存在: {agent_dir}")
                return False
        except Exception as e:
            logger.error(f"Error deleting agent {agent_name}: {str(e)}")
            return False

    @staticmethod
    def rename_agent(old_name: str, new_name: str) -> bool:
        """重命名Agent"""
        try:
            old_dir = settings.get_agent_dir(old_name)
            new_dir = settings.get_agent_dir(new_name)

            # 检查原目录是否存在
            if not old_dir.exists():
                logger.warning(f"原图目录不存在: {old_dir}")
                return False

            # 检查新目录是否已存在
            if new_dir.exists():
                logger.warning(f"目标图目录已存在: {new_dir}")
                return False

            # 重命名目录
            old_dir.rename(new_dir)

            # 更新配置文件中的名称
            config_path = settings.get_agent_config_path(new_name)
            if config_path.exists():
                config = FileManager.load_json(config_path)
                if config and "name" in config:
                    config["name"] = new_name
                    FileManager.save_json(config_path, config)

            logger.info(f"已重命名图目录: {old_dir} -> {new_dir}")
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
        """确保附件目录存在并返回路径 - 使用版本"""
        return FileManager.ensure_attachment_dir_atomic(conversation_id)

    @staticmethod
    def save_conversation_atomic(conversation_id: str, graph_name: str,
                                 start_time: str, json_content: Dict[str, Any]) -> bool:
        """保存会话内容，避免并发冲突，只保存JSON文件"""
        try:
            # 获取目标路径
            conversation_dir = FileManager.get_conversation_dir(conversation_id)

            # 确保父目录存在
            conversation_dir.parent.mkdir(parents=True, exist_ok=True)

            # 检查目录是否已存在（防止冲突）
            if conversation_dir.exists():
                logger.error(f"会话目录已存在，可能存在ID冲突: {conversation_dir}")
                return False

            # 创建临时目录
            temp_dir = None
            try:
                # 在同一父目录下创建临时目录
                temp_dir = tempfile.mkdtemp(
                    prefix=f"temp_{conversation_id}_",
                    dir=conversation_dir.parent
                )
                temp_path = Path(temp_dir)

                # 在临时目录中创建JSON文件
                json_path = temp_path / f"{conversation_id}.json"

                # 写入JSON文件
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(json_content, f, ensure_ascii=False, indent=2)

                # 创建attachment子目录
                attachment_dir = temp_path / "attachment"
                attachment_dir.mkdir(exist_ok=True)

                # 重命名（移动整个目录）
                try:
                    shutil.move(str(temp_path), str(conversation_dir))
                    logger.info(f"创建会话目录: {conversation_dir}")
                    return True
                except OSError as e:
                    if "already exists" in str(e).lower():
                        logger.error(f"目标目录已存在，存在并发冲突: {conversation_dir}")
                        return False
                    else:
                        raise

            finally:
                # 清理临时目录（如果还存在）
                if temp_dir and Path(temp_dir).exists():
                    try:
                        shutil.rmtree(temp_dir)
                    except:
                        pass

        except Exception as e:
            logger.error(f"保存会话时出错: {str(e)}")
            return False

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
        """将节点输出保存到文件 - 使用版本"""
        return FileManager.save_node_output_to_file_atomic(conversation_id, node_name, content, file_ext)

    @staticmethod
    def get_conversation_json_path(conversation_id: str) -> Path:
        """获取会话JSON文件路径"""
        return FileManager.get_conversation_dir(conversation_id) / f"{conversation_id}.json"

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
    def save_conversation(conversation_id: str, graph_name: str,
                          start_time: str, json_content: Dict[str, Any]) -> bool:
        """保存会话内容到JSON文件"""
        try:
            # 创建会话目录
            conversation_dir = FileManager.get_conversation_dir(conversation_id)
            conversation_dir.mkdir(parents=True, exist_ok=True)

            # 保存JSON文件
            json_path = FileManager.get_conversation_json_path(conversation_id)
            FileManager.save_json(json_path, json_content)

            return True
        except Exception as e:
            logger.error(f"保存会话 {conversation_id} 时出错: {str(e)}")
            return False

    @staticmethod
    def update_conversation(conversation_id: str, json_content: Dict[str, Any]) -> bool:
        """更新会话内容"""
        try:
            # 确保会话目录存在
            conversation_dir = FileManager.get_conversation_dir(conversation_id)
            conversation_dir.mkdir(parents=True, exist_ok=True)

            # 更新JSON文件
            json_path = FileManager.get_conversation_json_path(conversation_id)
            FileManager.save_json(json_path, json_content)

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
                                 if d.is_dir() and (d / f"{d.name}.json").exists()]
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