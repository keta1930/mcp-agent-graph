import logging
from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.api.routes import router
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.infrastructure.database.mongodb import mongodb_client
from app.infrastructure.storage.file_storage import FileManager
from app.core.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("mag")

# 创建应用
app = FastAPI(
    title="MAG - MCP Agent Graph",
    description="通过MCP+Graph构建Agent系统的工具",
    version="2.0.0",
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"未处理的异常: {str(exc)}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"服务器内部错误: {str(exc)}"},
    )


# 注册路由
app.include_router(router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info("MAG服务器启动...")

    # 确保目录存在
    try:
        logger.info(f"配置目录: {settings.MAG_DIR}")
        settings.ensure_directories()

        await mongodb_client.initialize(settings.MONGODB_URL,settings.MONGODB_DB)
        logger.info("MongoDB服务初始化成功")

        # 初始化文件系统
        FileManager.initialize()
        logger.info("文件系统初始化成功")

        # 初始化模型服务 (需要在MongoDB之后)
        await model_service.initialize(mongodb_client)
        logger.info("模型服务初始化成功")

        # 初始化图服务
        await graph_service.initialize()
        logger.info("图服务初始化成功")

        # 初始化MCP服务 - 启动客户端进程
        await mcp_service.initialize()
        logger.info("MCP服务初始化成功")

        logger.info("所有服务初始化完成")
    except Exception as e:
        logger.error(f"初始化时出错: {str(e)}")
        import traceback
        traceback.print_exc()


# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("MAG服务器关闭...")

    try:
        # 清理MCP服务
        await mcp_service.cleanup()
        logger.info("MCP服务清理完成")
    except Exception as e:
        logger.error(f"清理MCP服务时出错: {str(e)}")
        import traceback
        traceback.print_exc()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app_name": settings.APP_NAME, "version": settings.APP_VERSION}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9999,
        reload=False,
        log_level="info",
    )