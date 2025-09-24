import mag
import json


def add_model():
    """添加新模型配置 - 完整参数示例"""

    model_config = {
        # === 必填参数 ===
        "name": "my-custom-model1",  # SDK中的模型名称（用于调用时标识）
        "base_url": "https://api.example.com/v1",
        "api_key": "your-api-key-here",
        "model": "custom-model-v1",  # API提供商的实际模型名称

        # === 可选的OpenAI API参数 ===
        "temperature": 0.7,  # 温度参数，控制随机性(0.0-2.0)
        "max_tokens": 2000,  # 最大令牌数
        "top_p": 0.9,  # 核采样参数(0.0-1.0)
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

        print("✅ 模型添加成功:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        print(f"\n📋 所有模型配置:")
        print(json.dumps(model_list, ensure_ascii=False, indent=2))

        print(f"\n📋 模型详情:")
        print(json.dumps(model_detail, ensure_ascii=False, indent=2))

    except ValueError as e:
        print(f"❌ 配置错误: {e}")
    except Exception as e:
        print(f"❌ 添加模型出错: {e}")


if __name__ == "__main__":
    add_model()