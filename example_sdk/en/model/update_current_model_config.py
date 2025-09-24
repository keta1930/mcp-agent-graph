import mag
import json


def update_model():
    """Update existing model configuration - complete parameter example"""

    # Updated complete configuration
    updated_config = {
        # === Required parameters ===
        "name": "my-custom-model",  # Model name in SDK (used to identify the model to update)
        "base_url": "https://api.newprovider.com/v1",
        "api_key": "new-api-key-here",
        "model": "updated-model-v2",  # Actual model name from API provider

        # === Updated parameter configuration ===
        "temperature": 0.3,  # Reduce randomness for more accuracy
        "max_tokens": 4000,  # Increase maximum token count
    }

    try:
        result = mag.update_model(name="my-custom-model",config=updated_config)
        model_list = mag.get_model("my-custom-model",detail=True)

        print("✅ Model updated successfully:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        print(f"\n📋 All model configurations:")
        print(json.dumps(model_list, ensure_ascii=False, indent=2))

    except ValueError as e:
        print(f"❌ Configuration error: {e}")
    except Exception as e:
        print(f"❌ Error updating model: {e}")


if __name__ == "__main__":
    update_model()