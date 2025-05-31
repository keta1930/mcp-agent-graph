import re
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def extract_graph_content(text: str) -> Optional[str]:
    """
    从文本中提取 <graph></graph> 标签中的内容
    
    Args:
        text: 包含图配置的文本
        
    Returns:
        提取的图配置JSON字符串，如果未找到则返回None
    """
    if not text:
        return None
    
    try:
        # 使用正则表达式提取 <graph></graph> 中的内容
        pattern = r'<graph>\s*(.*?)\s*</graph>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            graph_content = match.group(1).strip()
            
            # 验证是否是有效的JSON
            try:
                json.loads(graph_content)
                return graph_content
            except json.JSONDecodeError as e:
                logger.error(f"提取的图配置不是有效的JSON: {str(e)}")
                logger.error(f"提取的内容: {graph_content}")
                return None
        else:
            logger.warning("未找到 <graph></graph> 标签")
            return None
            
    except Exception as e:
        logger.error(f"提取图配置时出错: {str(e)}")
        return None


def extract_analysis_content(text: str) -> Optional[str]:
    """
    从文本中提取 <analysis></analysis> 标签中的内容
    
    Args:
        text: 包含分析内容的文本
        
    Returns:
        提取的分析内容，如果未找到则返回None
    """
    if not text:
        return None
    
    try:
        # 使用正则表达式提取 <analysis></analysis> 中的内容
        pattern = r'<analysis>\s*(.*?)\s*</analysis>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            analysis_content = match.group(1).strip()
            return analysis_content
        else:
            logger.warning("未找到 <analysis></analysis> 标签")
            return None
            
    except Exception as e:
        logger.error(f"提取分析内容时出错: {str(e)}")
        return None


def parse_graph_response(text: str) -> Dict[str, Any]:
    """
    解析包含图配置和分析的完整响应
    
    Args:
        text: LLM的完整响应文本
        
    Returns:
        包含解析结果的字典
    """
    result = {
        "success": False,
        "graph_config": None,
        "analysis": None,
        "error": None
    }
    
    try:
        # 提取分析内容
        analysis = extract_analysis_content(text)
        if analysis:
            result["analysis"] = analysis
        
        # 提取图配置
        graph_content = extract_graph_content(text)
        if graph_content:
            try:
                graph_config = json.loads(graph_content)
                result["graph_config"] = graph_config
                result["success"] = True
            except json.JSONDecodeError as e:
                result["error"] = f"图配置JSON解析失败: {str(e)}"
        else:
            result["error"] = "未找到有效的图配置"
            
    except Exception as e:
        result["error"] = f"解析响应时出错: {str(e)}"
    
    return result