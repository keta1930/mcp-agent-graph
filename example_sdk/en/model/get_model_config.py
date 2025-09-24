import mag
import json


def get_model():
    """Get configuration for specified model"""

    # You can modify the model name here
    model_name = "deepseek-chat"

    try:
        model = mag.get_model(model_name,detail=True)

        if model:
            print(json.dumps(model, ensure_ascii=False, indent=2))
        else:
            print(f"❌ Model not found: {model_name}")

    except Exception as e:
        print(f"❌ Error getting model configuration: {e}")



if __name__ == "__main__":
    get_model()