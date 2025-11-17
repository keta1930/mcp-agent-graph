"""
系统工具：export_graph_to_document
将现有 Graph 配置导出为文档
"""
import logging
import json
from typing import Dict, Any
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
from app.infrastructure.database.mongodb.client import mongodb_client

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "export_graph_to_document",
        "description": "将现有Graph配置导出为JSON文档，保存到对话文档系统中。导出的文档可以在文件系统中查看和编辑。",
        "parameters": {
            "type": "object",
            "properties": {
                "graph_name": {
                    "type": "string",
                    "description": "要导出的Graph名称"
                },
                "filename": {
                    "type": "string",
                    "description": "导出的文档名称（含路径），例如：'graph/my_graph.json'。如果不提供，将使用默认名称 'graph/{graph_name}.json'"
                }
            },
            "required": ["graph_name"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    将Graph导出为文档
    
    Args:
        user_id: 用户ID
        graph_name: Graph名称
        filename: 文档名称（可选）
        conversation_id: 对话ID
        
    Returns:
        {
            "success": True,
            "filename": "graph/my_graph.json",
            "graph_name": "my_graph",
            "message": "成功导出Graph到文档"
        }
    """
    try:
        # 验证必需参数
        from app.services.graph.graph_service import graph_service
        graph_name = kwargs.get("graph_name")
        conversation_id = kwargs.get("conversation_id")
        
        if not graph_name:
            logger.error("缺少必需参数：graph_name")
            return {
                "success": False,
                "message": "缺少必需参数：graph_name"
            }
        
        if not conversation_id:
            logger.error("缺少必需参数：conversation_id")
            return {
                "success": False,
                "message": "缺少必需参数：conversation_id"
            }
        
        # 生成文件名（如果未提供）
        filename = kwargs.get("filename")
        if not filename:
            filename = f"graph/{graph_name}.json"
        
        logger.info(f"正在导出Graph: {graph_name} 到文档: {filename}")
        
        # 从 graph_service 获取 Graph 配置
        graph_config = await graph_service.get_graph(graph_name, user_id)
        
        if not graph_config:
            logger.warning(f"Graph不存在或无权访问: {graph_name}")
            return {
                "success": False,
                "message": f"无权访问Graph或Graph不存在: {graph_name}"
            }
        
        # 提取配置部分（去除元数据）
        config_data = graph_config.get("config", {})
        
        # 将 Graph 配置序列化为 JSON
        try:
            json_content = json.dumps(config_data, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"序列化Graph配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"序列化Graph配置失败: {str(e)}"
            }
        
        # 检查文件是否已存在
        file_exists = await mongodb_client.conversation_repository.file_exists(
            conversation_id, filename
        )
        
        if file_exists:
            # 文件已存在，更新文件
            minio_result = await conversation_document_manager.update_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=json_content
            )
            
            if not minio_result:
                logger.error(f"更新文档失败: {filename}")
                return {
                    "success": False,
                    "message": f"更新文档失败: {filename}"
                }
            
            # 更新元数据
            summary = f"Graph配置: {graph_name}"
            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                log_comment=f"导出Graph: {graph_name}",
                agent="system"
            )
            
            if not success:
                logger.warning(f"更新文件元数据失败: {filename}")
            
            logger.info(f"成功更新Graph文档: {filename}")
            return {
                "success": True,
                "filename": filename,
                "graph_name": graph_name,
                "message": f"成功导出Graph到文档: {filename}"
            }
        else:
            # 文件不存在，创建新文件
            minio_result = await conversation_document_manager.create_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=json_content
            )
            
            if not minio_result:
                logger.error(f"创建文档失败: {filename}")
                return {
                    "success": False,
                    "message": f"创建文档失败: {filename}"
                }
            
            # 添加元数据到 MongoDB
            summary = f"Graph配置: {graph_name}"
            success = await mongodb_client.conversation_repository.add_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent="system"
            )
            
            if not success:
                logger.warning(f"添加文件元数据失败: {filename}")
            
            logger.info(f"成功导出Graph到文档: {filename}")
            return {
                "success": True,
                "filename": filename,
                "graph_name": graph_name,
                "message": f"成功导出Graph到文档: {filename}"
            }
        
    except Exception as e:
        logger.error(f"export_graph_to_document 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"导出Graph失败: {str(e)}"
        }
