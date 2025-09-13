# 聊天系统API

<cite>
**本文档引用的文件**   
- [chat_routes.py](file://mag/app/api/chat_routes.py)
- [chat_schema.py](file://mag/app/models/chat_schema.py)
- [sse_helper.py](file://mag/app/utils/sse_helper.py)
- [conversationService.ts](file://frontend/src/services/conversationService.ts)
- [useSSEConnection.ts](file://frontend/src/hooks/useSSEConnection.ts)
- [MessageDisplay.tsx](file://frontend/src/components/chat/MessageDisplay.tsx)
</cite>

## 目录
1. [简介](#简介)
2. [核心API端点](#核心api端点)
3. [SSE通信机制](#sse通信机制)
4. [请求/响应JSON Schema](#请求响应json-schema)
5. [聊天上下文与会话管理](#聊天上下文与会话管理)
6. [前端组件与消息流](#前端组件与消息流)
7. [客户端实现示例](#客户端实现示例)

## 简介
本API文档详细说明了聊天系统的核心功能，包括消息发送、对话管理、历史记录获取以及基于SSE的流式响应。系统支持多种交互模式，包括基础聊天（Chat）、智能代理（Agent）和图执行（Graph）。API设计遵循RESTful原则，并通过Server-Sent Events (SSE) 实现低延迟的实时消息流。

## 核心API端点

### 发送消息 (/chat/completions)
此端点用于发送用户消息并接收AI的响应。支持流式和非流式两种响应模式。

**请求方法**: `POST`  
**请求路径**: `/chat/completions`

**请求参数**:
- `user_prompt`: 用户输入的消息内容 (必需)
- `system_prompt`: 系统提示词 (可选)
- `mcp_servers`: 选择的MCP服务器列表 (可选)
- `model_name`: 选择的模型名称 (必需)
- `conversation_id`: 对话ID，为`null`时表示创建临时对话 (可选)
- `user_id`: 用户ID (可选)
- `stream`: 是否使用流式响应 (默认为`true`)

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L41-L70)

### 新建对话
新建对话通过在发送消息时省略`conversation_id`来实现。系统会自动创建一个新的对话记录，并返回其ID。

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L41-L70)

### 获取对话历史 (/chat/conversations)
此端点用于获取用户的对话列表。

**请求方法**: `GET`  
**请求路径**: `/chat/conversations`

**请求参数**:
- `user_id`: 用户ID (可选)

**响应结构**:
- `conversations`: 对话项列表
- `total_count`: 总对话数量

**Section sources**
- [chat_routes.py](file://mag/app/api/chat_routes.py#L106-L140)

## SSE通信机制

### 连接建立
客户端通过设置`Accept: text/event-stream`头部来请求SSE连接。服务器会保持连接打开，并持续发送数据块，直到响应完成。

**请求头示例**:
```
Content-Type: application/json
Accept: text/event-stream
Cache-Control: no-cache
```

**Section sources**
- [conversationService.ts](file://frontend/src/services/conversationService.ts#L82-L127)

### 消息格式
SSE消息遵循标准格式，每条消息以`data: `开头，后跟JSON数据。流的结束以`data: [DONE]`标记。

**有效事件类型**:
- **message**: 包含OpenAI标准格式的流式响应块。
- **error**: 当发生错误时发送，包含错误信息和类型。
- **end**: 流结束的标记，等同于`[DONE]`。

**Section sources**
- [sse_helper.py](file://mag/app/utils/sse_helper.py#L77-L115)

### 断线重连策略
客户端应实现基于`EventSource`或`fetch`的重连逻辑。建议使用指数退避算法来避免服务器过载。当前实现中，`useSSEConnection`钩子负责管理连接的生命周期，包括自动重连。

**Section sources**
- [useSSEConnection.ts](file://frontend/src/hooks/useSSEConnection.ts#L450-L495)

## 请求/响应JSON Schema

### 消息体字段定义
消息体遵循OpenAI兼容的格式。

**核心字段**:
- **role**: 消息角色，可以是`user`、`assistant`、`tool`或`system`。
- **content**: 消息的文本内容。
- **tool_calls**: 工具调用列表，包含`id`、`type`和`function`（包含`name`和`arguments`）。
- **tool_call_id**: 工具调用ID，用于`tool`角色的消息。

**Section sources**
- [chat_schema.py](file://mag/app/models/chat_schema.py#L30-L41)

### 请求/响应Schema
完整的请求和响应结构在`chat_schema.py`中定义。

**主要模型**:
- `ChatCompletionRequest`: 发送消息的请求体。
- `ConversationListItem`: 对话列表项。
- `ConversationDetailResponse`: 对话详情响应。

**Section sources**
- [chat_schema.py](file://mag/app/models/chat_schema.py#L1-L174)

## 聊天上下文管理机制

### 上下文管理
聊天上下文由后端服务（`chat_service`）管理。每次请求时，服务会根据`conversation_id`从数据库中检索历史消息，并将其与当前请求结合，形成完整的上下文。

### 会话状态持久化
会话状态通过MongoDB进行持久化存储。`conversation_manager`负责管理对话的CRUD操作，包括创建、读取、更新和删除。每个对话记录包含标题、创建时间、更新时间、消息轮次和token使用量等元数据。

**Section sources**
- [conversation_manager.py](file://mag/app/services/docdb/conversation_manager.py#L277-L309)

## 前端组件与消息流

### MessageDisplay组件
`MessageDisplay`组件负责渲染对话历史。它根据消息的`role`和`type`来决定渲染方式。对于`assistant`消息，它会解析`tool_calls`并以可折叠的卡片形式展示工具调用及其结果。

### InputArea组件
`InputArea`组件处理用户输入。当用户提交消息时，它会调用`useSSEConnection`钩子来启动SSE连接。

### 消息发送与渲染流程
1. 用户在`InputArea`中输入消息并提交。
2. `InputArea`调用`useSSEConnection.startConnection`。
3. `useSSEConnection`创建SSE连接并开始接收数据流。
4. 接收到的数据通过`processSSEData`函数处理，并更新`enhancedStreamingState`。
5. `MessageDisplay`组件监听`enhancedStreamingState`的变化，并实时渲染流式消息。

**Section sources**
- [MessageDisplay.tsx](file://frontend/src/components/chat/MessageDisplay.tsx#L0-L799)
- [useSSEConnection.ts](file://frontend/src/hooks/useSSEConnection.ts#L0-L522)

## 客户端实现示例

### 使用curl流式接收
```bash
curl -X POST https://your-api.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "user_prompt": "你好",
    "model_name": "gpt-4",
    "stream": true
  }' | while read line; do
    if [[ $line == "data: [DONE]" ]]; then
      echo "流结束"
      break
    elif [[ $line == data:\ * ]]; then
      echo "收到数据: ${line#data: }"
    fi
  done
```

### 使用Python客户端实现流式接收
```python
import requests
import json

def stream_response():
    url = "https://your-api.com/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    data = {
        "user_prompt": "你好",
        "model_name": "gpt-4",
        "stream": True
    }

    response = requests.post(url, headers=headers, json=data, stream=True)
    
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            if decoded_line == "data: [DONE]":
                print("流结束")
                break
            elif decoded_line.startswith("data: "):
                json_data = json.loads(decoded_line[6:])
                print("收到数据:", json_data)

stream_response()
```

**Section sources**
- [conversationService.ts](file://frontend/src/services/conversationService.ts#L82-L127)