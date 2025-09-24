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


def show_tips(use_stream=True):
    """Show usage tips"""
    print("\n[Tip] Usage instructions:")
    print("- Enter your graph generation requirements")
    print("- Enter 'stream' to switch to streaming mode")
    print("- Enter 'nonstream' to switch to non-streaming mode")
    print("- Enter 'model' to switch model")
    print("- Enter 'mcp' to reselect MCP servers")
    if use_stream:
        print("- Enter '<end>END</end>' to complete graph generation (only available in streaming mode)")
    else:
        print("- Enter '<end>END</end>' to complete graph generation (need to switch to streaming mode first)")
    print("- Enter 'quit' to exit program")


def select_model(available_models):
    """Let user select a model"""
    if not available_models:
        print("[Error] No available models in the system, please add model configuration first")
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


def stream_generation(requirement, conversation_id, model, mcp_servers, user_id):
    """Stream generation of graph configuration"""
    print("\n[Process] Starting streaming generation...\n")

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
                print(f"\n\n[Success] Graph configuration generation completed!")
                print(f"Graph name: {chunk['completion']['graph_name']}")
                print(f"Completion message: {chunk['completion']['message']}")
                return True

            # Process incomplete messages
            elif "incomplete" in chunk:
                print(f"\n\n[Warning] Graph configuration generation incomplete")
                print(f"Message: {chunk['incomplete']['message']}")
                print(f"Missing fields: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\nStreaming generation ended")
        return False

    except Exception as e:
        print(f"\n[Error] Streaming generation failed: {e}")
        return False


def nonstream_generation(requirement, conversation_id, model, mcp_servers, user_id):
    """Non-streaming generation of graph configuration"""
    print("\n[Wait] Starting non-streaming generation...")

    try:
        result = mag.gen_graph(
            requirement=requirement,
            model_name=model,
            mcp_servers=mcp_servers,
            conversation_id=conversation_id,
            user_id=user_id,
            stream=False
        )

        print("\n[List] Generation result:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        # Analyze generation result
        if "status" in result and result["status"] == "success":
            print(f"\n[Success] Graph configuration generation completed!")
            print(f"Graph name: {result.get('graph_name', 'Unknown')}")
            print(f"Completion message: {result.get('message', 'No message')}")
            return True
        elif "error" in result:
            print(f"\n[Error] Error occurred during generation: {result['error']}")
            return False
        else:
            print(f"\n[Note] Generation response: {result.get('message', 'No message')}")
            return False

    except Exception as e:
        print(f"\n[Error] Non-streaming generation failed: {e}")
        return False


def interactive_graph_generation():
    """Interactive graph generation"""
    print("[AI] AI Graph Configuration Generation - Interactive Mode")
    print("=" * 50)

    # Get available models and let user select
    print("[Search] Getting available models...")
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
        conversation_id = input("\n[Note] Please enter conversation ID (e.g.: my_graph_v1, data_processor, ai_assistant): ").strip()
        if conversation_id:
            break
        print("[Warning] Conversation ID cannot be empty, please re-enter")

    print(f"\n[Note] Conversation ID: {conversation_id}")
    print(f"[AI] Current model: {current_model}")
    print(f"[Tools] Selected MCP servers: {', '.join(current_mcp_servers) if current_mcp_servers else 'None'}")

    # Default to streaming mode
    use_stream = True
    mode_text = "Streaming" if use_stream else "Non-streaming"
    print(f"\n[Mode] Current mode: {mode_text}")

    user_id = "default_user"

    while True:
        print("\n" + "=" * 50)

        # Show current status and tips before each input
        print(f"[Mode] Current mode: {'Streaming' if use_stream else 'Non-streaming'}")
        print(f"[AI] Current model: {current_model}")
        print(f"[Tools] MCP servers: {', '.join(current_mcp_servers) if current_mcp_servers else 'None'}")

        # Show usage tips
        show_tips(use_stream)

        print("\n" + "-" * 30)
        requirement = input("[Input] Please enter requirement (or command): ").strip()

        if not requirement:
            print("[Warning] Input cannot be empty, please re-enter")
            continue

        # Handle exit command
        if requirement.lower() == 'quit':
            print("[Bye] Goodbye!")
            break

        # Handle mode switching commands
        if requirement.lower() == 'stream':
            use_stream = True
            print("[Success] Switched to streaming mode")
            continue
        elif requirement.lower() == 'nonstream':
            use_stream = False
            print("[Success] Switched to non-streaming mode")
            continue

        # Handle model switching command
        if requirement.lower() == 'model':
            print("[Search] Re-getting available models...")
            available_models = get_available_models()
            new_model = select_model(available_models)
            if new_model and new_model != current_model:
                current_model = new_model
                print(f"[Success] Model switched to: {current_model}")
            continue

        # Handle MCP server switching command
        if requirement.lower() == 'mcp':
            print("[Search] Re-getting available MCP servers...")
            available_servers = get_available_mcp_servers()
            new_mcp_servers = select_mcp_servers(available_servers)
            current_mcp_servers = new_mcp_servers
            print(f"[Success] MCP servers updated: {', '.join(current_mcp_servers) if current_mcp_servers else 'None'}")
            continue

        # Check if using end command in non-streaming mode
        if requirement == '<end>END</end>' and not use_stream:
            print("[Warning] '<end>END</end>' command can only be used in streaming mode!")
            print("[Tip] Please enter 'stream' to switch to streaming mode first, then use this command")
            continue

        # Execute generation
        if use_stream:
            completed = stream_generation(requirement, conversation_id, current_model, current_mcp_servers, user_id)
        else:
            completed = nonstream_generation(requirement, conversation_id, current_model, current_mcp_servers, user_id)

        # If graph generation is completed, ask if continue
        if completed:
            continue_choice = input("\n[Process] Graph configuration completed, continue optimization? (y/n): ").strip().lower()
            if continue_choice != 'y':
                print("[Complete] Graph configuration generation completed!")
                break


if __name__ == "__main__":
    interactive_graph_generation()