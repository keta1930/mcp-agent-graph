import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional

from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.models.graph_schema import GraphGenerationRequest

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/prompt-template", response_model=Dict[str, str])
async def get_prompt_template():
    """生成提示词模板，包含节点参数规范、可用工具信息和已有模型名称"""
    try:
        # 1. 连接所有服务器以确保所有工具可用
        connect_result = await mcp_service.connect_all_servers()
        logger.info(f"连接所有服务器结果: {connect_result}")
        
        # 2. 获取所有工具信息
        all_tools_data = await mcp_service.get_all_tools()
        
        # 3. 过滤和转换工具信息为文本描述，添加清晰的标签
        tools_description = ""

        if not all_tools_data:
            tools_description = "当前没有可用的MCP工具。\n\n"
        else:
            tools_description += "# 可用MCP工具\n\n"
            
            # 统计服务器和工具总数
            server_count = len(all_tools_data)
            total_tools = sum(len(tools) for tools in all_tools_data.values())
            tools_description += f"系统中共有 {server_count} 个MCP服务，提供 {total_tools} 个工具。\n\n"
            
            # 遍历每个服务器
            for server_name, tools in all_tools_data.items():
                tools_description += f"## 服务：{server_name}\n\n"
                
                if not tools:
                    tools_description += "此服务未提供工具。\n\n"
                    continue
                
                # 显示此服务的工具数量
                tools_description += f"此服务提供 {len(tools)} 个工具：\n\n"
                
                # 遍历服务提供的每个工具
                for i, tool in enumerate(tools, 1):
                    # 从工具数据中提取需要的字段
                    tool_name = tool.get("name", "未知工具")
                    tool_desc = tool.get("description", "无描述")
                    
                    # 添加工具标签和编号
                    tools_description += f"### 工具 {i}：{tool_name}\n\n"
                    tools_description += f"**工具说明**：{tool_desc}\n\n"
                    
                    # 添加分隔符，除非是最后一个工具
                    if i < len(tools):
                        tools_description += "---\n\n"

                tools_description += "***\n\n"
        
        # 4. 获取所有可用模型
        all_models = model_service.get_all_models()
        models_description = ""
        
        if not all_models:
            models_description = "当前没有配置的模型。\n\n"
        else:
            models_description = "### 可用模型列表：\n\n"
            for model in all_models:
                models_description += f"- `{model['name']}`\n"
            models_description += "\n"
        
        # 5. 读取提示词模板文件
        current_file_dir = Path(__file__).parent.parent
        template_path = current_file_dir / "templates" / "prompt_template.md"
        if not template_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到提示词模板文件"
            )
            
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # 6. 将工具信息和模型信息嵌入到模板中
        final_prompt = template_content.replace("{TOOLS_DESCRIPTION}", tools_description)
        final_prompt = final_prompt.replace("{MODELS_DESCRIPTION}", models_description)
        
        return {
            "prompt": final_prompt
        }
    except Exception as e:
        logger.error(f"生成提示词模板时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成提示词模板时出错: {str(e)}"
        )

