#!/usr/bin/env python3
"""
MAG Graph Optimize Interactive Example
交互式图优化工具
"""

import mag
import json


def get_available_models():
    """获取系统中可用的模型列表"""
    try:
        models = mag.list_model()
        return [model['name'] for model in models if 'name' in model]
    except Exception as e:
        print(f"[Error] 获取模型列表失败: {e}")
        return []


def get_available_graphs():
    """获取系统中可用的图列表"""
    try:
        return mag.list_graph()
    except Exception as e:
        print(f"[Error] 获取图列表失败: {e}")
        return []


def get_available_mcp_servers():
    """获取系统中可用的MCP服务器列表"""
    try:
        status = mag.mcp_status()
        servers = []
        for server_name, server_info in status.items():
            if server_name != "summary":
                servers.append(server_name)
        return servers
    except Exception as e:
        print(f"[Error] 获取MCP服务器列表失败: {e}")
        return []


def select_graph(available_graphs):
    """让用户选择要优化的图"""
    if not available_graphs:
        print("[Error] 系统中没有可用的图")
        return None

    print("\n[List] 可用图列表:")
    for i, graph in enumerate(available_graphs, 1):
        print(f"  {i}. {graph}")

    while True:
        try:
            choice = input(f"\n[Input] 请选择要优化的图 (1-{len(available_graphs)}): ").strip()
            if choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(available_graphs):
                    selected_graph = available_graphs[index]
                    print(f"[Success] 已选择图: {selected_graph}")
                    return selected_graph
            print(f"[Warning] 请输入 1 到 {len(available_graphs)} 之间的数字")
        except KeyboardInterrupt:
            print("\n[Bye] 操作已取消")
            return None


def select_model(available_models):
    """让用户选择模型"""
    if not available_models:
        print("[Error] 系统中没有可用的模型")
        return None

    print("\n[List] 可用模型列表:")
    for i, model in enumerate(available_models, 1):
        print(f"  {i}. {model}")

    while True:
        try:
            choice = input(f"\n[Input] 请选择模型 (1-{len(available_models)}): ").strip()
            if choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(available_models):
                    selected_model = available_models[index]
                    print(f"[Success] 已选择模型: {selected_model}")
                    return selected_model
            print(f"[Warning] 请输入 1 到 {len(available_models)} 之间的数字")
        except KeyboardInterrupt:
            print("\n[Bye] 操作已取消")
            return None


def select_mcp_servers(available_servers):
    """让用户选择需要的MCP服务器"""
    if not available_servers:
        print("[Note] 系统中没有可用的MCP服务器，将不使用MCP工具")
        return []

    print("\n[List] 可用MCP服务器列表:")
    for i, server in enumerate(available_servers, 1):
        print(f"  {i}. {server}")

    print("\n[Tip] 可以输入多个服务器编号，用逗号分隔，或直接回车跳过")

    while True:
        try:
            choice = input("[Input] 请选择需要的MCP服务器 (例如: 1,3 或直接回车): ").strip()

            if not choice:
                print("[Note] 跳过MCP服务器选择")
                return []

            selected_servers = []
            indices = [x.strip() for x in choice.split(',')]

            for index_str in indices:
                if index_str.isdigit():
                    index = int(index_str) - 1
                    if 0 <= index < len(available_servers):
                        selected_servers.append(available_servers[index])
                    else:
                        print(f"[Warning] 索引 {index_str} 超出范围")
                        continue
                else:
                    print(f"[Warning] '{index_str}' 不是有效数字")
                    continue

            if selected_servers:
                print(f"[Success] 已选择MCP服务器: {', '.join(selected_servers)}")
                return selected_servers
            else:
                print("[Warning] 没有选择有效的服务器，请重新输入")

        except KeyboardInterrupt:
            print("\n[Bye] 操作已取消")
            return []


