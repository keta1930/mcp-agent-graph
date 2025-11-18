import re
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

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



def extract_script_file_content(text: str) -> Dict[str, str]:
    """
    从文本中提取所有 <script_file name="文件名">代码</script_file> 标签中的内容
    """
    if not text:
        return {}

    try:
        # 使用正则表达式提取所有 <script_file name="...">...</script_file> 中的内容
        pattern = r'<script_file\s+name=["\']([^"\']+)["\']>\s*(.*?)\s*</script_file>'
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)

        script_files = {}
        for filename, content in matches:
            filename = filename.strip()
            content = content.strip()
            if filename and content:
                script_files[filename] = content
                logger.info(f"成功提取脚本文件: {filename}")

        return script_files

    except Exception as e:
        logger.error(f"提取脚本文件内容时出错: {str(e)}")
        return {}


def extract_dependencies_content(text: str) -> Optional[str]:
    """
    从文本中提取 <dependencies></dependencies> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <dependencies></dependencies> 中的内容
        pattern = r'<dependencies>\s*(.*?)\s*</dependencies>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            dependencies_content = match.group(1).strip()
            return dependencies_content if dependencies_content else None
        else:
            logger.debug("未找到 <dependencies></dependencies> 标签")
            return None

    except Exception as e:
        logger.error(f"提取依赖内容时出错: {str(e)}")
        return None


def extract_readme_content(text: str) -> Optional[str]:
    """
    从文本中提取 <readme></readme> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <readme></readme> 中的内容
        pattern = r'<readme>\s*(.*?)\s*</readme>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            readme_content = match.group(1).strip()
            return readme_content if readme_content else None
        else:
            logger.debug("未找到 <readme></readme> 标签")
            return None

    except Exception as e:
        logger.error(f"提取README内容时出错: {str(e)}")
        return None


def extract_folder_name_content(text: str) -> Optional[str]:
    """
    从文本中提取 <folder_name></folder_name> 标签中的内容
    """
    if not text:
        return None

    try:
        # 使用正则表达式提取 <folder_name></folder_name> 中的内容
        pattern = r'<folder_name>\s*(.*?)\s*</folder_name>'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            folder_name = match.group(1).strip()
            return folder_name if folder_name else None
        else:
            logger.debug("未找到 <folder_name></folder_name> 标签")
            return None

    except Exception as e:
        logger.error(f"提取文件夹名称时出错: {str(e)}")
        return None

def parse_ai_mcp_generation_response(text: str) -> Dict[str, Any]:
    """
    解析AI MCP生成响应，提取所有可能的结构化内容

    Args:
        text: AI的完整响应文本

    Returns:
        包含解析结果的字典
    """
    result = {
        "folder_name": None,
        "script_files": {},
        "dependencies": None,
        "readme": None,
        "raw_response": text
    }

    try:
        # 提取各种内容
        result["folder_name"] = extract_folder_name_content(text)
        result["script_files"] = extract_script_file_content(text)
        result["dependencies"] = extract_dependencies_content(text)
        result["readme"] = extract_readme_content(text)

        # 记录提取到的内容类型
        extracted_types = []
        for key, value in result.items():
            if key != "raw_response" and value is not None:
                if key == "script_files" and isinstance(value, dict) and len(value) > 0:
                    extracted_types.append(f"{key}({len(value)})")
                elif key != "script_files":
                    extracted_types.append(key)

        if extracted_types:
            logger.info(f"成功解析AI MCP响应，提取到: {', '.join(extracted_types)}")
        else:
            logger.warning("AI MCP响应中未找到任何结构化内容")

    except Exception as e:
        logger.error(f"解析AI MCP生成响应时出错: {str(e)}")

    return result