import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.services.system_tools import (
    get_tool_schema,
    get_tool_names,
    is_system_tool
)
from app.models.system_tools_schema import (
    SystemToolSchema,
    SystemToolListResponse,
    SystemToolDetailResponse
)
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system-tools", tags=["system_tools"])


@router.get("/list", response_model=SystemToolListResponse)
async def list_system_tools(current_user: CurrentUser = Depends(get_current_user)):
    """列出所有系统工具"""
    try:
        tool_names = get_tool_names()
        tools = []

        for tool_name in tool_names:
            tool_schema = get_tool_schema(tool_name)
            if tool_schema:
                tools.append(SystemToolSchema(
                    name=tool_name,
                    schema=tool_schema
                ))

        return SystemToolListResponse(
            success=True,
            tools=tools,
            total_count=len(tools)
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
    """获取系统工具详情"""
    try:
        if not is_system_tool(tool_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"系统工具不存在: {tool_name}"
            )

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
