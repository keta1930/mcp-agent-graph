"""API参数构建器 - 负责构建模型API调用参数"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ParamBuilder:
    """API参数构建器"""

    @staticmethod
    def add_model_params(params: Dict[str, Any], model_config: Dict[str, Any]) -> None:
        """添加模型配置参数到API调用参数中"""
        optional_params = [
            'temperature', 'max_tokens', 'max_completion_tokens',
            'top_p', 'frequency_penalty', 'presence_penalty', 'n',
            'stop', 'seed', 'logprobs', 'top_logprobs'
        ]

        for param in optional_params:
            if param in model_config and model_config[param] is not None:
                if param in ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']:
                    params[param] = float(model_config[param])
                elif param in ['max_tokens', 'max_completion_tokens', 'n', 'seed', 'top_logprobs']:
                    params[param] = int(model_config[param])
                else:
                    params[param] = model_config[param]

    @staticmethod
    def get_extra_kwargs(model_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取额外的请求参数"""
        extra_kwargs = {}
        if model_config.get('extra_headers'):
            extra_kwargs['extra_headers'] = model_config['extra_headers']
        if model_config.get('timeout'):
            extra_kwargs['timeout'] = model_config['timeout']
        if model_config.get('extra_body'):
            extra_kwargs['extra_body'] = model_config['extra_body']
        return extra_kwargs

    @staticmethod
    def prepare_api_params(base_params: Dict[str, Any], model_config: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """准备完整的API调用参数

        Args:
            base_params: 基础参数（model, messages, stream等）
            model_config: 模型配置

        Returns:
            (params, extra_kwargs): 处理后的参数和额外关键字参数
        """
        # 复制基础参数以避免修改原始字典
        params = base_params.copy()

        # 添加模型配置参数
        ParamBuilder.add_model_params(params, model_config)

        # 获取额外参数
        extra_kwargs = ParamBuilder.get_extra_kwargs(model_config)

        return params, extra_kwargs
