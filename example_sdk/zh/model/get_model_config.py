import mag
import json


def get_model():
    """获取指定模型的配置"""

    # 可以修改这里的模型名称
    model_name = "deepseek-chat"

    try:
        model = mag.get_model(model_name,detail=True)

        if model:
            print(json.dumps(model, ensure_ascii=False, indent=2))
        else:
            print(f"❌ 找不到模型: {model_name}")

    except Exception as e:
        print(f"❌ 获取模型配置出错: {e}")



if __name__ == "__main__":
    get_model()