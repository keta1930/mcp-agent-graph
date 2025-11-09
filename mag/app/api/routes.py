from fastapi import APIRouter

# 导入所有子路由模块
from .auth_routes import router as auth_router
from .admin_routes import router as admin_router
from .chat_routes import router as chat_router
from .graph_import_export_routes import router as graph_import_export_router
from .mcp_routes import router as mcp_router
from .model_routes import router as model_router
from .graph_gen_routes import router as graph_gen_router
from .graph_routes import router as graph_router
from .system_routes import router as system_router
from .prompt_routes import router as prompt_router
from .task_routes import router as task_router
from .export_routes import router as export_router
from .preview_routes import router as preview_router
from .message_routes import router as message_router

# 创建主路由器
router = APIRouter()

# 包含所有子路由
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(chat_router)
router.include_router(graph_import_export_router)
router.include_router(mcp_router)
router.include_router(model_router)
router.include_router(graph_gen_router)
router.include_router(graph_router)
router.include_router(system_router)
router.include_router(prompt_router)
router.include_router(task_router)
router.include_router(export_router)
router.include_router(preview_router)
router.include_router(message_router)