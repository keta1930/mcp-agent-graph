import mag
import json


def delete_model():
    """Delete specified model configuration"""

    # Model name to delete
    model_name = "my-updated-model"

    try:
        result = mag.delete_model(model_name)

        print("✅ Model deleted successfully:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"❌ Error deleting model: {e}")


if __name__ == "__main__":
    delete_model()