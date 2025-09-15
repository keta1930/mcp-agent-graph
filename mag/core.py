"""
MCP Agent Graph (MAG) SDK - Agent Development Framework

Simple Python interface for working with MAG agent system.
"""
# 导入客户端API模块
from .client import graph, model, mcp, conversation

# 会话管理
from .client.conversation import (
    chat_completions,
    list_conversations,
    get_conversation_detail,
    get_conversation_metadata,
    update_conversation_status,
    permanently_delete_conversation,
    update_conversation_title,
    update_conversation_tags,
    compact_conversation
)

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
    get_generate_prompt,
    get_optimize_prompt,
    optimize,
    generate as generate_graph
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
    get_tools as get_tools,
    add_server as add_server,
    remove_server as remove_server,
    disconnect as disconnect_mcp,
    test_tool as test_mcp,
    get_ai_generator_template as get_mcp_prompt,
    generate_mcp_tool as generate_mcp,
    register_mcp_tool as register_mcp,
    list_ai_mcp_tools as list_ai_mcp
)

run_graph = run
import_graph = import_graph
export_graph = export
generate_graph = generate_graph
optimize_graph = optimize
get_optimize_prompt = get_optimize_prompt
