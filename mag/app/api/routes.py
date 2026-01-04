from fastapi import APIRouter

# 导入所有子路由模块
from .auth_routes import router as auth_router
from .admin_routes import router as admin_router
from .conversation_routes import router as conversation_router
from .graph_import_export_routes import router as graph_import_export_router
from .mcp_routes import router as mcp_router
from .model_routes import router as model_router
from .graph_routes import router as graph_router
from .system_routes import router as system_router
from .prompt_routes import router as prompt_router
from .task_routes import router as task_router
from .export_routes import router as export_router
from .preview_routes import router as preview_router
from .agent_routes import router as agent_router
from .system_tools_routes import router as system_tools_router
from .conversation_file_routes import router as conversation_file_router
from .user_settings_routes import router as user_settings_router
from .memory_routes import router as memory_router
from .conversation_share_routes import router as conversation_share_router
from .project_routes import router as project_router
from .project_file_routes import router as project_file_router

# 创建主路由器
router = APIRouter()

# 包含所有子路由
# 认证和管理路由（无需前缀，已在各自路由中定义）
router.include_router(auth_router)
router.include_router(admin_router)

# 其他业务路由
router.include_router(conversation_router)
router.include_router(graph_import_export_router)
router.include_router(mcp_router)
router.include_router(model_router)
router.include_router(graph_router)
router.include_router(system_router)
router.include_router(prompt_router)
router.include_router(task_router)
router.include_router(export_router)
router.include_router(preview_router)
router.include_router(agent_router)
router.include_router(system_tools_router)
router.include_router(conversation_file_router)
router.include_router(user_settings_router)
router.include_router(memory_router)
router.include_router(conversation_share_router)
router.include_router(project_router)
router.include_router(project_file_router)