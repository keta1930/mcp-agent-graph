# Installation

## System Requirements

Before installation, ensure your system meets these requirements:

| Component | Requirement |
|-----------|-------------|
| Operating System | Linux, macOS, or Windows (with WSL2) |
| Docker | Version 20.10+ with Docker Compose |
| Python | Version 3.10+ |
| Memory | Minimum 4GB RAM (8GB recommended) |
| Storage | At least 10GB free disk space |

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph
```

### 2. Configure Docker Services

Docker services provide MongoDB database and MinIO object storage.

```bash
cd docker/mag_services
cp .env.example .env
```

Edit the `.env` file with your configuration:

| Configuration | Description | Example |
|---------------|-------------|---------|
| MONGO_ROOT_USERNAME | MongoDB admin username | admin |
| MONGO_ROOT_PASSWORD | MongoDB admin password | strongpassword123 |
| MONGO_PORT | MongoDB service port | 27017 |
| MONGO_EXPRESS_PORT | Database management UI port | 8081 |
| MINIO_ROOT_USER | MinIO admin username | minioadmin |
| MINIO_ROOT_PASSWORD | MinIO admin password | minioadmin123 |
| MINIO_API_PORT | MinIO API port | 9000 |
| MINIO_CONSOLE_PORT | MinIO web console port | 9011 |
| JWT_SECRET_KEY | Security key for authentication | Generate using script |
| ADMIN_USERNAME | Super admin username | admin |
| ADMIN_PASSWORD | Super admin password | securepassword |

**Generate JWT Secret Key:** Run `python mag/scripts/generate_jwt_secret.py` to generate a secure JWT secret key.

### 3. Start Docker Services

```bash
docker-compose up -d
```

Verify services are running:

- MongoDB Express: http://localhost:8081
- MinIO Console: http://localhost:9011

### 4. Deploy Backend

Navigate back to the project root and install backend dependencies:

**Using uv (Recommended):**

```bash
cd ../..  # Return to project root
uv sync

# Start backend service
cd mag
uv run python main.py
```

**Using pip:**

```bash
cd ../..  # Return to project root
pip install -r requirements.txt

# Start backend service
cd mag
python main.py
```

For background execution, use:

```bash
nohup python main.py > app.log 2>&1 &
```

### 5. Access the Application

Open your browser and navigate to:

**http://localhost:9999**

You will see the login page. Use the credentials from your `.env` file:

- **Username:** Value from `ADMIN_USERNAME`
- **Password:** Value from `ADMIN_PASSWORD`

**Additional endpoints:**

- API Documentation: http://localhost:9999/docs
- Health Check: http://localhost:9999/health
- MongoDB Express: http://localhost:8081
- MinIO Console: http://localhost:9011

## Verification

After installation, verify all services are running correctly:

| Service | URL | Expected Status |
|---------|-----|-----------------|
| Web Application | http://localhost:9999 | Login page displayed |
| API Documentation | http://localhost:9999/docs | Interactive API docs |
| Health Check | http://localhost:9999/health | JSON: `{"status": "healthy"}` |
| MongoDB Express | http://localhost:8081 | Database management UI |
| MinIO Console | http://localhost:9011 | Object storage console |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker services fail to start | Check ports are not already in use, verify Docker is running |
| Backend connection error | Verify MongoDB and MinIO are running, check `.env` configuration |
| Cannot login | Verify admin credentials in `.env` file match login attempt |
| Port 9999 already in use | Change the port in `mag/main.py` (default: 9999) |

## For Developers

If you want to modify the frontend code, you can run the frontend development server separately:

### Frontend Development Setup

**Requirements:**
- Node.js 16+
- npm 7+

**Steps:**

```bash
cd frontend
npm install
npm run dev
```

The development server will start at http://localhost:5173 with hot-reload enabled.

**Building Frontend:**

After making changes to the frontend:

```bash
npm run build
```

This creates optimized production files in `frontend/dist/` which will be served by the backend.

**Note:** The repository includes pre-built frontend files, so this step is only needed if you're developing or customizing the frontend.

## Production Deployment

For production environments, consider these additional steps:

1. **Security:**
   - Change all default passwords in `.env`
   - Use a strong JWT secret key (minimum 32 characters)
   - Configure firewall rules to limit access
   - Set up HTTPS with a reverse proxy (nginx/Caddy)

2. **Performance:**
   - Increase MongoDB connection pool size
   - Configure MinIO for distributed storage if needed
   - Use production-optimized settings

3. **Monitoring:**
   - Set up application logging
   - Monitor Docker container resources
   - Configure health check alerts

## Next Steps

After successful installation:

1. [Quickstart Guide](quickstart.md) - Create your first agent
2. [Agent Configuration](../core-components/agent/config.md) - Learn about agent setup
3. [Graph Designer](../core-components/graph/index.md) - Build agent workflows
