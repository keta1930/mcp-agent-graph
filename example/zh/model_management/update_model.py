import mag
import json


def update_model():
    """更新现有模型配置 - 完整参数示例"""

    # 更新后的完整配置
    updated_config = {
        # === 必填参数 ===
        "name": "my-custom-model",  # SDK中的模型名称（用于标识要更新的模型）
        "base_url": "https://api.newprovider.com/v1",
        "api_key": "new-api-key-here",
        "model": "updated-model-v2",  # API提供商的实际模型名称

        # === 更新后的参数配置 ===
        "temperature": 0.3,  # 降低随机性，更准确
        "max_tokens": 4000,  # 增加最大令牌数
    }

    try:
        result = mag.update_model(name="my-custom-model",config=updated_config)
        model_list = mag.get_model("my-custom-model",detail=True)

        print("✅ 模型更新成功:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        print(f"\n📋 所有模型配置:")
        print(json.dumps(model_list, ensure_ascii=False, indent=2))

    except ValueError as e:
        print(f"❌ 配置错误: {e}")
    except Exception as e:
        print(f"❌ 更新模型出错: {e}")


if __name__ == "__main__":
    update_model()