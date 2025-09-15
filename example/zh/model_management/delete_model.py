import mag
import json


def delete_model():
    """删除指定模型配置"""

    # 要删除的模型名称
    model_name = "my-updated-model"

    try:
        result = mag.delete_model(model_name)

        print("✅ 模型删除成功:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"❌ 删除模型出错: {e}")


if __name__ == "__main__":
    delete_model()