@router.get("/optimize-prompt-template", response_model=Dict[str, str])
async def get_optimize_prompt_template(graph_name: Optional[str] = None):
    """生成优化图的提示词模板，可选择包含具体图配置"""
    try:
        # 1. 连接所有服务器以确保所有工具可用
        connect_result = await mcp_service.connect_all_servers()
        logger.info(f"连接所有服务器结果: {connect_result}")
        
        # 2. 获取所有工具信息
        all_tools_data = await mcp_service.get_all_tools()
        
        # 3. 过滤和转换工具信息为文本描述，添加清晰的标签
        tools_description = ""

        if not all_tools_data:
            tools_description = "当前没有可用的MCP工具。\n\n"
        else:
            tools_description += "# 可用MCP工具\n\n"
            
            # 统计服务器和工具总数
            server_count = len(all_tools_data)
            total_tools = sum(len(tools) for tools in all_tools_data.values())
            tools_description += f"系统中共有 {server_count} 个MCP服务，提供 {total_tools} 个工具。\n\n"
            
            # 遍历每个服务器
            for server_name, tools in all_tools_data.items():
                tools_description += f"## 服务：{server_name}\n\n"
                
                if not tools:
                    tools_description += "此服务未提供工具。\n\n"
                    continue
                
                # 显示此服务的工具数量
                tools_description += f"此服务提供 {len(tools)} 个工具：\n\n"
                
                # 遍历服务提供的每个工具
                for i, tool in enumerate(tools, 1):
                    # 从工具数据中提取需要的字段
                    tool_name = tool.get("name", "未知工具")
                    tool_desc = tool.get("description", "无描述")
                    
                    # 添加工具标签和编号
                    tools_description += f"### 工具 {i}：{tool_name}\n\n"
                    tools_description += f"**工具说明**：{tool_desc}\n\n"
                    
                    # 添加分隔符，除非是最后一个工具
                    if i < len(tools):
                        tools_description += "---\n\n"

                tools_description += "***\n\n"
        
        # 4. 获取所有可用模型
        all_models = model_service.get_all_models()
        models_description = ""
        
        if not all_models:
            models_description = "当前没有配置的模型。\n\n"
        else:
            models_description = "### 可用模型列表：\n\n"
            for model in all_models:
                models_description += f"- `{model['name']}`\n"
            models_description += "\n"
        
        # 5. 读取优化图提示词模板文件
        current_file_dir = Path(__file__).parent.parent
        template_path = current_file_dir / "templates" / "optimize_prompt_template.md"
        if not template_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到优化图提示词模板文件"
            )
            
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # 6. 将工具信息和模型信息嵌入到模板中
        final_prompt = template_content.replace("{TOOLS_DESCRIPTION}", tools_description)
        final_prompt = final_prompt.replace("{MODELS_DESCRIPTION}", models_description)
        
        # 7. 如果提供了图名称，则获取图配置并嵌入到模板中
        if graph_name:
            existing_graph = graph_service.get_graph(graph_name)
            if not existing_graph:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{graph_name}'"
                )
            
            # 将图配置转换为JSON格式并嵌入到模板中
            graph_config_json = json.dumps(existing_graph, ensure_ascii=False, indent=2)
            final_prompt = final_prompt.replace("{GRAPH_CONFIG}", graph_config_json)
            
            # 添加占位符提示，用户仍需要指定优化要求
            final_prompt = final_prompt.replace("{OPTIMIZATION_REQUIREMENT}", "[请在此处指定优化要求]")
            
            return {
                "prompt": final_prompt,
                "graph_name": graph_name,
                "has_graph_config": "True"
            }
        else:
            # 如果没有提供图名称，返回原始模板
            return {
                "prompt": final_prompt,
                "has_graph_config": "False",
                "note": "要获取包含具体图配置的优化提示词，请提供graph_name参数"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成优化图提示词模板时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成优化图提示词模板时出错: {str(e)}"
        )

@router.post("/graphs/generate")
async def generate_graph(request: GraphGenerationRequest):
    """AI生成图接口 - 流式SSE响应"""
    try:
        # 基本参数验证
        if not request.requirement.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户需求不能为空"
            )

        if not request.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须指定模型名称"
            )

        # 验证模型是否存在
        model_config = model_service.get_model(request.model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{request.model_name}'"
            )

        # 获取graph配置（如果提供了graph_name）
        graph_config = None
        if request.graph_name:
            graph_config = graph_service.get_graph(request.graph_name)
            if not graph_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{request.graph_name}'"
                )

        # 生成流式响应
        async def generate_stream():
            try:
                async for chunk in graph_service.ai_generate_graph(
                    requirement=request.requirement,
                    model_name=request.model_name,
                    conversation_id=request.conversation_id,
                    user_id=request.user_id,
                    graph_config=graph_config
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"AI图生成流式响应出错: {str(e)}")
                error_chunk = {
                    "error": {
                        "message": str(e),
                        "type": "api_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI图生成处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理AI图生成请求时出错: {str(e)}"
        )
