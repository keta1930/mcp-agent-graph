import mag
import json


def get_mcp_status():
    """获取MCP服务器状态"""
    print("\n=== 获取MCP服务器状态 ===")
    status = mag.mcp_status()
    print(json.dumps(status, ensure_ascii=False, indent=2))
    return status


def connect_all_mcp():
    """连接所有MCP服务器"""
    print("\n=== 连接所有MCP服务器 ===")
    result = mag.connect("all")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def connect_single_mcp():
    """连接单个MCP服务器（fetch）"""
    print("\n=== 连接fetch服务器 ===")
    result = mag.connect("fetch")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def get_mcp_tools():
    """获取所有MCP工具"""
    print("\n=== 获取MCP工具列表 ===")
    tools = mag.mcptools()
    print(json.dumps(tools, ensure_ascii=False, indent=2))
    return tools


def test_fetch_tool():
    """测试fetch工具"""
    print("\n=== 测试fetch工具 ===")
    params = {"url": "https://httpbin.org/get"}
    result = mag.test_mcptool("fetch", "fetch", params)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def disconnect_mcp():
    """断开MCP服务器连接"""
    print("\n=== 断开fetch服务器连接 ===")
    result = mag.disconnect("fetch")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    # 1. 获取初始状态
    get_mcp_status()

    # 2. 连接服务器
    connect_single_mcp()

    # 3. 再次查看状态
    get_mcp_status()

    # 4. 连接所有服务器
    connect_all_mcp()

    # 5. 获取工具列表
    get_mcp_tools()

    # 6. 测试fetch工具
    test_fetch_tool()

    # 7. 断开连接
    disconnect_mcp()

    # 8. 查看断开后的状态
    get_mcp_status()