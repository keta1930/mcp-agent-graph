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
            choice = input(f"\n[Input] Please select a model (1-{len(available_models)}): ").strip()
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


def stream_generation(requirement, conversation_id, model):
    """Stream generation of MCP tools"""
    print("\n[Process] Starting stream generation...\n")

    try:
        stream = mag.gen_mcp(
            requirement=requirement,
            model=model,
            conversation_id=conversation_id,
            user_id="default_user",
            stream=True
        )

        for chunk in stream:
            # Handle OpenAI format chunks
            if "choices" in chunk and chunk["choices"]:
                delta = chunk["choices"][0].get("delta", {})

                # Output generated content
                if delta.get("content"):
                    print(delta["content"], end="", flush=True)

                # Output reasoning content (if any)
                if delta.get("reasoning_content"):
                    print(f"{delta['reasoning_content']}", end="", flush=True)

            # Handle error messages
            elif "error" in chunk:
                print(f"\n[Error] Error: {chunk['error']['message']}")
                break

            # Handle completion messages
            elif "completion" in chunk:
                print(f"\n\n[Success] MCP tool generation completed!")
                print(f"Tool name: {chunk['completion']['tool_name']}")
                print(f"Completion message: {chunk['completion']['message']}")
                return True

            # Handle incomplete messages
            elif "incomplete" in chunk:
                print(f"\n\n[Warning] MCP tool generation incomplete")
                print(f"Message: {chunk['incomplete']['message']}")
                print(f"Missing fields: {chunk['incomplete']['missing_fields']}")
                return False

        print("\n\nStream generation ended")
        return False

    except Exception as e:
        print(f"\n[Error] Stream generation failed: {e}")
        return False


def nonstream_generation(requirement, conversation_id, model):
    """Non-stream generation of MCP tools"""
    print("\n[Wait] Starting non-stream generation...")

    try:
        result = mag.gen_mcp(
            requirement=requirement,
            model=model,
            conversation_id=conversation_id,
            user_id="default_user",
            stream=False
        )

        print("\n[List] Generation result:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        # Analyze generation result
        if "completion" in result:
            print(f"\n[Success] MCP tool generation completed!")
            print(f"Tool name: {result['completion'].get('tool_name', 'Unknown')}")
            print(f"Completion message: {result['completion'].get('message', 'No message')}")
            return True
        elif "incomplete" in result:
            print(f"\n[Warning] MCP tool generation incomplete")
            print(f"Message: {result['incomplete'].get('message', 'No message')}")
            print(f"Missing fields: {result['incomplete'].get('missing_fields', [])}")
            return False
        elif "errors" in result:
            print(f"\n[Error] Errors occurred during generation:")
            for error in result["errors"]:
                print(f"  - {error.get('message', 'Unknown error')}")
            return False
        else:
            print(f"\n[Note] Generation in progress, {result.get('total_chunks', 0)} data chunks in total")
            return False

    except Exception as e:
        print(f"\n[Error] Non-stream generation failed: {e}")
        return False


def interactive_mcp_generation():
    """Interactive MCP generation"""
    print("[AI] AI Generate MCP Tools - Interactive Mode")
    print("=" * 50)

    # Get available models and let user select
    print("[Search] Getting available models...")
    available_models = get_available_models()
    current_model = select_model(available_models)

    if not current_model:
        print("[Error] Cannot continue, program exiting")
        return

    # Let user input conversation_id
    while True:
        conversation_id = input("[Note] Please enter conversation ID (e.g.: weather_tool_v1, file_manager, my_mcp_tool): ").strip()
        if conversation_id:
            break
        print("[Warning] Conversation ID cannot be empty, please re-enter")

    print(f"\n[Note] Conversation ID: {conversation_id}")
    print(f"[AI] Current model: {current_model}")
    print("\n[Tip] Usage instructions:")
    print("- Enter your MCP tool requirements")
    print("- Enter 'stream' to switch to stream mode")
    print("- Enter 'nonstream' to switch to non-stream mode")
    print("- Enter 'model' to switch models")
    print("- Enter '<end>END</end>' to complete tool generation")
    print("- Enter 'quit' to exit program")

    # Use stream mode by default
    use_stream = True
    mode_text = "Stream" if use_stream else "Non-stream"
    print(f"\n[Mode] Current mode: {mode_text}")

    while True:
        print("\n" + "-" * 30)
        requirement = input("[Input] Please enter requirements (or command): ").strip()

        if not requirement:
            print("[Warning] Input cannot be empty, please re-enter")
            continue

        # Handle exit commands
        if requirement.lower() == 'quit':
            print("[Bye] Goodbye!")
            break

        # Handle mode switching commands
        if requirement.lower() == 'stream':
            use_stream = True
            print("[Success] Switched to stream mode")
            continue
        elif requirement.lower() == 'nonstream':
            use_stream = False
            print("[Success] Switched to non-stream mode")
            continue

        # Handle model switching commands
        if requirement.lower() == 'model':
            print("[Search] Re-getting available models...")
            available_models = get_available_models()
            new_model = select_model(available_models)
            if new_model and new_model != current_model:
                current_model = new_model
                print(f"[Success] Model switched to: {current_model}")
            continue

        # Execute generation
        if use_stream:
            completed = stream_generation(requirement, conversation_id, current_model)
        else:
            completed = nonstream_generation(requirement, conversation_id, current_model)

        # If tool generation is completed, ask whether to continue
        if completed:
            continue_choice = input("\n[Process] Tool completed, continue optimization? (y/n): ").strip().lower()
            if continue_choice != 'y':
                print("[Complete] MCP tool generation completed!")
                break


if __name__ == "__main__":
    interactive_mcp_generation()