from fastapi import APIRouter

# 导入所有子路由模块
from .chat_routes import router as chat_router
from .graph_import_export_routes import router as graph_import_export_router
from .mcp_routes import router as mcp_router
from .model_routes import router as model_router
from .graph_gen_routes import router as graph_gen_router
from .graph_routes import router as graph_router
from .system_routes import router as system_router
from .prompt_routes import router as prompt_router

# 创建主路由器
router = APIRouter()

# 包含所有子路由
router.include_router(chat_router)
router.include_router(graph_import_export_router)
router.include_router(mcp_router)
router.include_router(model_router)
router.include_router(graph_gen_router)
router.include_router(graph_router)
router.include_router(system_router)
router.include_router(prompt_router)