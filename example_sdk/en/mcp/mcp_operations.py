import mag
import json


def get_mcp_status():
    """Get MCP server status"""
    print("\n=== Get MCP Server Status ===")
    status = mag.mcp_status()
    print(json.dumps(status, ensure_ascii=False, indent=2))
    return status


def connect_all_mcp():
    """Connect to all MCP servers"""
    print("\n=== Connect to All MCP Servers ===")
    result = mag.connect("all")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def connect_single_mcp():
    """Connect to a single MCP server (fetch)"""
    print("\n=== Connect to fetch Server ===")
    result = mag.connect("fetch")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def get_mcp_tools():
    """Get all MCP tools"""
    print("\n=== Get MCP Tool List ===")
    tools = mag.mcptools()
    print(json.dumps(tools, ensure_ascii=False, indent=2))
    return tools


def test_fetch_tool():
    """Test fetch tool"""
    print("\n=== Test fetch Tool ===")
    params = {"url": "https://httpbin.org/get"}
    result = mag.test_mcptool("fetch", "fetch", params)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def disconnect_mcp():
    """Disconnect MCP server"""
    print("\n=== Disconnect fetch Server ===")
    result = mag.disconnect("fetch")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    # 1. Get initial status
    get_mcp_status()

    # 2. Connect to server
    connect_single_mcp()

    # 3. Check status again
    get_mcp_status()

    # 4. Connect to all servers
    connect_all_mcp()

    # 5. Get tool list
    get_mcp_tools()

    # 6. Test fetch tool
    test_fetch_tool()

    # 7. Disconnect
    disconnect_mcp()

    # 8. Check status after disconnection
    get_mcp_status()