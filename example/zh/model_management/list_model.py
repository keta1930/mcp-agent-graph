import mag
import json


def list_models():
    """获取所有模型配置"""

    try:
        models = mag.list_model()

        print(json.dumps(models, ensure_ascii=False, indent=2))
        print(f"\n✅ 共找到 {len(models)} 个模型")

    except Exception as e:
        print(f"❌ 获取模型列表出错: {e}")


if __name__ == "__main__":
    list_models()