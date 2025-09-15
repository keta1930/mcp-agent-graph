```python
config = {
        # === 必填参数 ===
        "name": "my-custom-model",  # SDK中的模型名称（用于标识要更新的模型）
        "base_url": "https://api.newprovider.com/v1",
        "api_key": "new-api-key-here",
        "model": "updated-model-v2",  # API提供商的实际模型名称

        # === 优化后的参数配置 ===
        "stream": True,  # 启用流式返回
        "temperature": 0.3,  # 降低随机性，更准确
        "max_tokens": 4000,  # 增加最大令牌数
        "max_completion_tokens": 3000,  # 增加最大完成令牌数
        "top_p": 0.95,  # 调整核采样
        "frequency_penalty": 0.1,  # 轻微频率惩罚
        "presence_penalty": 0.1,  # 轻微存在惩罚
        "n": 1,  # 生成数量
        "stop": ["###", "<END>"],  # 自定义停止序列
        "seed": 123,  # 新的随机种子
        "logprobs": True,  # 启用对数概率
        "top_logprobs": 3,  # 返回前3个对数概率

        # === 高级配置 ===
        "timeout": 60.0,  # 增加超时时间
        "extra_headers": {  # 更新请求头
            "X-API-Version": "2024-01",
            "X-Request-Source": "mag-sdk"
        },
        "extra_body": {  # 更新额外参数
            "response_format": "json",
            "safety_level": "high"
        }
    }
```
