#!/usr/bin/env python3
"""
MAG Graph Optimize Interactive Example
Interactive graph optimization tool
"""

import mag
import json


def get_available_models():
    """Get list of available models in the system"""
    try:
        models = mag.list_model()
        return [model['name'] for model in models if 'name' in model]
    except Exception as e:
        print(f"[Error] Failed to get model list: {e}")
        return []


def get_available_graphs():
    """Get list of available graphs in the system"""
    try:
        return mag.list_graph()
    except Exception as e:
        print(f"[Error] Failed to get graph list: {e}")
        return []


def get_available_mcp_servers():
    """Get list of available MCP servers in the system"""
    try:
        status = mag.mcp_status()
        servers = []
        for server_name, server_info in status.items():
            if server_name != "summary":
                servers.append(server_name)
        return servers
    except Exception as e:
        print(f"[Error] Failed to get MCP server list: {e}")
        return []


def select_graph(available_graphs):
    """Let user select graph to optimize"""
    if not available_graphs:
        print("[Error] No available graphs in the system")
        return None

    print("\n[List] Available graphs:")
    for i, graph in enumerate(available_graphs, 1):
        print(f"  {i}. {graph}")

    while True:
        try:
            choice = input(f"\n[Input] Please select graph to optimize (1-{len(available_graphs)}): ").strip()
            if choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(available_graphs):
                    selected_graph = available_graphs[index]
                    print(f"[Success] Selected graph: {selected_graph}")
                    return selected_graph
            print(f"[Warning] Please enter a number between 1 and {len(available_graphs)}")
        except KeyboardInterrupt:
            print("\n[Bye] Operation cancelled")
            return None


def select_model(available_models):
    """Let user select a model"""
    if not available_models:
        print("[Error] No available models in the system")
        return None

    print("\n[List] Available models:")
    for i, model in enumerate(available_models, 1):
        print(f"  {i}. {model}")

    while True:
        try:
            choice = input(f"\n[Input] Please select model (1-{len(available_models)}): ").strip()
            if choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(available_models):
                    selected_model = available_models[index]
                    print(f"[Success] Selected model: {selected_model}")
                    return selected_model
            print(f"[Warning] Please enter a number between 1 and {len(available_models)}")
        except KeyboardInterrupt:
            print("\n[Bye] Operation cancelled")
            return None


def select_mcp_servers(available_servers):
    """Let user select needed MCP servers"""
    if not available_servers:
        print("[Note] No available MCP servers in the system, will not use MCP tools")
        return []

    print("\n[List] Available MCP servers:")
    for i, server in enumerate(available_servers, 1):
        print(f"  {i}. {server}")

    print("\n[Tip] You can enter multiple server numbers separated by commas, or press Enter to skip")

    while True:
        try:
            choice = input("[Input] Please select needed MCP servers (e.g.: 1,3 or press Enter): ").strip()

            if not choice:
                print("[Note] Skipped MCP server selection")
                return []

            selected_servers = []
            indices = [x.strip() for x in choice.split(',')]

            for index_str in indices:
                if index_str.isdigit():
                    index = int(index_str) - 1
                    if 0 <= index < len(available_servers):
                        selected_servers.append(available_servers[index])
                    else:
                        print(f"[Warning] Index {index_str} is out of range")
                        continue
                else:
                    print(f"[Warning] '{index_str}' is not a valid number")
                    continue

            if selected_servers:
                print(f"[Success] Selected MCP servers: {', '.join(selected_servers)}")
                return selected_servers
            else:
                print("[Warning] No valid servers selected, please re-enter")

        except KeyboardInterrupt:
            print("\n[Bye] Operation cancelled")
            return []


