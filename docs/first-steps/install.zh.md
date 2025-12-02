# 安装

## 系统要求

安装前请确保系统满足以下要求:

| 组件 | 要求                              |
|------|---------------------------------|
| 操作系统 | Linux、macOS 或 Windows (需要 WSL2) |
| Docker | 20.10+ 版本,包含 Docker Compose     |
| Python | 3.11+ 版本                        |
| 内存 | 最低 4GB (推荐 8GB)                 |
| 存储空间 | 至少 10GB 可用空间                    |

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph
```

### 2. 配置 Docker 服务

Docker 服务提供 MongoDB 数据库和 MinIO 对象存储。

```bash
cd docker/mag_services
cp .env.example .env
```

编辑 `.env` 文件配置必要参数:

| 配置项 | 说明 | 示例 |
|--------|------|------|
| MONGO_ROOT_USERNAME | MongoDB 管理员用户名 | admin |
| MONGO_ROOT_PASSWORD | MongoDB 管理员密码 | strongpassword123 |
| MONGO_PORT | MongoDB 服务端口 | 27017 |
| MONGO_EXPRESS_PORT | 数据库管理界面端口 | 8081 |
| MINIO_ROOT_USER | MinIO 管理员用户名 | minioadmin |
| MINIO_ROOT_PASSWORD | MinIO 管理员密码 | minioadmin123 |
| MINIO_API_PORT | MinIO API 端口 | 9000 |
| MINIO_CONSOLE_PORT | MinIO 控制台端口 | 9011 |
| JWT_SECRET_KEY | 认证安全密钥 | 使用脚本生成 |
| ADMIN_USERNAME | 超级管理员用户名 | admin |
| ADMIN_PASSWORD | 超级管理员密码 | securepassword |

**生成 JWT 密钥：** 运行 `python mag/scripts/generate_jwt_secret.py` 生成安全的 JWT 密钥。

### 3. 启动 Docker 服务

```bash
docker-compose up -d
```

验证服务运行状态:

- MongoDB Express: http://localhost:8081
- MinIO 控制台: http://localhost:9011

### 4. 部署后端

返回项目根目录并安装后端依赖:

**使用 uv (推荐):**

```bash
cd ../..  # 返回项目根目录
uv sync

# 启动后端服务
cd mag
uv run python main.py
```

**使用 pip:**

```bash
cd ../..  # 返回项目根目录
pip install -r requirements.txt

# 启动后端服务
cd mag
python main.py
```

如需后台运行，使用:

```bash
nohup python main.py > app.log 2>&1 &
```

### 5. 访问应用

打开浏览器，访问:

**http://localhost:9999**

您将看到登录页面。使用 `.env` 文件中配置的凭据登录:

- **用户名:** `ADMIN_USERNAME` 的值
- **密码:** `ADMIN_PASSWORD` 的值

**其他访问端点:**

- API 文档: http://localhost:9999/docs
- 健康检查: http://localhost:9999/health
- MongoDB Express: http://localhost:8081
- MinIO 控制台: http://localhost:9011

## 验证安装

安装完成后验证所有服务运行状态:

| 服务 | 地址 | 预期状态 |
|------|------|----------|
| Web 应用 | http://localhost:9999 | 显示登录页面 |
| API 文档 | http://localhost:9999/docs | 显示交互式 API 文档 |
| 健康检查 | http://localhost:9999/health | JSON: `{"status": "healthy"}` |
| MongoDB Express | http://localhost:8081 | 数据库管理界面 |
| MinIO 控制台 | http://localhost:9011 | 对象存储控制台 |

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| Docker 服务启动失败 | 检查端口是否被占用,验证 Docker 是否运行 |
| 后端连接错误 | 验证 MongoDB 和 MinIO 是否运行,检查 `.env` 配置 |
| 无法登录 | 验证 `.env` 文件中的管理员凭据与登录信息匹配 |
| 端口 9999 已被占用 | 在 `mag/main.py` 中修改端口 (默认: 9999) |

## 开发者指南

如果您想修改前端代码，可以单独运行前端开发服务器:

### 前端开发环境

**系统要求:**
- Node.js 16+
- npm 7+

**步骤:**

```bash
cd frontend
npm install
npm run dev
```

开发服务器将在 http://localhost:5173 启动，支持热重载。

**构建前端:**

修改前端代码后:

```bash
npm run build
```

这会在 `frontend/dist/` 中创建优化后的生产文件，后端将自动提供这些文件。

**注意:** 仓库中已包含预构建的前端文件，只有在开发或自定义前端时才需要此步骤。

## 生产环境部署

在生产环境中，请考虑以下额外步骤:

1. **安全性:**
   - 修改 `.env` 中的所有默认密码
   - 使用强 JWT 密钥 (最少 32 个字符)
   - 配置防火墙规则限制访问
   - 使用反向代理 (nginx/Caddy) 配置 HTTPS

2. **性能:**
   - 增加 MongoDB 连接池大小
   - 根据需要配置 MinIO 分布式存储
   - 使用生产优化设置

3. **监控:**
   - 设置应用日志记录
   - 监控 Docker 容器资源
   - 配置健康检查告警

## 下一步

安装成功后:

1. [快速入门](quickstart.md) - 创建第一个 Agent
2. [Agent 配置](../core-components/agent/config.md) - 学习 Agent 设置
3. [Graph 设计器](../core-components/graph/index.md) - 构建 Agent 工作流
