import asyncio
import logging
import os
import platform
import signal
import subprocess
import sys
import time
import aiohttp
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class MCPClientManager:
    """MCP客户端管理器 - 专门负责客户端进程的生命周期管理"""

    def __init__(self):
        self.client_process = None
        self.client_url = "http://127.0.0.1:8765"
        self.client_started = False
        self.startup_retries = 5
        self.retry_delay = 1

    async def initialize(self, config_path: str) -> Dict[str, Dict[str, Any]]:
        """
        初始化MCP客户端进程
        
        Args:
            config_path: MCP配置文件路径
            
        Returns:
            初始化结果状态
        """
        try:
            # 检查是否已有进程在运行
            if await self._check_existing_client():
                self.client_started = True
                logger.info("发现现有MCP Client已在运行")
                self._notify_config_change(config_path)
                return {"status": {"message": "MCP Client已连接"}}

            # 启动新的客户端进程
            return await self._start_new_client(config_path)

        except Exception as e:
            logger.error(f"启动MCP Client进程时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"status": {"error": f"启动失败: {str(e)}"}}

    async def _check_existing_client(self) -> bool:
        """检查是否已有客户端进程在运行"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.client_url}/") as response:
                    if response.status == 200:
                        return True
        except (aiohttp.ClientError, ConnectionError):
            pass
        return False

    async def _start_new_client(self, config_path: str) -> Dict[str, Dict[str, Any]]:
        """启动新的客户端进程"""
        # 构建客户端脚本路径
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
        client_script = os.path.join(project_root, "mcp_client.py")

        if not os.path.exists(client_script):
            error_msg = f"找不到MCP Client脚本: {client_script}"
            logger.error(error_msg)
            return {"status": {"error": error_msg}}

        # 构建启动命令
        python_executable = sys.executable
        full_command = [python_executable, client_script, "--config", config_path]
        logger.info(f"启动MCP Client，完整命令: {' '.join(full_command)}")

        # 创建日志文件
        stdout_file = os.path.join(os.path.dirname(config_path), "mcp_client_stdout.log")
        stderr_file = os.path.join(os.path.dirname(config_path), "mcp_client_stderr.log")

        # 启动进程
        try:
            with open(stdout_file, 'w') as stdout, open(stderr_file, 'w') as stderr:
                system = platform.system()
                if system == "Windows":
                    self.client_process = subprocess.Popen(
                        full_command,
                        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                        stdout=stdout,
                        stderr=stderr,
                    )
                else:
                    self.client_process = subprocess.Popen(
                        full_command,
                        stdout=stdout,
                        stderr=stderr,
                        start_new_session=True
                    )

            logger.info(f"MCP Client进程已启动，PID: {self.client_process.pid}")
            logger.info(f"标准输出记录到: {stdout_file}")
            logger.info(f"错误输出记录到: {stderr_file}")

            # 等待客户端启动
            if await self._wait_for_client_startup(stderr_file):
                return {"status": {"message": "MCP Client已启动"}}
            else:
                return {"status": {"error": "MCP Client启动失败，请检查日志文件"}}

        except Exception as e:
            logger.error(f"启动客户端进程时出错: {str(e)}")
            return {"status": {"error": f"启动失败: {str(e)}"}}

    async def _wait_for_client_startup(self, stderr_file: str) -> bool:
        """等待客户端启动完成"""
        for i in range(10):
            try:
                await asyncio.sleep(2)
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{self.client_url}/") as response:
                        if response.status == 200:
                            self.client_started = True
                            logger.info("MCP Client进程已启动并响应")
                            return True
            except (aiohttp.ClientError, ConnectionError) as e:
                logger.warning(f"尝试连接MCP Client (尝试 {i + 1}/10): {str(e)}")

                # 检查进程是否仍在运行
                if self.client_process.poll() is not None:
                    exit_code = self.client_process.poll()
                    logger.error(f"MCP Client进程已退出，退出代码: {exit_code}")

                    # 读取错误日志
                    try:
                        with open(stderr_file, 'r') as f:
                            stderr_content = f.read()
                            if stderr_content:
                                logger.error(f"MCP Client错误输出:\n{stderr_content}")
                    except:
                        pass
                    return False

        logger.error("无法连接到MCP Client，超过最大重试次数")
        return False

    def _notify_config_change(self, config_path: str) -> bool:
        """通知客户端配置已更改"""
        try:
            if not self.client_started:
                logger.warning("MCP Client未启动，无法通知配置变更")
                return False

            import requests
            response = requests.post(
                f"{self.client_url}/load_config",
                json={"config_path": config_path}
            )

            if response.status_code == 200:
                logger.info("已通知MCP Client加载新配置")
                return True
            else:
                logger.error(f"通知MCP Client失败: {response.status_code} {response.text}")
                return False

        except Exception as e:
            logger.error(f"通知MCP Client时出错: {str(e)}")
            return False

    async def notify_client_shutdown(self) -> bool:
        """通知客户端优雅关闭"""
        if not self.client_started:
            return False

        try:
            logger.info("尝试通过HTTP API通知Client优雅关闭...")
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.client_url}/shutdown", timeout=5) as response:
                    if response.status == 200:
                        logger.info("已成功通知Client开始关闭流程")
                        await asyncio.sleep(3)

                        # 检查进程是否已经自行退出
                        if self.client_process and self.client_process.poll() is not None:
                            logger.info("验证Client进程已自行退出")
                            self.client_process = None
                            self.client_started = False
                            return True

                        logger.info("Client进程仍在运行，将使用强制方式关闭")
                        return False
                    else:
                        logger.warning(f"通知Client关闭返回异常状态码: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"通知Client关闭时出错: {str(e)}")
            return False

    async def cleanup(self, force=True):
        """清理客户端进程"""
        if not self.client_process:
            logger.info("无需清理：Client进程不存在或已关闭")
            self.client_started = False
            return

        if force:
            try:
                logger.info(f"正在强制关闭MCP Client进程 (PID: {self.client_process.pid})...")
                system = platform.system()
                if system == "Windows":
                    os.kill(self.client_process.pid, signal.CTRL_BREAK_EVENT)
                else:
                    os.killpg(os.getpgid(self.client_process.pid), signal.SIGTERM)

                # 等待进程终止
                try:
                    self.client_process.wait(timeout=5)
                    logger.info("MCP Client进程已正常关闭")
                except subprocess.TimeoutExpired:
                    logger.warning("MCP Client进程未响应，强制终止")
                    if system == "Windows":
                        self.client_process.kill()
                    else:
                        os.killpg(os.getpgid(self.client_process.pid), signal.SIGKILL)
                    self.client_process.wait()

            except Exception as e:
                logger.error(f"关闭MCP Client进程时出错: {str(e)}")
                try:
                    self.client_process.kill()
                except:
                    pass
        else:
            logger.info("跳过强制终止进程，仅重置客户端状态")

        # 重置状态
        self.client_process = None
        self.client_started = False

    def is_client_running(self) -> bool:
        """检查客户端是否运行"""
        return self.client_started and self.client_process is not None

    def get_client_url(self) -> str:
        """获取客户端URL"""
        return self.client_url