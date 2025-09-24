import mag
import json


def list_models():
    """Get all model configurations"""

    try:
        models = mag.list_model()

        print(json.dumps(models, ensure_ascii=False, indent=2))
        print(f"\n✅ Found {len(models)} models in total")

    except Exception as e:
        print(f"❌ Error getting model list: {e}")


if __name__ == "__main__":
    list_models()