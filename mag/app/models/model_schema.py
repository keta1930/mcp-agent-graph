from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator

class ModelConfig(BaseModel):
    """模型配置 - 支持多提供商和多模态的模型配置
    """
    # 用户隔离
    user_id: Optional[str] = Field(default="default_user", description="所属用户ID")

    # 必填参数（保持不变）
    name: str = Field(..., description="模型名称")
    base_url: str = Field(..., description="API基础URL")
    api_key: str = Field(..., description="API密钥")
    model: str = Field(..., description="模型标识符")
    
    # 提供商和模型类型
    provider: Optional[str] = Field(
        default="openai",
        description="模型提供商（openai/google/anthropic等），默认为openai以保持向后兼容"
    )
    model_type: Optional[str] = Field(
        default="llm",
        description="模型类型（llm/vlm/image_gen/audio等），默认为llm以保持向后兼容"
    )
    
    # 可选的OpenAI API参数
    stream: Optional[bool] = Field(default=False, description="是否启用流式返回")
    temperature: Optional[float] = Field(default=None, description="温度参数，控制随机性(0.0-2.0)")
    max_tokens: Optional[int] = Field(default=None, description="最大令牌数")
    max_completion_tokens: Optional[int] = Field(default=None, description="最大完成令牌数")
    top_p: Optional[float] = Field(default=None, description="核采样参数(0.0-1.0)")
    frequency_penalty: Optional[float] = Field(default=None, description="频率惩罚(-2.0-2.0)")
    presence_penalty: Optional[float] = Field(default=None, description="存在惩罚(-2.0-2.0)")
    n: Optional[int] = Field(default=None, description="生成的完成数量")
    stop: Optional[Union[str, List[str]]] = Field(default=None, description="停止序列")
    seed: Optional[int] = Field(default=None, description="随机种子")
    logprobs: Optional[bool] = Field(default=None, description="是否返回对数概率")
    top_logprobs: Optional[int] = Field(default=None, description="返回的顶部对数概率数量")
    extra_body: Optional[Dict[str, Any]] = Field(default=None, description="额外的请求体参数")
    extra_headers: Optional[Dict[str, str]] = Field(default=None, description="额外的请求头")
    timeout: Optional[float] = Field(default=None, description="请求超时时间（秒）")

    @validator('provider')
    def validate_provider(cls, v):
        """确保provider转换为小写"""
        if v is not None:
            return v.lower()
        return "openai"
    
    @validator('model_type')
    def validate_model_type(cls, v):
        """确保model_type转换为小写"""
        if v is not None:
            return v.lower()
        return "llm"

    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and (v < 0.0 or v > 2.0):
            raise ValueError('温度参数必须在0.0到2.0之间')
        return v

    @validator('top_p')
    def validate_top_p(cls, v):
        if v is not None and (v < 0.0 or v > 1.0):
            raise ValueError('top_p参数必须在0.0到1.0之间')
        return v

    @validator('frequency_penalty')
    def validate_frequency_penalty(cls, v):
        if v is not None and (v < -2.0 or v > 2.0):
            raise ValueError('frequency_penalty参数必须在-2.0到2.0之间')
        return v

    @validator('presence_penalty')
    def validate_presence_penalty(cls, v):
        if v is not None and (v < -2.0 or v > 2.0):
            raise ValueError('presence_penalty参数必须在-2.0到2.0之间')
        return v

    @validator('n')
    def validate_n(cls, v):
        if v is not None and v < 1:
            raise ValueError('n参数必须大于0')
        return v

    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and v < 1:
            raise ValueError('max_tokens参数必须大于0')
        return v

    @validator('max_completion_tokens')
    def validate_max_completion_tokens(cls, v):
        if v is not None and v < 1:
            raise ValueError('max_completion_tokens参数必须大于0')
        return v

    @validator('top_logprobs')
    def validate_top_logprobs(cls, v):
        if v is not None and (v < 0 or v > 20):
            raise ValueError('top_logprobs参数必须在0到20之间')
        return v

    @validator('timeout')
    def validate_timeout(cls, v):
        if v is not None and v <= 0:
            raise ValueError('timeout参数必须大于0')
        return v

    class Config:
        extra = "allow"


class ModelConfigList(BaseModel):
    """模型配置列表"""
    models: List[ModelConfig] = Field(default_factory=list)