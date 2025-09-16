import mag
import json


def get_available_models():
    """获取系统中可用的模型列表"""
    try:
        models = mag.list_model()
        return [model['name'] for model in models if 'name' in model]
    except Exception as e:
        print(f"❌ 获取模型列表失败: {e}")
        return []


def select_model(available_models):
    """让用户选择模型"""
    if not available_models:
        print("❌ 系统中没有可用的模型，请先添加模型配置")
        return None

    print("\n📋 可用模型列表:")
    for i, model in enumerate(available_models, 1):
        print(f"  {i}. {model}")

    while True:
        try:
            choice = input(f"\n🔤 请选择模型 (1-{len(available_models)}): ").strip()
            if choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(available_models):
                    selected_model = available_models[index]
                    print(f"✅ 已选择模型: {selected_model}")
                    return selected_model
            print(f"⚠️ 请输入 1 到 {len(available_models)} 之间的数字")
        except KeyboardInterrupt:
            print("\n👋 操作已取消")
            return None


def stream_generation(requirement, conversation_id, model):
    """流式生成MCP工具"""
    print("\n🔄 开始流式生成...\n")

    try:
        stream = mag.mcp_gen(
            requirement=requirement,
            model=model,
            conversation_id=conversation_id,
            user_id="demo_user",
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
                    print(f"\n[思考]: {delta['reasoning_content']}", flush=True)

            # 处理错误信息
            elif "error" in chunk:
                print(f"\n❌ 错误: {chunk['error']['message']}")
                break

            # 处理完成信息
            elif "completion" in chunk:
                print(f"\n\n✅ MCP工具生成完成!")
                print(f"工具名称: {chunk['completion']['tool_name']}")
                print(f"完成消息: {chunk['completion']['message']}")
                return True

            # 处理未完成信息
            elif "incomplete" in chunk:
                print(f"\n\n⚠️ MCP工具生成未完成")
                print(f"消息: {chunk['incomplete']['message']}")
                print(f"缺少字段: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\n流式生成结束")
        return False

    except Exception as e:
        print(f"\n❌ 流式生成失败: {e}")
        return False


def nonstream_generation(requirement, conversation_id, model):
    """非流式生成MCP工具"""
    print("\n⏳ 开始非流式生成...")

    try:
        result = mag.mcp_gen(
            requirement=requirement,
            model=model,
            conversation_id=conversation_id,
            user_id="demo_user",
            stream=False
        )

        print("\n📋 生成结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        # 分析生成结果
        if "completion" in result:
            print(f"\n✅ MCP工具生成完成!")
            print(f"工具名称: {result['completion'].get('tool_name', '未知')}")
            print(f"完成消息: {result['completion'].get('message', '无消息')}")
            return True
        elif "incomplete" in result:
            print(f"\n⚠️ MCP工具生成未完成")
            print(f"消息: {result['incomplete'].get('message', '无消息')}")
            print(f"缺少字段: {result['incomplete'].get('missing_fields', [])}")
            return False
        elif "errors" in result:
            print(f"\n❌ 生成过程中出现错误:")
            for error in result["errors"]:
                print(f"  - {error.get('message', '未知错误')}")
            return False
        else:
            print(f"\n📝 生成进行中，共 {result.get('total_chunks', 0)} 个数据块")
            return False

    except Exception as e:
        print(f"\n❌ 非流式生成失败: {e}")
        return False


def interactive_mcp_generation():
    """交互式MCP生成"""
    print("🤖 AI生成MCP工具 - 交互式模式")
    print("=" * 50)

    # 获取可用模型并让用户选择
    print("🔍 正在获取可用模型...")
    available_models = get_available_models()
    current_model = select_model(available_models)

    if not current_model:
        print("❌ 无法继续，程序退出")
        return

    # 让用户输入conversation_id
    while True:
        conversation_id = input("📝 请输入对话ID (例如: weather_tool_v1, file_manager, my_mcp_tool): ").strip()
        if conversation_id:
            break
        print("⚠️ 对话ID不能为空，请重新输入")

    print(f"\n📝 对话ID: {conversation_id}")
    print(f"🤖 当前模型: {current_model}")
    print("\n💡 使用说明:")
    print("- 输入你的MCP工具需求")
    print("- 输入 'stream' 切换到流式模式")
    print("- 输入 'nonstream' 切换到非流式模式")
    print("- 输入 'model' 切换模型")
    print("- 输入 '<end>END</end>' 完成工具生成")
    print("- 输入 'quit' 退出程序")

    # 默认使用流式模式
    use_stream = True
    mode_text = "流式" if use_stream else "非流式"
    print(f"\n🔧 当前模式: {mode_text}")

    while True:
        print("\n" + "-" * 30)
        requirement = input("🔤 请输入需求 (或命令): ").strip()

        if not requirement:
            print("⚠️ 输入不能为空，请重新输入")
            continue

        # 处理退出命令
        if requirement.lower() == 'quit':
            print("👋 再见！")
            break

        # 处理模式切换命令
        if requirement.lower() == 'stream':
            use_stream = True
            print("✅ 已切换到流式模式")
            continue
        elif requirement.lower() == 'nonstream':
            use_stream = False
            print("✅ 已切换到非流式模式")
            continue

        # 处理模型切换命令
        if requirement.lower() == 'model':
            print("🔍 重新获取可用模型...")
            available_models = get_available_models()
            new_model = select_model(available_models)
            if new_model and new_model != current_model:
                current_model = new_model
                print(f"✅ 模型已切换到: {current_model}")
            continue

        # 执行生成
        if use_stream:
            completed = stream_generation(requirement, conversation_id, current_model)
        else:
            completed = nonstream_generation(requirement, conversation_id, current_model)

        # 如果完成了工具生成，询问是否继续
        if completed:
            continue_choice = input("\n🔄 工具已完成，是否继续优化？(y/n): ").strip().lower()
            if continue_choice != 'y':
                print("🎉 MCP工具生成完成！")
                break


if __name__ == "__main__":
    interactive_mcp_generation()