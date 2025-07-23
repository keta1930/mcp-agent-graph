import re
import json
import logging
from typing import Optional, Dict, Any, List
import datetime

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

def extract_title_content(text: str) -> Optional[str]:
    """
    从文本中提取 <title></title> 标签中的内容
    
    Args:
        text: 包含标题的文本
        
    Returns:
        提取的标题字符串，如果未找到则返回None
    """
    if not text:
        return None
    
    try:
        # 使用正则表达式提取 <title></title> 中的内容
        pattern = r'<title>\s*(.*?)\s*</title>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            title_content = match.group(1).strip()
            return title_content if title_content else None
        else:
            logger.warning("未找到 <title></title> 标签")
            return None
            
    except Exception as e:
        logger.error(f"提取标题内容时出错: {str(e)}")
        return None


def extract_tags_content(text: str) -> List[str]:
    """
    从文本中提取 <tags></tags> 标签中的内容
    
    Args:
        text: 包含标签的文本
        
    Returns:
        提取的标签列表，如果未找到则返回空列表
    """
    if not text:
        return []
    
    try:
        # 使用正则表达式提取 <tags></tags> 中的内容
        pattern = r'<tags>\s*(.*?)\s*</tags>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            tags_content = match.group(1).strip()
            if tags_content:
                # 分割标签，支持逗号、分号、换行等分隔符
                tags = re.split(r'[,;，；\n\r]+', tags_content)
                # 清理空白并过滤空标签
                tags = [tag.strip() for tag in tags if tag.strip()]
                # 限制标签数量和长度
                tags = tags[:5]  # 最多5个标签
                tags = [tag[:20] for tag in tags]  # 每个标签最长20字符
                return tags
            else:
                return []
        else:
            logger.warning("未找到 <tags></tags> 标签")
            return []
            
    except Exception as e:
        logger.error(f"提取标签内容时出错: {str(e)}")
        return []


def parse_title_and_tags_response(text: str) -> Dict[str, Any]:
    """
    解析包含标题和标签的完整响应
    
    Args:
        text: LLM的完整响应文本
        
    Returns:
        包含解析结果的字典
    """
    result = {
        "success": False,
        "title": None,
        "tags": [],
        "error": None
    }
    
    try:
        # 提取标题
        title = extract_title_content(text)
        if title:
            result["title"] = title
        
        # 提取标签
        tags = extract_tags_content(text)
        if tags:
            result["tags"] = tags
            
        # 如果至少有标题，认为解析成功
        if title:
            result["success"] = True
        else:
            result["error"] = "未找到有效的标题"
            
    except Exception as e:
        result["error"] = f"解析标题和标签响应时出错: {str(e)}"
    
    return result


# 在 text_parser.py 中添加以下方法

def extract_todo_content(text: str) -> Optional[str]:
    """
    从文本中提取 to do 标签中的内容
    """
    if not text:
        return None

    try:
        pattern = r'<todo>\s*(.*?)\s*</todo>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            todo_content = match.group(1).strip()
            return todo_content if todo_content else None
        else:
            logger.warning("未找到 <todo></todo> 标签")
            return None

    except Exception as e:
        logger.error(f"提取TODO内容时出错: {str(e)}")
        return None


def extract_graph_name_content(text: str) -> Optional[str]:
    """
    从文本中提取 <graph_name></graph_name> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <graph_name></graph_name> 中的内容
        pattern = r'<graph_name>\s*(.*?)\s*</graph_name>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            graph_name = match.group(1).strip()
            return graph_name if graph_name else None
        else:
            logger.warning("未找到 <graph_name></graph_name> 标签")
            return None

    except Exception as e:
        logger.error(f"提取图名称时出错: {str(e)}")
        return None


def extract_graph_description_content(text: str) -> Optional[str]:
    """
    从文本中提取 <graph_description></graph_description> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <graph_description></graph_description> 中的内容
        pattern = r'<graph_description>\s*(.*?)\s*</graph_description>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            graph_description = match.group(1).strip()
            return graph_description if graph_description else None
        else:
            logger.warning("未找到 <graph_description></graph_description> 标签")
            return None

    except Exception as e:
        logger.error(f"提取图描述时出错: {str(e)}")
        return None


def extract_node_content(text: str) -> List[Dict[str, Any]]:
    """
    从文本中提取所有 <node></node> 标签中的内容
    """
    if not text:
        return []

    try:
        # 使用正则表达式提取所有 <node></node> 中的内容
        pattern = r'<node>\s*(.*?)\s*</node>'
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)

        nodes = []
        for match in matches:
            node_content = match.strip()
            if node_content:
                try:
                    # 尝试解析JSON
                    node_config = json.loads(node_content)
                    nodes.append(node_config)
                except json.JSONDecodeError as e:
                    logger.error(f"节点配置JSON解析失败: {str(e)}")
                    logger.error(f"节点内容: {node_content}")
                    continue

        logger.info(f"成功提取 {len(nodes)} 个节点配置")
        return nodes

    except Exception as e:
        logger.error(f"提取节点内容时出错: {str(e)}")
        return []


def extract_end_template_content(text: str) -> Optional[str]:
    """
    从文本中提取 <end_template></end_template> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <end_template></end_template> 中的内容
        pattern = r'<end_template>\s*(.*?)\s*</end_template>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            end_template = match.group(1).strip()
            return end_template if end_template else None
        else:
            logger.warning("未找到 <end_template></end_template> 标签")
            return None

    except Exception as e:
        logger.error(f"提取结束模板时出错: {str(e)}")
        return None


def parse_ai_generation_response(text: str) -> Dict[str, Any]:
    """
    解析AI图生成响应，提取所有可能的结构化内容
    """
    result = {
        "analysis": None,
        "todo": None,
        "graph_name": None,
        "graph_description": None,
        "nodes": [],
        "end_template": None,
        "raw_response": text
    }

    try:
        # 提取各种内容
        result["analysis"] = extract_analysis_content(text)
        result["todo"] = extract_todo_content(text)
        result["graph_name"] = extract_graph_name_content(text)
        result["graph_description"] = extract_graph_description_content(text)
        result["nodes"] = extract_node_content(text)
        result["end_template"] = extract_end_template_content(text)

        # 记录提取到的内容类型
        extracted_types = []
        for key, value in result.items():
            if key != "raw_response" and value is not None:
                if key == "nodes" and len(value) > 0:
                    extracted_types.append(f"{key}({len(value)})")
                elif key != "nodes":
                    extracted_types.append(key)

        if extracted_types:
            logger.info(f"成功解析AI响应，提取到: {', '.join(extracted_types)}")
        else:
            logger.warning("AI响应中未找到任何结构化内容")

    except Exception as e:
        logger.error(f"解析AI生成响应时出错: {str(e)}")

    return result