def stream_optimize(graph_name, requirement, conversation_id, model, mcp_servers, user_id):
    """Stream optimization of graph configuration"""
    print(f"\n[Process] Starting optimization of graph '{graph_name}'...\n")

    try:
        stream = mag.update_graph(
            graph_name=graph_name,
            optimization_requirement=requirement,
            model_name=model,
            mcp_servers=mcp_servers,
            conversation_id=conversation_id,
            user_id=user_id,
            stream=True
        )

        for chunk in stream:
            # Process OpenAI format chunks
            if "choices" in chunk and chunk["choices"]:
                delta = chunk["choices"][0].get("delta", {})

                # Output generated content
                if delta.get("content"):
                    print(delta["content"], end="", flush=True)

                # Output reasoning content (if any)
                if delta.get("reasoning_content"):
                    print(f"{delta['reasoning_content']}", end="", flush=True)

            # Process error messages
            elif "error" in chunk:
                print(f"\n[Error] Error: {chunk['error']['message']}")
                break

            # Process completion messages
            elif "completion" in chunk:
                print(f"\n\n[Success] Graph optimization completed!")
                print(f"Graph name: {chunk['completion']['graph_name']}")
                print(f"Completion message: {chunk['completion']['message']}")
                return True

            # Process incomplete messages
            elif "incomplete" in chunk:
                print(f"\n\n[Warning] Graph optimization incomplete")
                print(f"Message: {chunk['incomplete']['message']}")
                print(f"Missing fields: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\nStream optimization ended")
        return False

    except Exception as e:
        print(f"\n[Error] Stream optimization failed: {e}")
        return False


def interactive_graph_optimize():
    """Interactive graph optimization"""
    print("[AI] Graph Optimization Tool - Interactive Mode")
    print("=" * 50)

    # Get available graphs and let user select
    print("[Search] Getting available graphs...")
    available_graphs = get_available_graphs()
    current_graph = select_graph(available_graphs)

    if not current_graph:
        print("[Error] Unable to continue, exiting program")
        return

    # Get available models and let user select
    print("\n[Search] Getting available models...")
    available_models = get_available_models()
    current_model = select_model(available_models)

    if not current_model:
        print("[Error] Unable to continue, exiting program")
        return

    # Get available MCP servers and let user select
    print("\n[Search] Getting available MCP servers...")
    available_servers = get_available_mcp_servers()
    current_mcp_servers = select_mcp_servers(available_servers)

    # Let user input conversation_id
    while True:
        conversation_id = input(f"\n[Note] Please enter conversation ID (e.g.: {current_graph}_optimize_v1): ").strip()
        if conversation_id:
            break
        print("[Warning] Conversation ID cannot be empty, please re-enter")

    print(f"\n[Note] Current graph: {current_graph}")
    print(f"[Note] Conversation ID: {conversation_id}")
    print(f"[AI] Current model: {current_model}")
    print(f"[Tools] Selected MCP servers: {', '.join(current_mcp_servers) if current_mcp_servers else 'None'}")

    user_id = "default_user"

    while True:
        print("\n" + "=" * 50)
        print(f"[Graph] Optimizing graph: {current_graph}")
        print(f"[AI] Current model: {current_model}")
        print(f"[Tools] MCP servers: {', '.join(current_mcp_servers) if current_mcp_servers else 'None'}")

        print("\n[Tip] Usage instructions:")
        print("- Enter your optimization requirements")
        print("- Enter '<end>END</end>' to complete optimization")
        print("- Enter 'quit' to exit program")

        print("\n" + "-" * 30)
        requirement = input("[Input] Please enter optimization requirement (or command): ").strip()

        if not requirement:
            print("[Warning] Input cannot be empty, please re-enter")
            continue

        # Handle exit command
        if requirement.lower() == 'quit':
            print("[Bye] Goodbye!")
            break

        # Execute optimization
        completed = stream_optimize(current_graph, requirement, conversation_id, current_model, current_mcp_servers,
                                    user_id)

        # If graph optimization is completed, ask if continue
        if completed:
            continue_choice = input("\n[Process] Graph optimization completed, continue optimization? (y/n): ").strip().lower()
            if continue_choice != 'y':
                print("[Complete] Graph optimization completed!")
                break


if __name__ == "__main__":
    interactive_graph_optimize()