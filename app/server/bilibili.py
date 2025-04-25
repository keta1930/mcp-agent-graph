from fastmcp import FastMCP
from bilibili_api import search,sync

mcp = FastMCP(name='bilibili mcp server',instructions="""
              # Bilibili Search MCP
              This MCP allows you to search for videos on Bilibili.
              ## Search for a keyword
              - keyword: str
              """)

@mcp.tool()
def general_search(keyword:str)->dict:
    """
    Search for a keyword on Bilibili and return the result.
    """
    return sync(search.search(keyword))

if __name__ == '__main__':
    mcp.run(transport='stdio')
