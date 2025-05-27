"""
MCP Agent Graph (MAG) SDK - Agent Development Framework

Simple Python interface for working with MAG agent system.
"""

from .core import __version__, start, shutdown, is_running

# 导入客户端API模块
from .client import graph, model, mcp, conversation

# 图管理
from .client.graph import (
    list as list_graphs,
    get as get_graph,
    save as save_graph,
    delete as delete_graph,
    rename as rename_graph,
    get_detail as get_graph_detail,
    run,
    continue_run,
    import_graph,
    export,
    generate_mcp_script,
    get_prompt_template
)

# 模型管理
from .client.model import (
    list as list_models,
    get as get_model,
    add as add_model,
    update as update_model,
    delete as delete_model
)

# MCP服务器管理
from .client.mcp import (
    get_config as get_mcp_config,
    update_config as update_mcp_config,
    get_status as get_mcp_status,
    connect as connect_mcp,
    get_tools as get_mcp_tools
)

# 会话管理
from .client.conversation import (
    list as list_conversations,
    get as get_conversation,
    delete as delete_conversation,
    get_hierarchy as get_conversation_hierarchy
)

run_graph = run
import_graph = import_graph
export_graph = export