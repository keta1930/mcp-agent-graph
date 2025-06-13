import asyncio
import json
import logging
import os
import sys
import time
import traceback
from contextlib import AsyncExitStack
from typing import Dict, List, Any, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.sse import sse_client

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("mcp_client")

app = FastAPI(title="MCP Client", description="MCP Client for MAG")

# 全局状态
CONFIG_PATH = None
FILE_WATCHER_TASK = None
SERVERS = {}
CONFIG = {}


class MCPServer:
    """表示单个MCP服务器的类"""

    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.session: Optional[ClientSession] = None
        self.stdio = None
        self.write = None
        self.exit_stack = AsyncExitStack()
        self.tools = []
        self.error = None
        self.init_attempted = False
        self._call_lock = asyncio.Lock() 

    async def connect(self) -> bool:
        """连接到服务器，返回是否成功"""
        if self.config.get('disabled', False):
            logger.info(f"服务器 '{self.name}' 已禁用，跳过连接")
            self.error = "服务器已禁用"
            self.init_attempted = True
            return False

        try:
            # 获取传输类型
            transport_type = self.config.get('transportType', 'stdio')
            
            # 设置超时
            timeout = self.config.get('timeout', 10) 

            # 添加超时机制
            try:
                async with asyncio.timeout(timeout):
                    if transport_type == 'stdio':
                        return await self._connect_stdio()
                    elif transport_type == 'sse':
                        return await self._connect_sse()
                    else:
                        self.error = f"使用了不支持的传输类型: {transport_type}"
                        logger.error(f"错误: 服务器 '{self.name}' {self.error}")
                        self.init_attempted = True
                        return False

            except asyncio.TimeoutError:
                self.error = f"连接超时（{timeout}秒）。可能是服务器未响应或配置不正确。"
                logger.error(f"错误: 服务器 '{self.name}' {self.error}")
                # 尝试关闭可能已部分建立的连接
                await self.cleanup()
                self.init_attempted = True
                return False

        except Exception as e:
            self.error = f"连接时出错: {str(e)}"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            logger.error(traceback.format_exc())
            self.init_attempted = True
            return False

    async def _connect_stdio(self) -> bool:
        """连接 stdio 类型的服务器"""
        command = self.config.get('command')
        args = self.config.get('args', [])

        if not command:
            self.error = "stdio传输类型未指定命令"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            self.init_attempted = True
            return False

        try:
            # 打印命令和参数，便于调试
            logger.info(f"启动 stdio 服务器 '{self.name}' 使用命令: {command} {' '.join(args)}")

            # 获取环境变量
            env = os.environ.copy()
            
            # 如果配置中有环境变量设置，则合并到环境变量中
            config_env = self.config.get('env', {})
            if config_env:
                logger.info(f"服务器 '{self.name}' 使用自定义环境变量: {list(config_env.keys())}")
                env.update(config_env)

            # 创建服务器参数
            server_params = StdioServerParameters(
                command=command,
                args=args,
                env=env
            )

            # 连接到服务器
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport

            # 创建会话并初始化
            self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            await self.session.initialize()

            # 获取工具列表
            response = await self.session.list_tools()
            self.tools = response.tools
            logger.info(f"已连接到 stdio 服务器 '{self.name}' 提供的工具: {[tool.name for tool in self.tools]}")

            # 检查自动批准的工具
            auto_approve_tools = self.config.get('autoApprove', [])
            if auto_approve_tools:
                logger.info(f"为以下工具启用了自动批准: {auto_approve_tools}")

            self.init_attempted = True
            return True

        except NotImplementedError:
            # Windows特有问题
            self.error = "在Windows环境下创建子进程失败，可能需要使用HTTP传输类型"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            self.init_attempted = True
            return False
        except FileNotFoundError as e:
            self.error = f"启动失败 - 找不到命令 '{command}'"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            self.init_attempted = True
            return False
        except PermissionError as e:
            self.error = f"启动失败 - 没有执行 '{command}' 的权限"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            self.init_attempted = True
            return False
        except Exception as e:
            self.error = f"stdio 连接过程中出错: {str(e)}"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            logger.error(traceback.format_exc())
            self.init_attempted = True
            return False

    async def _connect_sse(self) -> bool:
        """连接 SSE 类型的服务器"""
        url = self.config.get('url')

        if not url:
            self.error = "SSE传输类型未指定URL"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            self.init_attempted = True
            return False

        try:
            # 打印URL，便于调试
            logger.info(f"连接到 SSE 服务器 '{self.name}' URL: {url}")

            # 使用 exit_stack 管理 SSE 客户端上下文，获取 streams
            streams = await self.exit_stack.enter_async_context(sse_client(url=url))
            
            # 创建会话并使用 exit_stack 管理
            self.session = await self.exit_stack.enter_async_context(ClientSession(*streams))
            await self.session.initialize()

            # 获取工具列表
            response = await self.session.list_tools()
            self.tools = response.tools
            logger.info(f"已连接到 SSE 服务器 '{self.name}' 提供的工具: {[tool.name for tool in self.tools]}")

            # 检查自动批准的工具
            auto_approve_tools = self.config.get('autoApprove', [])
            if auto_approve_tools:
                logger.info(f"为以下工具启用了自动批准: {auto_approve_tools}")

            self.init_attempted = True
            return True

        except Exception as e:
            self.error = f"SSE 连接过程中出错: {str(e)}"
            logger.error(f"错误: 服务器 '{self.name}' {self.error}")
            logger.error(traceback.format_exc())
            self.init_attempted = True
            return False

    async def cleanup(self):
        """清理服务器连接"""
        try:
            # 先清空工具列表，避免断开连接后仍能获取工具
            self.tools = []
            
            # 使用更安全的方式关闭连接
            if self.exit_stack:
                try:
                    await self.exit_stack.aclose()
                except Exception as e:
                    logger.error(f"关闭exit_stack时出错: {str(e)}")
                finally:
                    # 确保重置所有状态
                    self.exit_stack = AsyncExitStack()
            
            # 清除会话和IO引用
            self.session = None
            self.stdio = None
            self.write = None
            
            logger.info(f"服务器 '{self.name}' 连接已成功清理")
        except Exception as e:
            logger.error(f"清理服务器 '{self.name}' 连接时出错: {str(e)}")
            # 即使出错也要重置状态
            self.session = None
            self.stdio = None
            self.write = None
            self.tools = []

    def is_connected(self) -> bool:
        """检查服务器是否已连接"""
        return self.session is not None

    async def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用工具，返回工具结果"""
        TOOL_CALL_TIMEOUT = 20

        if not self.is_connected():
            raise RuntimeError(f"服务器 '{self.name}' 未连接")

        if not any(tool.name == tool_name for tool in self.tools):
            raise ValueError(f"服务器 '{self.name}' 没有提供工具 '{tool_name}'")

        try:
            # 使用锁来保护会话调用，防止并发访问造成问题
            async with self._call_lock:
                try:
                    async with asyncio.timeout(TOOL_CALL_TIMEOUT):
                        result = await self.session.call_tool(tool_name, params)
                    return {
                        "tool_name": tool_name,
                        "server_name": self.name,
                        "content": result.content
                    }
                except asyncio.TimeoutError:
                    error_message = f"Tool execution timed out after {TOOL_CALL_TIMEOUT} seconds. The operation was canceled."
                    logger.error(f"调用工具 '{tool_name}' 超时 (超过 {TOOL_CALL_TIMEOUT} 秒)")
                    return {
                        "tool_name": tool_name,
                        "server_name": self.name,
                        "error": error_message,
                        "content": f"ERROR: {error_message}"
                    }
        except Exception as e:
            error_message = str(e)
            logger.error(f"调用工具 '{tool_name}' 时出错: {error_message}")
            traceback.print_exc()
            return {
                "tool_name": tool_name,
                "server_name": self.name,
                "error": error_message,
                "content": f"ERROR: {error_message}"
            }


# 工具调用数据模型
class ToolCallData(BaseModel):
    server_name: str
    tool_name: str
    params: Dict[str, Any]


# 配置更新通知数据模型
class ConfigUpdateNotification(BaseModel):
    config_path: str


# 服务器连接请求数据模型
class ServerConnectRequest(BaseModel):
    server_name: str


# API端点

@app.get("/")
async def root():
    """客户端状态检查"""
    return {"status": "running", "servers_connected": len(SERVERS)}


@app.post("/load_config")
async def load_config(notification: ConfigUpdateNotification, background_tasks: BackgroundTasks):
    """加载MCP配置"""
    global CONFIG_PATH, CONFIG

    try:
        CONFIG_PATH = notification.config_path
        logger.info(f"收到配置更新通知，将加载: {CONFIG_PATH}")

        # 在后台任务中执行配置加载和服务器连接
        background_tasks.add_task(process_config_update, CONFIG_PATH)

        return {"status": "accepted", "message": "配置加载请求已接受"}
    except Exception as e:
        logger.error(f"处理配置加载请求时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"配置加载失败: {str(e)}")


@app.get("/servers")
async def get_servers():
    """获取所有服务器的状态"""
    servers_status = {}
    for name, server in SERVERS.items():
        servers_status[name] = {
            "connected": server.is_connected(),
            "init_attempted": server.init_attempted,
            "tools": [tool.name for tool in server.tools] if server.is_connected() else [],
            "error": server.error,
            "transport_type": server.config.get('transportType', 'stdio')
        }
    return servers_status


@app.post("/connect_server")
async def connect_server(request: ServerConnectRequest):
    """连接特定的服务器，等待连接完成后再返回结果"""
    server_name = request.server_name

    if not CONFIG or 'mcpServers' not in CONFIG or server_name not in CONFIG['mcpServers']:
        raise HTTPException(status_code=404, detail=f"找不到服务器配置: {server_name}")

    # 如果服务器已连接，直接返回成功
    if server_name in SERVERS and SERVERS[server_name].is_connected():
        return {
            "status": "connected",
            "server": server_name,
            "tools": [tool.name for tool in SERVERS[server_name].tools]
        }

    # 直接在当前请求中执行连接，而不是使用后台任务
    logger.info(f"开始连接服务器: {server_name} (同步等待)")

    # 调用连接函数
    success = await connect_single_server(server_name)

    if success:
        # 连接成功，返回工具列表
        return {
            "status": "connected",
            "server": server_name,
            "tools": [tool.name for tool in SERVERS[server_name].tools]
        }
    else:
        # 连接失败，返回错误信息
        error_msg = SERVERS[server_name].error if server_name in SERVERS else "未知错误"
        raise HTTPException(
            status_code=400,
            detail=f"无法连接到服务器 '{server_name}': {error_msg}"
        )


@app.post("/tool_call")
async def call_tool(tool_data: ToolCallData):
    """直接调用指定的工具"""
    server_name = tool_data.server_name
    tool_name = tool_data.tool_name
    params = tool_data.params

    if server_name not in SERVERS:
        raise HTTPException(status_code=404, detail=f"找不到服务器: {server_name}")

    server = SERVERS[server_name]
    if not server.is_connected():
        raise HTTPException(status_code=400, detail=f"服务器 '{server_name}' 未连接")

    try:
        result = await server.call_tool(tool_name, params)
        return result
    except Exception as e:
        logger.error(f"调用工具时出错: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def get_tools():
    """获取所有可用工具的列表"""
    all_tools = []
    for server_name, server in SERVERS.items():
        if server.is_connected():
            for tool in server.tools:
                all_tools.append({
                    "server_name": server_name,
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                })
    return all_tools

@app.post("/disconnect_server")
async def disconnect_server(request: ServerConnectRequest):
    """断开特定服务器的连接"""
    server_name = request.server_name

    if server_name not in SERVERS:
        raise HTTPException(status_code=404, detail=f"找不到服务器: {server_name}")

    # 如果服务器未连接，直接返回
    if not SERVERS[server_name].is_connected():
        return {
            "status": "not_connected",
            "server": server_name,
            "message": "服务器未连接"
        }

    # 执行清理操作
    logger.info(f"开始断开服务器连接: {server_name}")
    try:
        await SERVERS[server_name].cleanup()
        
        # 验证断开连接后的状态
        if SERVERS[server_name].is_connected():
            logger.warning(f"服务器 '{server_name}' 断开连接后仍显示为已连接状态")
            # 强制重置状态
            SERVERS[server_name].session = None
            SERVERS[server_name].tools = []
        
        return {
            "status": "disconnected",
            "server": server_name,
            "message": f"服务器 '{server_name}' 连接已断开"
        }
    except Exception as e:
        logger.error(f"断开服务器 '{server_name}' 连接时出错: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "status": "error",
            "server": server_name,
            "error": str(e),
            "message": f"断开服务器连接时出错: {str(e)}"
        }

async def process_config_update(config_path: str):
    """处理配置更新"""
    global CONFIG

    try:
        # 加载配置
        with open(config_path, 'r', encoding='utf-8') as f:
            new_config = json.load(f)

        if 'mcpServers' not in new_config:
            logger.error("无效配置: 未找到 'mcpServers' 部分")
            return False

        # 记录新配置
        CONFIG = new_config

        # 找出需要添加、更新和删除的服务器
        current_servers = set(SERVERS.keys())
        new_servers = set(new_config['mcpServers'].keys())

        # 需要添加的服务器
        servers_to_add = new_servers - current_servers

        # 需要更新的服务器
        servers_to_update = []
        for server_name in current_servers.intersection(new_servers):
            if SERVERS[server_name].config != new_config['mcpServers'][server_name]:
                servers_to_update.append(server_name)

        # 需要删除的服务器
        servers_to_remove = current_servers - new_servers

        # 删除旧服务器
        for server_name in servers_to_remove:
            logger.info(f"删除服务器: {server_name}")
            await SERVERS[server_name].cleanup()
            del SERVERS[server_name]

        # 更新服务器
        for server_name in servers_to_update:
            logger.info(f"更新服务器: {server_name}")
            await SERVERS[server_name].cleanup()
            del SERVERS[server_name]

            server = MCPServer(server_name, new_config['mcpServers'][server_name])
            SERVERS[server_name] = server
            # 注意：不立即连接，等到需要时再连接

        # 添加新服务器
        for server_name in servers_to_add:
            logger.info(f"添加服务器: {server_name}")
            server = MCPServer(server_name, new_config['mcpServers'][server_name])
            SERVERS[server_name] = server
            # 注意：不立即连接，等到需要时再连接

        logger.info(f"配置更新完成，当前已有 {len(SERVERS)} 个服务器配置")
        return True

    except Exception as e:
        logger.error(f"处理配置更新时出错: {str(e)}")
        traceback.print_exc()
        return False


async def connect_single_server(server_name: str) -> bool:
    """连接单个服务器"""
    global SERVERS, CONFIG

    logger.info(f"开始连接服务器: {server_name}")

    if server_name not in CONFIG.get('mcpServers', {}):
        logger.error(f"找不到服务器配置: {server_name}")
        return False

    # 显示服务器配置，便于调试
    server_config = CONFIG['mcpServers'][server_name]
    transport_type = server_config.get('transportType', 'stdio')
    
    if transport_type == 'stdio':
        logger.info(
            f"服务器 '{server_name}' 配置: command={server_config.get('command')}, args={server_config.get('args', [])}")
    elif transport_type == 'sse':
        logger.info(
            f"服务器 '{server_name}' 配置: url={server_config.get('url')}")

    # 如果服务器已存在但未连接，先清理它
    if server_name in SERVERS:
        if SERVERS[server_name].is_connected():
            logger.info(f"服务器 '{server_name}' 已连接")
            return True

        logger.info(f"清理服务器 '{server_name}' 的现有连接")
        await SERVERS[server_name].cleanup()
        del SERVERS[server_name]

    # 创建新服务器
    logger.info(f"创建新的服务器实例: {server_name}")
    server = MCPServer(server_name, server_config)
    SERVERS[server_name] = server

    # 连接服务器
    logger.info(f"尝试连接服务器: {server_name}")
    success = await server.connect()

    if success:
        logger.info(f"服务器 '{server_name}' 连接成功")
        return True
    else:
        logger.error(f"服务器 '{server_name}' 连接失败: {server.error}")
        return False


async def start_file_watcher():
    """启动配置文件监视器"""
    global CONFIG_PATH, FILE_WATCHER_TASK

    if not CONFIG_PATH:
        logger.warning("未设置配置文件路径，跳过文件监视")
        return

    logger.info(f"开始监视配置文件变化: {CONFIG_PATH}")

    last_modified = None
    if os.path.exists(CONFIG_PATH):
        last_modified = os.path.getmtime(CONFIG_PATH)

    while True:
        await asyncio.sleep(5)  # 每5秒检查一次

        try:
            if os.path.exists(CONFIG_PATH):
                current_modified = os.path.getmtime(CONFIG_PATH)

                if last_modified is None or current_modified > last_modified:
                    logger.info(f"检测到配置文件变化: {CONFIG_PATH}")
                    last_modified = current_modified
                    await process_config_update(CONFIG_PATH)
        except Exception as e:
            logger.error(f"监视配置文件时出错: {str(e)}")


@app.post("/shutdown")
async def shutdown_client():
    """优雅关闭MCP客户端"""
    logger.info("收到关闭请求")

    # 创建后台任务执行实际关闭
    asyncio.create_task(_perform_client_shutdown())

    return {"status": "shutdown_initiated", "message": "客户端关闭过程已启动"}


async def _perform_client_shutdown():
    """执行实际的客户端关闭"""
    logger.info("开始执行客户端关闭流程")

    try:
        # 1. 清理所有服务器连接
        cleanup_tasks = []
        for server_name, server in SERVERS.items():
            logger.info(f"正在关闭服务器连接: {server_name}")
            cleanup_tasks.append(server.cleanup())

        if cleanup_tasks:
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)

        # 2. 取消文件监视器任务
        if FILE_WATCHER_TASK:
            logger.info("正在取消文件监视器任务")
            FILE_WATCHER_TASK.cancel()
            try:
                await FILE_WATCHER_TASK
            except asyncio.CancelledError:
                pass

        # 3. 等待一段时间确保资源释放
        await asyncio.sleep(1)

        # 4. 停止FastAPI应用
        logger.info("即将关闭MCP客户端...")
        import signal
        import os
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"执行客户端关闭流程时出错: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """启动事件"""
    global FILE_WATCHER_TASK

    logger.info("MCP客户端启动...")

    # 启动文件监视器
    FILE_WATCHER_TASK = asyncio.create_task(start_file_watcher())


@app.on_event("shutdown")
async def shutdown_event():
    """关闭事件"""
    global FILE_WATCHER_TASK

    logger.info("MCP客户端关闭...")

    # 取消文件监视器
    if FILE_WATCHER_TASK:
        FILE_WATCHER_TASK.cancel()
        try:
            await FILE_WATCHER_TASK
        except asyncio.CancelledError:
            pass

    # 清理所有服务器
    cleanup_tasks = []
    for server in SERVERS.values():
        cleanup_tasks.append(server.cleanup())

    if cleanup_tasks:
        await asyncio.gather(*cleanup_tasks, return_exceptions=True)


def run_client(host="127.0.0.1", port=8765):
    """运行客户端"""
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    # 可以从命令行参数获取主机和端口
    import argparse

    parser = argparse.ArgumentParser(description="MCP Client for MAG")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind")
    parser.add_argument("--config", help="Initial config file path")

    args = parser.parse_args()

    if args.config:
        CONFIG_PATH = args.config
        # 确保配置立即加载
        asyncio.run(process_config_update(CONFIG_PATH))

    run_client(host=args.host, port=args.port)