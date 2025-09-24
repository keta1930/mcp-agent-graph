import mag
import json


def add_model():
    """Add new model configuration - complete parameter example"""

    model_config = {
        # === Required parameters ===
        "name": "my-custom-model1",  # Model name in SDK (used for identification when calling)
        "base_url": "https://api.example.com/v1",
        "api_key": "your-api-key-here",
        "model": "custom-model-v1",  # Actual model name from API provider

        # === Optional OpenAI API parameters ===
        "temperature": 0.7,  # Temperature parameter, controls randomness (0.0-2.0)
        "max_tokens": 2000,  # Maximum token count
        "top_p": 0.9,  # Nucleus sampling parameter (0.0-1.0)
    }

    model_config2 = {
        "name": "my-custom-model2",
        "base_url": "https://api.example.com/v1",
        "api_key": "your-api-key-here",
        "model": "custom-model-v2",
        "temperature": 0.7,
        "max_tokens": 2000,
        "top_p": 0.9,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0,
     }

    try:
        result = mag.add_model(model_config)
        mag.add_model(model_config2)
        model_detail = mag.get_model("my-custom-model1",detail=True)
        model_list = mag.list_model()

        print("✅ Model added successfully:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        print(f"\n📋 All model configurations:")
        print(json.dumps(model_list, ensure_ascii=False, indent=2))

        print(f"\n📋 Model details:")
        print(json.dumps(model_detail, ensure_ascii=False, indent=2))

    except ValueError as e:
        print(f"❌ Configuration error: {e}")
    except Exception as e:
        print(f"❌ Error adding model: {e}")


if __name__ == "__main__":
    add_model()