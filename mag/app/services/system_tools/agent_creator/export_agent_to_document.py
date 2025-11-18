"""
系统工具：export_agent_to_document
将现有 Agent 配置导出为 JSON 文档
"""
import logging
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "export_agent_to_document",
        "description": "将现有Agent配置导出为JSON文档，保存到对话文档系统中。导出的文档可以在文件系统中查看和编辑，用于优化Agent配置。",
        "parameters": {
            "type": "object",
            "properties": {
                "agent_name": {
                    "type": "string",
                    "description": "要导出的Agent名称"
                },
                "filename": {
                    "type": "string",
                    "description": "导出的文档名称（含路径），例如：'agent/code_analyzer.json'。如果不提供，将使用默认名称 'agent/{agent_name}.json'"
                }
            },
            "required": ["agent_name"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    将Agent配置导出为JSON文档
    
    Args:
        user_id: 用户ID
        agent_name: Agent名称
        filename: 文档名称（可选）
        conversation_id: 对话ID
        
    Returns:
        {
            "success": True,
            "filename": "agent/code_analyzer.json",
            "agent_name": "code_analyzer",
            "message": "成功导出Agent到文档"
        }
    """
    try:
        from app.services.agent.agent_service import agent_service
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.infrastructure.database.mongodb.client import mongodb_client
        
        # 验证必需参数
        agent_name = kwargs.get("agent_name")
        conversation_id = kwargs.get("conversation_id")
        agent = kwargs.get("agent_id", "assistant")

        if not agent_name:
            logger.error("缺少必需参数：agent_name")
            return {
                "success": False,
                "message": "缺少必需参数：agent_name"
            }

        # 生成文件名（如果未提供）
        filename = kwargs.get("filename")
        if not filename:
            filename = f"agent/{agent_name}.json"
        
        # 从 agent_service 获取 Agent 配置
        agent_data = await agent_service.get_agent(agent_name, user_id)
        
        if not agent_data:
            logger.warning(f"Agent不存在或无权访问: {agent_name}")
            return {
                "success": False,
                "message": f"无权访问Agent或Agent不存在: {agent_name}"
            }
        
        # 提取配置并格式化为 JSON
        # 移除内部字段
        config_fields = ["name", "card", "model", "instruction", "max_actions", "mcp", "system_tools", "category", "tags"]
        agent_config = {}
        
        for field in config_fields:
            if field in agent_data:
                agent_config[field] = agent_data[field]
        
        # 格式化为 JSON
        content = json.dumps(agent_config, ensure_ascii=False, indent=2)
        
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
                content=content
            )
            
            if not minio_result:
                logger.error(f"更新文档失败: {filename}")
                return {
                    "success": False,
                    "message": f"更新文档失败: {filename}"
                }
            
            # 更新元数据
            summary = f"Agent配置: {agent_name}"
            
            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                log_comment=f"导出Agent: {agent_name}",
                agent=agent
            )
            
            if not success:
                logger.warning(f"更新文件元数据失败: {filename}")
            
            logger.info(f"成功更新Agent文档: {filename}")
            return {
                "success": True,
                "filename": filename,
                "agent_name": agent_name,
                "message": f"成功导出Agent配置：{agent_name}到文档: {filename}"
            }
        else:
            # 文件不存在，创建新文件
            minio_result = await conversation_document_manager.create_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=content
            )
            
            if not minio_result:
                logger.error(f"创建文档失败: {filename}")
                return {
                    "success": False,
                    "message": f"创建文档失败: {filename}"
                }
            
            # 添加元数据到 MongoDB
            summary = f"Agent配置: {agent_name}"
            
            success = await mongodb_client.conversation_repository.add_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent=agent,
                comment=f"导出Agent: {agent_name}"
            )
            
            if not success:
                logger.warning(f"添加文件元数据失败: {filename}")
            
            logger.info(f"成功导出Agent到文档: {filename}")
            return {
                "success": True,
                "filename": filename,
                "agent_name": agent_name,
                "message": f"成功导出Agent配置：{agent_name}到文档: {filename}"
            }
        
    except Exception as e:
        logger.error(f"export_agent_to_document 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"导出Agent失败: {str(e)}"
        }
