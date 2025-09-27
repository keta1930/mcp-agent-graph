![MCP Agent Graph Logo](assets/logo.png)

English | [中文](README_CN.md)

📚 [Documentation](https://keta1930.github.io/mcp-agent-graph/#) | 📦 [PyPI Package](https://pypi.org/project/mcp-agent-graph/)

## 📚 Table of Contents

- [🚀 Deployment Guide](#-deployment-guide)
  - [Step 1: Clone Project](#step-1-clone-project)
  - [Step 2: Start Docker Services](#step-2-start-docker-services)
  - [Step 3: Start Frontend Service](#step-3-start-frontend-service)
  - [Step 4: Backend Deployment](#step-4-backend-deployment)
- [✨ Core Features](#-core-features)
- [🖼️ Frontend Feature Showcase](#️-frontend-feature-showcase)
  - [deepresearch (Agent Generated)](#deepresearch-agent-generated)
  - [corporate_ethics_dilemma_v2 (Agent Generated)](#corporate_ethics_dilemma_v2-agent-generated)
- [🏗️ Development Details](#️-development-details)
- [📖 Citation](#-citation)
- [WeChat Group](#wechat-group)
- [⭐ Star History](#-star-history)

## 🚀 Deployment Guide

### Step 1: Clone Project
```bash
git clone https://github.com/keta1930/mcp-agent-graph.git
```

### Step 2: Start Docker Services

```bash
# Copy environment configuration file, or use .env file directly
cd docker/mag_services
cp .env.example .env

# Start Docker services
docker-compose up -d
```

**Default .env Service Addresses:**
- MongoDB Express (Database Management): http://localhost:8081
- MinIO Console (File Storage): http://localhost:9011

### Step 3: Start Frontend Service

```bash
# Enter frontend directory
cd frontend

# Install dependencies and start
npm install
npm run dev
```

**Access Address:** http://localhost:5173

### Step 4: Backend Deployment

**Option 1: PyPI Installation (Recommended)**
```bash
pip install mcp-agent-graph
>>> mag.start()
```

**Option 2: Source Code Deployment**
```bash
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph

# Using uv (Recommended)
uv sync
cd mag
uv run python main.py

# Or using pip
pip install -r requirements.txt
cd mag
python main.py
```

**Service Addresses:**
- Backend API: http://localhost:9999
- MCP Client: http://localhost:8765

## ✨ Core Features

#### 1️⃣ System-Level Agent
System-level Agent helps users customize Agent Workflow/Agent Graph and MCP tools

#### 2️⃣ Visual Graph Editor
Frontend creation of intelligent agent workflows, what you see is what you get

#### 3️⃣ Graph Nesting
Agent reusability, any graph can be used as a node in other graphs, building hierarchical intelligent systems

#### 4️⃣ Task Scheduling System
Support for timed and periodic execution of Agents, batch concurrent processing

#### 5️⃣ Graph to MCP Service
One-click export of agents as standard MCP services, callable by Claude, Cline, etc.

#### 6️⃣ Agent Trading and Transfer
Complete agent packaging, sharing, and deployment solution

#### 7️⃣ Python SDK Deep Integration
`pip install mcp-agent-graph` to build Agents using Python

#### 8️⃣ Prompt Registration Management
One-stop prompt management, register and reuse prompt templates

## 🖼️ Frontend Feature Showcase

### deepresearch (Agent Generated)
#### Deep analysis of user questions, multi-round intelligent retrieval, and comprehensive research system that generates visualized HTML web pages
![alt text](appendix/deepresearch.png)

---
### corporate_ethics_dilemma_v2 (Agent Generated)
#### AI CFO Alex faces complex corporate ethical choices, exploring AI decision-making mechanisms in conflicts of interest
![alt text](appendix/corporate_ethics_dilemma_v2.png)

---

## 📖 Citation

If you find MCP Agent Graph helpful for your research or work, please consider citing it:

```bibtex
@misc{mcp_agent_graph_2025,
  title        = {mcp-agent-graph},
  author       = {Yan Yixin},
  howpublished = {\url{https://github.com/keta1930/mcp-agent-graph}},
  note         = {Accessed: 2025-04-24},
  year         = {2025}
}
```

## WeChat Group
![alt text](./assets/wechat.png)

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=keta1930/mcp-agent-graph&type=Date)](https://www.star-history.com/#keta1930/mcp-agent-graph&Date)