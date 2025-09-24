import mag
import json

def get_config():
    """Demonstrate MCP configuration management"""
    config = mag.get_mcp_config()
    print("\nmcp config:\n")
    print(json.dumps(config, ensure_ascii=False, indent=2))

def add_mcp():
    """Add 4 MCP servers"""
    servers = {
        "mcpServers": {
            "fetch": {
                "command": "uvx",
                "args": ["mcp-server-fetch"]
            },
            "playwright": {
                "command": "npx",
                "args": ["@playwright/mcp@latest", "--headless"]
            },
            "tavily-mcp": {
                "command": "npx",
                "args": ["-y", "tavily-mcp@0.1.4"],
                "env": {
                    "TAVILY_API_KEY": "your-api-key-here"
                }
            },
            "mcp-deepwiki": {
                "type": "streamable_http",
                "url": "https://mcp.api-inference.modelscope.net/477e6cba70844e/mcp"
            }
        }
    }
    result = mag.add_mcp(servers)
    print("\n mcp add result:\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))

def remove_mcp():
    """Remove 4 MCP servers"""
    server_names = ["tavily-mcp", "playwright"]
    result = mag.remove_mcp(server_names)
    print("\nmcp remove result:\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))

def update_mcp():
    """Update MCP configuration - Note: This operation will completely replace existing configuration file content"""
    updated_config = {
        "mcpServers": {
            "fetch": {
                "command": "uvx",
                "args": ["mcp-server-fetch"],
                "autoApprove": ["*"],
                "disabled": False,
                "timeout": 120
            },
            "playwright": {
                "command": "npx",
                "args": ["@playwright/mcp@latest", "--headless"],
                "autoApprove": [],
                "disabled": True,
                "timeout": 60
            }
        }
    }
    result = mag.update_mcp_config(updated_config)
    print("\nmcp update result:\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    add_mcp()
    get_config()
    update_mcp()
    get_config()
    remove_mcp()
    get_config()