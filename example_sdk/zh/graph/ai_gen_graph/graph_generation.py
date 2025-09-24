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


def show_tips(use_stream=True):
    """显示使用提示"""
    print("\n[Tip] 使用说明:")
    print("- 输入你的图生成需求")
    print("- 输入 'stream' 切换到流式模式")
    print("- 输入 'nonstream' 切换到非流式模式")
    print("- 输入 'model' 切换模型")
    print("- 输入 'mcp' 重新选择MCP服务器")
    if use_stream:
        print("- 输入 '<end>END</end>' 完成图生成 (仅流式模式可用)")
    else:
        print("- 输入 '<end>END</end>' 完成图生成 (需要先切换到流式模式)")
    print("- 输入 'quit' 退出程序")


def select_model(available_models):
    """让用户选择模型"""
    if not available_models:
        print("[Error] 系统中没有可用的模型，请先添加模型配置")
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


def stream_generation(requirement, conversation_id, model, mcp_servers, user_id):
    """流式生成图配置"""
    print("\n[Process] 开始流式生成...\n")

    try:
        stream = mag.gen_graph(
            requirement=requirement,
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
                print(f"\n\n[Success] 图配置生成完成!")
                print(f"图名称: {chunk['completion']['graph_name']}")
                print(f"完成消息: {chunk['completion']['message']}")
                return True

            # 处理未完成信息
            elif "incomplete" in chunk:
                print(f"\n\n[Warning] 图配置生成未完成")
                print(f"消息: {chunk['incomplete']['message']}")
                print(f"缺少字段: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\n流式生成结束")
        return False

    except Exception as e:
        print(f"\n[Error] 流式生成失败: {e}")
        return False


def nonstream_generation(requirement, conversation_id, model, mcp_servers, user_id):
    """非流式生成图配置"""
    print("\n[Wait] 开始非流式生成...")

    try:
        result = mag.gen_graph(
            requirement=requirement,
            model_name=model,
            mcp_servers=mcp_servers,
            conversation_id=conversation_id,
            user_id=user_id,
            stream=False
        )

        print("\n[List] 生成结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        # 分析生成结果
        if "status" in result and result["status"] == "success":
            print(f"\n[Success] 图配置生成完成!")
            print(f"图名称: {result.get('graph_name', '未知')}")
            print(f"完成消息: {result.get('message', '无消息')}")
            return True
        elif "error" in result:
            print(f"\n[Error] 生成过程中出现错误: {result['error']}")
            return False
        else:
            print(f"\n[Note] 生成响应: {result.get('message', '无消息')}")
            return False

    except Exception as e:
        print(f"\n[Error] 非流式生成失败: {e}")
        return False


def interactive_graph_generation():
    """交互式图生成"""
    print("[AI] AI生成图配置 - 交互式模式")
    print("=" * 50)

    # 获取可用模型并让用户选择
    print("[Search] 正在获取可用模型...")
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
        conversation_id = input("\n[Note] 请输入对话ID (例如: my_graph_v1, data_processor, ai_assistant): ").strip()
        if conversation_id:
            break
        print("[Warning] 对话ID不能为空，请重新输入")

    print(f"\n[Note] 对话ID: {conversation_id}")
    print(f"[AI] 当前模型: {current_model}")
    print(f"[Tools] 选择的MCP服务器: {', '.join(current_mcp_servers) if current_mcp_servers else '无'}")

    # 默认使用流式模式
    use_stream = True
    mode_text = "流式" if use_stream else "非流式"
    print(f"\n[Mode] 当前模式: {mode_text}")

    user_id = "default_user"

    while True:
        print("\n" + "=" * 50)

        # 每次输入前显示当前状态和提示
        print(f"[Mode] 当前模式: {'流式' if use_stream else '非流式'}")
        print(f"[AI] 当前模型: {current_model}")
        print(f"[Tools] MCP服务器: {', '.join(current_mcp_servers) if current_mcp_servers else '无'}")

        # 显示使用提示
        show_tips(use_stream)

        print("\n" + "-" * 30)
        requirement = input("[Input] 请输入需求 (或命令): ").strip()

        if not requirement:
            print("[Warning] 输入不能为空，请重新输入")
            continue

        # 处理退出命令
        if requirement.lower() == 'quit':
            print("[Bye] 再见！")
            break

        # 处理模式切换命令
        if requirement.lower() == 'stream':
            use_stream = True
            print("[Success] 已切换到流式模式")
            continue
        elif requirement.lower() == 'nonstream':
            use_stream = False
            print("[Success] 已切换到非流式模式")
            continue

        # 处理模型切换命令
        if requirement.lower() == 'model':
            print("[Search] 重新获取可用模型...")
            available_models = get_available_models()
            new_model = select_model(available_models)
            if new_model and new_model != current_model:
                current_model = new_model
                print(f"[Success] 模型已切换到: {current_model}")
            continue

        # 处理MCP服务器切换命令
        if requirement.lower() == 'mcp':
            print("[Search] 重新获取可用MCP服务器...")
            available_servers = get_available_mcp_servers()
            new_mcp_servers = select_mcp_servers(available_servers)
            current_mcp_servers = new_mcp_servers
            print(f"[Success] MCP服务器已更新: {', '.join(current_mcp_servers) if current_mcp_servers else '无'}")
            continue

        # 检查是否在非流式模式下使用结束命令
        if requirement == '<end>END</end>' and not use_stream:
            print("[Warning] '<end>END</end>' 命令只能在流式模式下使用！")
            print("[Tip] 请先输入 'stream' 切换到流式模式，然后再使用此命令")
            continue

        # 执行生成
        if use_stream:
            completed = stream_generation(requirement, conversation_id, current_model, current_mcp_servers, user_id)
        else:
            completed = nonstream_generation(requirement, conversation_id, current_model, current_mcp_servers, user_id)

        # 如果完成了图生成，询问是否继续
        if completed:
            continue_choice = input("\n[Process] 图配置已完成，是否继续优化？(y/n): ").strip().lower()
            if continue_choice != 'y':
                print("[Complete] 图配置生成完成！")
                break


if __name__ == "__main__":
    interactive_graph_generation()