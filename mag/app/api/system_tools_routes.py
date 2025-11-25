import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.services.system_tools import (
    get_tool_schema,
    get_tool_names,
    is_system_tool,
    get_tools_by_category
)
from app.services.system_tools.registry import set_user_language_context
from app.infrastructure.database.mongodb import mongodb_client
from app.models.system_tools_schema import (
    SystemToolSchema,
    SystemToolListResponse,
    SystemToolDetailResponse,
    ToolCategory
)
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system-tools", tags=["system_tools"])


@router.get("/list", response_model=SystemToolListResponse)
async def list_system_tools(current_user: CurrentUser = Depends(get_current_user)):
    """列出所有系统工具（按类别分组，根据用户语言返回对应描述）"""
    try:
        # 获取用户语言并设置到上下文
        user_language = await mongodb_client.user_repository.get_user_language(current_user.user_id)
        set_user_language_context(user_language)
        logger.debug(f"用户 {current_user.user_id} 的语言设置为: {user_language}")
        
        # 按类别获取工具（自动返回对应语言的 schema）
        tools_by_category = get_tools_by_category()
        
        categories = []
        total_count = 0
        
        # 构建分类响应
        for category_name, tools_list in sorted(tools_by_category.items()):
            tool_schemas = []
            for tool_info in tools_list:
                tool_schemas.append(SystemToolSchema(
                    name=tool_info["name"],
                    schema=tool_info["schema"]
                ))
            
            categories.append(ToolCategory(
                category=category_name,
                tools=tool_schemas,
                tool_count=len(tool_schemas)
            ))
            total_count += len(tool_schemas)
        
        return SystemToolListResponse(
            success=True,
            categories=categories,
            total_count=total_count
        )
    except Exception as e:
        logger.error(f"列出系统工具失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出系统工具失败: {str(e)}"
        )


@router.get("/{tool_name}", response_model=SystemToolDetailResponse)
async def get_system_tool_detail(
    tool_name: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取系统工具详情（根据用户语言返回对应描述）"""
    try:
        # 获取用户语言并设置到上下文
        user_language = await mongodb_client.user_repository.get_user_language(current_user.user_id)
        set_user_language_context(user_language)
        logger.debug(f"用户 {current_user.user_id} 的语言设置为: {user_language}")
        
        if not is_system_tool(tool_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"系统工具不存在: {tool_name}"
            )

        # 获取工具 schema（自动返回对应语言的版本）
        tool_schema = get_tool_schema(tool_name)

        return SystemToolDetailResponse(
            success=True,
            name=tool_name,
            schema=tool_schema,
            error=None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取系统工具详情失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统工具详情失败: {str(e)}"
        )