def stream_optimize(graph_name, requirement, conversation_id, model, mcp_servers, user_id):
    """流式优化图配置"""
    print(f"\n[Process] 开始优化图 '{graph_name}'...\n")

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
            # 处理OpenAI格式的chunk
            if "choices" in chunk and chunk["choices"]:
                delta = chunk["choices"][0].get("delta", {})

                # 输出生成的内容
                if delta.get("content"):
                    print(delta["content"], end="", flush=True)

                # 输出思考内容（如果有）
                if delta.get("reasoning_content"):
                    print(f"{delta['reasoning_content']}", end="", flush=True)

            # 处理错误信息
            elif "error" in chunk:
                print(f"\n[Error] 错误: {chunk['error']['message']}")
                break

            # 处理完成信息
            elif "completion" in chunk:
                print(f"\n\n[Success] 图优化完成!")
                print(f"图名称: {chunk['completion']['graph_name']}")
                print(f"完成消息: {chunk['completion']['message']}")
                return True

            # 处理未完成信息
            elif "incomplete" in chunk:
                print(f"\n\n[Warning] 图优化未完成")
                print(f"消息: {chunk['incomplete']['message']}")
                print(f"缺少字段: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\n流式优化结束")
        return False

    except Exception as e:
        print(f"\n[Error] 流式优化失败: {e}")
        return False


def interactive_graph_optimize():
    """交互式图优化"""
    print("[AI] 图优化工具 - 交互式模式")
    print("=" * 50)

    # 获取可用图并让用户选择
    print("[Search] 正在获取可用图...")
    available_graphs = get_available_graphs()
    current_graph = select_graph(available_graphs)

    if not current_graph:
        print("[Error] 无法继续，程序退出")
        return

    # 获取可用模型并让用户选择
    print("\n[Search] 正在获取可用模型...")
    available_models = get_available_models()
    current_model = select_model(available_models)

    if not current_model:
        print("[Error] 无法继续，程序退出")
        return

    # 获取可用MCP服务器并让用户选择
    print("\n[Search] 正在获取可用MCP服务器...")
    available_servers = get_available_mcp_servers()
    current_mcp_servers = select_mcp_servers(available_servers)

    # 让用户输入conversation_id
    while True:
        conversation_id = input(f"\n[Note] 请输入对话ID (例如: {current_graph}_optimize_v1): ").strip()
        if conversation_id:
            break
        print("[Warning] 对话ID不能为空，请重新输入")

    print(f"\n[Note] 当前图: {current_graph}")
    print(f"[Note] 对话ID: {conversation_id}")
    print(f"[AI] 当前模型: {current_model}")
    print(f"[Tools] 选择的MCP服务器: {', '.join(current_mcp_servers) if current_mcp_servers else '无'}")

    user_id = "default_user"

    while True:
        print("\n" + "=" * 50)
        print(f"[Graph] 正在优化图: {current_graph}")
        print(f"[AI] 当前模型: {current_model}")
        print(f"[Tools] MCP服务器: {', '.join(current_mcp_servers) if current_mcp_servers else '无'}")

        print("\n[Tip] 使用说明:")
        print("- 输入你的优化需求")
        print("- 输入 '<end>END</end>' 完成优化")
        print("- 输入 'quit' 退出程序")

        print("\n" + "-" * 30)
        requirement = input("[Input] 请输入优化需求 (或命令): ").strip()

        if not requirement:
            print("[Warning] 输入不能为空，请重新输入")
            continue

        # 处理退出命令
        if requirement.lower() == 'quit':
            print("[Bye] 再见！")
            break

        # 执行优化
        completed = stream_optimize(current_graph, requirement, conversation_id, current_model, current_mcp_servers,
                                    user_id)

        # 如果完成了图优化，询问是否继续
        if completed:
            continue_choice = input("\n[Process] 图优化已完成，是否继续优化？(y/n): ").strip().lower()
            if continue_choice != 'y':
                print("[Complete] 图优化完成！")
                break


if __name__ == "__main__":
    interactive_graph_optimize()