# API参考

<cite>
**本文档中引用的文件**  
- [chat_routes.py](file://mag/app/api/chat_routes.py)
- [graph_routes.py](file://mag/app/api/graph_routes.py)
- [graph_gen_routes.py](file://mag/app/api/graph_gen_routes.py)
- [mcp_routes.py](file://mag/app/api/mcp_routes.py)
- [model_routes.py](file://mag/app/api/model_routes.py)
- [system_routes.py](file://mag/app/api/system_routes.py)
- [chat_schema.py](file://mag/app/models/chat_schema.py)
- [graph_schema.py](file://mag/app/models/graph_schema.py)
- [mcp_schema.py](file://mag/app/models/mcp_schema.py)
</cite>

## 目录
1. [聊天API](#聊天api)
2. [图管理API](#图管理api)
3. [图生成API](#图生成api)
4. [MCP管理API](#mcp管理api)
5. [模型管理API](#模型管理api)
6. [系统控制API](#系统控制api)

## 聊天API

本组API提供对话管理、消息交互和内容压缩功能，支持流式和非流式响应。

### 发送聊天消息
[POST] `/chat/completions`

发起一次聊天请求，支持流式和非流式响应。

**请求头**
```
Content-Type: application/json
```

**请求体 (JSON Schema)**
```json
{
  "user_prompt": "用户输入内容",
  "system_prompt": "系统提示词（可选）",
  "mcp_servers": ["server1", "server2"],
  "model_name": "模型名称",
  "conversation_id": "对话ID（可选）",
  "user_id": "用户ID",
  "stream": true
}
```

**成功响应 (200)**
- 流式：`text/event-stream` 格式的SSE流
- 非流式：完整JSON响应，包含模型回复和token使用量

**错误响应**
- `400 Bad Request`：参数缺失或无效
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：服务器处理错误

**curl示例**
```bash
curl -X POST http://localhost:8000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "user_prompt": "你好",
    "model_name": "gpt-4",
    "stream": true
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/chat/completions",
    json={
        "user_prompt": "你好",
        "model_name": "gpt-4",
        "stream": True
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L15-L100)
- [chat_schema.py](file://mag/app/models/chat_schema.py#L5-L25)

### 获取对话列表
[GET] `/chat/conversations`

获取用户的所有对话列表。

**查询参数**
- `user_id` (string): 用户ID，默认为"default_user"

**成功响应 (200)**
```json
{
  "conversations": [
    {
      "conversation_id": "conv_123",
      "title": "新对话",
      "created_at": "2023-01-01T00:00:00",
      "round_count": 5,
      "total_token_usage": {
        "total_tokens": 1000,
        "prompt_tokens": 600,
        "completion_tokens": 400
      }
    }
  ],
  "total_count": 1
}
```

**错误响应**
- `500 Internal Server Error`：数据库查询错误

**curl示例**
```bash
curl "http://localhost:8000/chat/conversations?user_id=default_user"
```

**Python客户端示例**
```python
import requests

response = requests.get(
    "http://localhost:8000/chat/conversations",
    params={"user_id": "default_user"}
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L105-L150)
- [chat_schema.py](file://mag/app/models/chat_schema.py#L27-L65)

### 获取对话详情
[GET] `/chat/conversations/{conversation_id}`

获取指定对话的完整内容。

**路径参数**
- `conversation_id` (string): 对话ID

**成功响应 (200)**
```json
{
  "conversation_id": "conv_123",
  "title": "新对话",
  "rounds": [
    {
      "round": 1,
      "messages": [
        {
          "role": "user",
          "content": "你好"
        }
      ]
    }
  ]
}
```

**错误响应**
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：服务器错误

**curl示例**
```bash
curl "http://localhost:8000/chat/conversations/conv_123"
```

**Python客户端示例**
```python
import requests

response = requests.get(
    "http://localhost:8000/chat/conversations/conv_123"
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L155-L200)
- [chat_schema.py](file://mag/app/models/chat_schema.py#L67-L95)

### 更新对话状态
[PUT] `/chat/conversations/{conversation_id}/status`

更新对话的状态（活跃、删除、收藏）。

**路径参数**
- `conversation_id` (string): 对话ID

**请求体**
```json
{
  "status": "active",
  "user_id": "default_user"
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "对话状态更新成功",
  "conversation_id": "conv_123",
  "new_status": "active"
}
```

**错误响应**
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：更新失败

**curl示例**
```bash
curl -X PUT http://localhost:8000/chat/conversations/conv_123/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "deleted",
    "user_id": "default_user"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.put(
    "http://localhost:8000/chat/conversations/conv_123/status",
    json={"status": "deleted", "user_id": "default_user"}
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L205-L250)
- [chat_schema.py](file://mag/app/models/chat_schema.py#L155-L170)

### 永久删除对话
[DELETE] `/chat/conversations/{conversation_id}/permanent`

永久删除指定对话。

**路径参数**
- `conversation_id` (string): 对话ID

**查询参数**
- `user_id` (string): 用户ID

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "对话 'conv_123' 已永久删除",
  "conversation_id": "conv_123"
}
```

**错误响应**
- `403 Forbidden`：无权限删除
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：删除失败

**curl示例**
```bash
curl -X DELETE "http://localhost:8000/chat/conversations/conv_123/permanent?user_id=default_user"
```

**Python客户端示例**
```python
import requests

response = requests.delete(
    "http://localhost:8000/chat/conversations/conv_123/permanent",
    params={"user_id": "default_user"}
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L255-L300)

### 更新对话标题
[PUT] `/chat/conversations/{conversation_id}/title`

更新对话标题。

**路径参数**
- `conversation_id` (string): 对话ID

**请求体**
```json
{
  "title": "新标题",
  "user_id": "default_user"
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "对话标题更新成功",
  "conversation_id": "conv_123",
  "title": "新标题"
}
```

**错误响应**
- `400 Bad Request`：标题为空
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：更新失败

**curl示例**
```bash
curl -X PUT http://localhost:8000/chat/conversations/conv_123/title \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的新对话",
    "user_id": "default_user"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.put(
    "http://localhost:8000/chat/conversations/conv_123/title",
    json={"title": "我的新对话", "user_id": "default_user"}
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L305-L350)

### 更新对话标签
[PUT] `/chat/conversations/{conversation_id}/tags`

更新对话标签。

**路径参数**
- `conversation_id` (string): 对话ID

**请求体**
```json
{
  "tags": ["标签1", "标签2"],
  "user_id": "default_user"
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "对话标签更新成功",
  "conversation_id": "conv_123",
  "tags": ["标签1", "标签2"]
}
```

**错误响应**
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：更新失败

**curl示例**
```bash
curl -X PUT http://localhost:8000/chat/conversations/conv_123/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["工作", "重要"],
    "user_id": "default_user"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.put(
    "http://localhost:8000/chat/conversations/conv_123/tags",
    json={"tags": ["工作", "重要"], "user_id": "default_user"}
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L355-L400)

### 压缩对话内容
[POST] `/chat/conversations/{conversation_id}/compact`

压缩对话内容以节省存储空间。

**路径参数**
- `conversation_id` (string): 对话ID

**请求体**
```json
{
  "conversation_id": "conv_123",
  "model_name": "gpt-4",
  "compact_type": "precise",
  "compact_threshold": 2000,
  "user_id": "default_user"
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "对话压缩成功",
  "conversation_id": "conv_123",
  "compact_type": "precise",
  "statistics": {
    "original_tokens": 5000,
    "compressed_tokens": 2000,
    "reduction_rate": "60%"
  }
}
```

**错误响应**
- `400 Bad Request`：参数无效
- `404 Not Found`：对话不存在
- `500 Internal Server Error`：压缩失败

**curl示例**
```bash
curl -X POST http://localhost:8000/chat/conversations/conv_123/compact \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv_123",
    "model_name": "gpt-4",
    "compact_type": "precise",
    "user_id": "default_user"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/chat/conversations/conv_123/compact",
    json={
        "conversation_id": "conv_123",
        "model_name": "gpt-4",
        "compact_type": "precise",
        "user_id": "default_user"
    }
)
print(response.json())
```

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L405-L450)
- [chat_schema.py](file://mag/app/models/chat_schema.py#L105-L130)

## 图管理API

本组API提供图的创建、读取、更新、删除和执行功能。

### 获取所有图
[GET] `/graphs`

获取系统中所有可用的图。

**成功响应 (200)**
```json
["graph1", "graph2", "graph3"]
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/graphs"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/graphs")
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L15-L30)

### 获取图配置
[GET] `/graphs/{graph_name}`

获取指定图的详细配置。

**路径参数**
- `graph_name` (string): 图名称

**成功响应 (200)**
```json
{
  "name": "my_graph",
  "nodes": [
    {
      "name": "node1",
      "model_name": "gpt-4",
      "system_prompt": "你是一个助手"
    }
  ]
}
```

**错误响应**
- `404 Not Found`：图不存在
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/graphs/my_graph"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/graphs/my_graph")
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L35-L60)
- [graph_schema.py](file://mag/app/models/graph_schema.py#L55-L80)

### 获取图README
[GET] `/graphs/{graph_name}/readme`

获取图的README文件内容。

**路径参数**
- `graph_name` (string): 图名称

**成功响应 (200)**
```json
{
  "name": "my_graph",
  "config": { /* 图配置 */ },
  "readme": "# 图说明\n这是我的图..."
}
```

**错误响应**
- `404 Not Found`：图不存在
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/graphs/my_graph/readme"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/graphs/my_graph/readme")
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L65-L100)

### 创建或更新图
[POST] `/graphs`

创建新图或更新现有图。

**请求体**
```json
{
  "name": "my_graph",
  "description": "我的图",
  "nodes": [
    {
      "name": "node1",
      "model_name": "gpt-4",
      "system_prompt": "你是一个助手"
    }
  ]
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "图 'my_graph' 保存成功"
}
```

**错误响应**
- `400 Bad Request`：配置无效
- `500 Internal Server Error`：保存失败

**curl示例**
```bash
curl -X POST http://localhost:8000/graphs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_graph",
    "nodes": [
      {
        "name": "node1",
        "model_name": "gpt-4"
      }
    ]
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/graphs",
    json={
        "name": "my_graph",
        "nodes": [{"name": "node1", "model_name": "gpt-4"}]
    }
)
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L105-L170)
- [graph_schema.py](file://mag/app/models/graph_schema.py#L55-L80)

### 删除图
[DELETE] `/graphs/{graph_name}`

删除指定图。

**路径参数**
- `graph_name` (string): 图名称

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "图 'my_graph' 删除成功"
}
```

**错误响应**
- `404 Not Found`：图不存在
- `500 Internal Server Error`：删除失败

**curl示例**
```bash
curl -X DELETE "http://localhost:8000/graphs/my_graph"
```

**Python客户端示例**
```python
import requests

response = requests.delete("http://localhost:8000/graphs/my_graph")
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L175-L200)

### 重命名图
[PUT] `/graphs/{old_name}/rename/{new_name}`

重命名图。

**路径参数**
- `old_name` (string): 原名称
- `new_name` (string): 新名称

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "图 'old_name' 重命名为 'new_name' 成功"
}
```

**错误响应**
- `400 Bad Request`：新名称已存在
- `404 Not Found`：原图不存在
- `500 Internal Server Error`：重命名失败

**curl示例**
```bash
curl -X PUT "http://localhost:8000/graphs/old_name/rename/new_name"
```

**Python客户端示例**
```python
import requests

response = requests.put(
    "http://localhost:8000/graphs/old_name/rename/new_name"
)
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L205-L240)

### 生成MCP脚本
[GET] `/graphs/{graph_name}/generate_mcp`

为指定图生成MCP服务器脚本。

**路径参数**
- `graph_name` (string): 图名称

**成功响应 (200)**
```json
{
  "graph_name": "my_graph",
  "script": "import mcp...\ndef main():..."
}
```

**错误响应**
- `404 Not Found`：图不存在
- `500 Internal Server Error`：生成失败

**curl示例**
```bash
curl "http://localhost:8000/graphs/my_graph/generate_mcp"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/graphs/my_graph/generate_mcp")
print(response.json())
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L245-L270)

### 执行图
[POST] `/graphs/execute`

执行指定图并返回流式结果。

**请求体**
```json
{
  "graph_name": "my_graph",
  "input_text": "输入内容",
  "conversation_id": "conv_123"
}
```

**成功响应 (200)**
- `text/event-stream` 格式的SSE流

**错误响应**
- `404 Not Found`：图不存在
- `500 Internal Server Error`：执行失败

**curl示例**
```bash
curl -X POST http://localhost:8000/graphs/execute \
  -H "Content-Type: application/json" \
  -d '{
    "graph_name": "my_graph",
    "input_text": "测试输入"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/graphs/execute",
    json={"graph_name": "my_graph", "input_text": "测试输入"},
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L275-L340)
- [graph_schema.py](file://mag/app/models/graph_schema.py#L82-L95)

## 图生成API

本组API提供基于AI的图生成和优化功能。

### 获取提示词模板
[GET] `/prompt-template`

获取用于图生成的提示词模板。

**成功响应 (200)**
```json
{
  "prompt": "你是一个AI助手...\n{TOOLS_DESCRIPTION}\n{MODELS_DESCRIPTION}"
}
```

**错误响应**
- `404 Not Found`：模板文件不存在
- `500 Internal Server Error`：生成失败

**curl示例**
```bash
curl "http://localhost:8000/prompt-template"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/prompt-template")
print(response.json())
```

**Section sources**
- [graph_gen_routes.py](file://mag/app/api/graph_gen_routes.py#L15-L100)

### 获取优化提示词模板
[GET] `/optimize-prompt-template`

获取用于优化图的提示词模板。

**查询参数**
- `graph_name` (string, 可选): 图名称

**成功响应 (200)**
```json
{
  "prompt": "优化图模板...\n{TOOLS_DESCRIPTION}\n{MODELS_DESCRIPTION}\n{GRAPH_CONFIG}",
  "has_graph_config": "True"
}
```

**错误响应**
- `404 Not Found`：图或模板不存在
- `500 Internal Server Error`：生成失败

**curl示例**
```bash
curl "http://localhost:8000/optimize-prompt-template?graph_name=my_graph"
```

**Python客户端示例**
```python
import requests

response = requests.get(
    "http://localhost:8000/optimize-prompt-template",
    params={"graph_name": "my_graph"}
)
print(response.json())
```

**Section sources**
- [graph_gen_routes.py](file://mag/app/api/graph_gen_routes.py#L105-L200)

### AI生成图
[POST] `/graphs/generate`

使用AI生成图配置。

**请求体**
```json
{
  "requirement": "用户需求描述",
  "model_name": "gpt-4",
  "conversation_id": "conv_123"
}
```

**成功响应 (200)**
- `text/event-stream` 格式的SSE流

**错误响应**
- `400 Bad Request`：需求或模型名称为空
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：生成失败

**curl示例**
```bash
curl -X POST http://localhost:8000/graphs/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirement": "创建一个数据分析流程",
    "model_name": "gpt-4"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/graphs/generate",
    json={
        "requirement": "创建一个数据分析流程",
        "model_name": "gpt-4"
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

**Section sources**
- [graph_gen_routes.py](file://mag/app/api/graph_gen_routes.py#L205-L300)
- [graph_schema.py](file://mag/app/models/graph_schema.py#L97-L110)

## MCP管理API

本组API提供MCP服务器和工具的管理功能。

### 获取MCP配置
[GET] `/mcp/config`

获取当前MCP配置。

**成功响应 (200)**
```json
{
  "mcpServers": {
    "server1": {
      "command": "python server.py",
      "transportType": "stdio"
    }
  }
}
```

**curl示例**
```bash
curl "http://localhost:8000/mcp/config"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/mcp/config")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L15-L25)

### 更新MCP配置
[POST] `/mcp/config`

更新MCP配置并重新连接服务器。

**请求体**
```json
{
  "mcpServers": {
    "new_server": {
      "command": "python new_server.py",
      "transportType": "stdio"
    }
  }
}
```

**成功响应 (200)**
```json
{
  "new_server": {
    "connected": true,
    "tools": ["tool1", "tool2"]
  }
}
```

**错误响应**
- `500 Internal Server Error`：更新失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/config \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServers": {
      "new_server": {
        "command": "python new_server.py",
        "transportType": "stdio"
      }
    }
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/config",
    json={
        "mcpServers": {
            "new_server": {
                "command": "python new_server.py",
                "transportType": "stdio"
            }
        }
    }
)
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L30-L60)

### 获取MCP状态
[GET] `/mcp/status`

获取所有MCP服务器的状态。

**成功响应 (200)**
```json
{
  "server1": {
    "connected": true,
    "tools": ["tool1", "tool2"]
  }
}
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/mcp/status"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/mcp/status")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L65-L80)

### 添加MCP服务器
[POST] `/mcp/add`

添加新的MCP服务器。

**请求体**
```json
{
  "mcpServers": {
    "new_server": {
      "command": "python server.py",
      "transportType": "stdio"
    }
  }
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "成功添加 1 个服务器",
  "added_servers": ["new_server"]
}
```

**错误响应**
- `400 Bad Request`：配置格式错误
- `500 Internal Server Error`：添加失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/add \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServers": {
      "new_server": {
        "command": "python server.py",
        "transportType": "stdio"
      }
    }
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/add",
    json={
        "mcpServers": {
            "new_server": {
                "command": "python server.py",
                "transportType": "stdio"
            }
        }
    }
)
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L85-L170)

### 删除MCP服务器
[POST] `/mcp/remove`

批量删除MCP服务器。

**请求体**
```json
["server1", "server2"]
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "成功删除 2 个服务器",
  "removed_servers": ["server1", "server2"]
}
```

**错误响应**
- `500 Internal Server Error`：删除失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/remove \
  -H "Content-Type: application/json" \
  -d '["server1", "server2"]'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/remove",
    json=["server1", "server2"]
)
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L175-L300)

### 连接MCP服务器
[POST] `/mcp/connect/{server_name}`

连接指定的MCP服务器。

**路径参数**
- `server_name` (string): 服务器名称，"all"表示连接所有

**成功响应 (200)**
```json
{
  "status": "success",
  "server": "server1",
  "message": "连接成功"
}
```

**错误响应**
- `400 Bad Request`：连接失败
- `500 Internal Server Error`：处理错误

**curl示例**
```bash
curl -X POST "http://localhost:8000/mcp/connect/server1"
```

**Python客户端示例**
```python
import requests

response = requests.post("http://localhost:8000/mcp/connect/server1")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L305-L340)

### 断开MCP服务器连接
[POST] `/mcp/disconnect/{server_name}`

断开指定的MCP服务器连接。

**路径参数**
- `server_name` (string): 服务器名称

**成功响应 (200)**
```json
{
  "status": "success",
  "server": "server1",
  "message": "断开连接成功"
}
```

**错误响应**
- `404 Not Found`：服务器不存在
- `400 Bad Request`：断开失败
- `500 Internal Server Error`：处理错误

**curl示例**
```bash
curl -X POST "http://localhost:8000/mcp/disconnect/server1"
```

**Python客户端示例**
```python
import requests

response = requests.post("http://localhost:8000/mcp/disconnect/server1")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L345-L380)

### 获取MCP工具信息
[GET] `/mcp/tools`

获取所有MCP工具的详细信息。

**成功响应 (200)**
```json
{
  "server1": [
    {
      "name": "tool1",
      "description": "工具描述"
    }
  ]
}
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/mcp/tools"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/mcp/tools")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L385-L400)

### 获取MCP生成器模板
[GET] `/mcp/ai-generator-template`

获取AI生成MCP的提示词模板。

**成功响应 (200)**
```json
{
  "template": "你是一个MCP生成助手...",
  "note": "将模板中的需求描述替换为您的具体需求后使用"
}
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/mcp/ai-generator-template"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/mcp/ai-generator-template")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L405-L425)

### AI生成MCP工具
[POST] `/mcp/generate`

使用AI生成MCP工具。

**请求体**
```json
{
  "requirement": "用户需求描述",
  "model_name": "gpt-4",
  "conversation_id": "conv_123"
}
```

**成功响应 (200)**
- `text/event-stream` 格式的SSE流

**错误响应**
- `400 Bad Request`：需求或模型名称为空
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：生成失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirement": "创建一个天气查询工具",
    "model_name": "gpt-4"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/generate",
    json={
        "requirement": "创建一个天气查询工具",
        "model_name": "gpt-4"
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L430-L500)
- [mcp_schema.py](file://mag/app/models/mcp_schema.py#L55-L65)

### 注册MCP工具
[POST] `/mcp/register-tool`

注册AI生成的MCP工具到系统。

**请求体**
```json
{
  "folder_name": "weather_tool",
  "script_files": {
    "main.py": "def main():...",
    "tool.py": "def weather_query():..."
  },
  "readme": "工具说明文档",
  "dependencies": "requests==2.28.0"
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "MCP工具 'weather_tool' 注册成功"
}
```

**错误响应**
- `409 Conflict`：工具已存在
- `500 Internal Server Error`：注册失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/register-tool \
  -H "Content-Type: application/json" \
  -d '{
    "folder_name": "weather_tool",
    "script_files": {
      "main.py": "def main():..."
    },
    "readme": "天气查询工具",
    "dependencies": "requests==2.28.0"
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/register-tool",
    json={
        "folder_name": "weather_tool",
        "script_files": {"main.py": "def main():"},
        "readme": "天气查询工具",
        "dependencies": "requests==2.28.0"
    }
)
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L505-L550)

### 列出AI生成的MCP工具
[GET] `/mcp/ai-tools`

列出所有AI生成的MCP工具。

**成功响应 (200)**
```json
["weather_tool", "news_tool"]
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/mcp/ai-tools"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/mcp/ai-tools")
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L555-L575)

### 测试MCP工具调用
[POST] `/mcp/test-tool`

测试MCP工具的调用。

**请求体**
```json
{
  "server_name": "weather_server",
  "tool_name": "get_weather",
  "params": {
    "location": "Beijing"
  }
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "result": "晴天，25°C",
  "execution_time": 0.5
}
```

**错误响应**
- `500 Internal Server Error`：调用失败

**curl示例**
```bash
curl -X POST http://localhost:8000/mcp/test-tool \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "weather_server",
    "tool_name": "get_weather",
    "params": {
      "location": "Beijing"
    }
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/mcp/test-tool",
    json={
        "server_name": "weather_server",
        "tool_name": "get_weather",
        "params": {"location": "Beijing"}
    }
)
print(response.json())
```

**Section sources**
- [mcp_routes.py](file://mag/app/api/mcp_routes.py#L385-L400)
- [mcp_schema.py](file://mag/app/models/mcp_schema.py#L67-L85)

## 模型管理API

本组API提供模型的增删改查功能。

### 获取所有模型
[GET] `/models`

获取系统中所有模型的配置。

**成功响应 (200)**
```json
[
  {
    "name": "gpt-4",
    "base_url": "https://api.openai.com",
    "api_key": "***"
  }
]
```

**错误响应**
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/models"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/models")
print(response.json())
```

**Section sources**
- [model_routes.py](file://mag/app/api/model_routes.py#L15-L30)

### 获取模型配置（用于编辑）
[GET] `/models/{model_name}`

获取指定模型的完整配置。

**路径参数**
- `model_name` (string): 模型名称

**成功响应 (200)**
```json
{
  "status": "success",
  "data": {
    "name": "gpt-4",
    "base_url": "https://api.openai.com",
    "api_key": "sk-..."
  }
}
```

**错误响应**
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：获取失败

**curl示例**
```bash
curl "http://localhost:8000/models/gpt-4"
```

**Python客户端示例**
```python
import requests

response = requests.get("http://localhost:8000/models/gpt-4")
print(response.json())
```

**Section sources**
- [model_routes.py](file://mag/app/api/model_routes.py#L35-L60)

### 添加模型
[POST] `/models`

添加新的模型配置。

**请求体**
```json
{
  "name": "claude-3",
  "base_url": "https://api.anthropic.com",
  "api_key": "sk-..."
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "模型 'claude-3' 添加成功"
}
```

**错误响应**
- `400 Bad Request`：模型已存在
- `500 Internal Server Error`：添加失败

**curl示例**
```bash
curl -X POST http://localhost:8000/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude-3",
    "base_url": "https://api.anthropic.com",
    "api_key": "sk-..."
  }'
```

**Python客户端示例**
```python
import requests

response = requests.post(
    "http://localhost:8000/models",
    json={
        "name": "claude-3",
        "base_url": "https://api.anthropic.com",
        "api_key": "sk-..."
    }
)
print(response.json())
```

**Section sources**
- [model_routes.py](file://mag/app/api/model_routes.py#L65-L90)
- [model_schema.py](file://mag/app/models/model_schema.py)

### 更新模型
[PUT] `/models/{model_name}`

更新现有模型的配置。

**路径参数**
- `model_name` (string): 模型名称

**请求体**
```json
{
  "name": "gpt-4-updated",
  "base_url": "https://api.openai.com/v2",
  "api_key": "sk-..."
}
```

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "模型 'gpt-4' 更新成功"
}
```

**错误响应**
- `400 Bad Request`：新名称已存在
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：更新失败

**curl示例**
```bash
curl -X PUT http://localhost:8000/models/gpt-4 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt-4-updated",
    "base_url": "https://api.openai.com/v2",
    "api_key": "sk-..."
  }'
```

**Python客户端示例**
```python
import requests

response = requests.put(
    "http://localhost:8000/models/gpt-4",
    json={
        "name": "gpt-4-updated",
        "base_url": "https://api.openai.com/v2",
        "api_key": "sk-..."
    }
)
print(response.json())
```

**Section sources**
- [model_routes.py](file://mag/app/api/model_routes.py#L95-L130)
- [model_schema.py](file://mag/app/models/model_schema.py)

### 删除模型
[DELETE] `/models/{model_name}`

删除指定模型。

**路径参数**
- `model_name` (string): 模型名称

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "模型 'gpt-4' 删除成功"
}
```

**错误响应**
- `404 Not Found`：模型不存在
- `500 Internal Server Error`：删除失败

**curl示例**
```bash
curl -X DELETE "http://localhost:8000/models/gpt-4"
```

**Python客户端示例**
```python
import requests

response = requests.delete("http://localhost:8000/models/gpt-4")
print(response.json())
```

**Section sources**
- [model_routes.py](file://mag/app/api/model_routes.py#L135-L150)

## 系统控制API

本组API提供系统级别的控制功能。

### 关闭服务
[POST] `/system/shutdown`

优雅关闭MAG服务。

**成功响应 (200)**
```json
{
  "status": "success",
  "message": "服务关闭过程已启动",
  "active_sessions": 2
}
```

**错误响应**
- `500 Internal Server Error`：关闭失败

**curl示例**
```bash
curl -X POST "http://localhost:8000/system/shutdown"
```

**Python客户端示例**
```python
import requests

response = requests.post("http://localhost:8000/system/shutdown")
print(response.json())
```

**Section sources**
- [system_routes.py](file://mag/app/api/system_routes.py#L15-L60)