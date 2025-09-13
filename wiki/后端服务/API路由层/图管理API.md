# 图管理API

<cite>
**本文档中引用的文件**  
- [graph_routes.py](file://mag/app/api/graph_routes.py)
- [graph_schema.py](file://mag/app/models/graph_schema.py)
- [graph_service.py](file://mag/app/services/graph_service.py)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖分析](#依赖分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介
本文档详细描述了图管理API，涵盖图的创建、读取、更新、删除（CRUD）操作，图执行控制，状态获取，以及与前端组件的交互流程。重点说明了API端点的设计、请求/响应结构、错误处理机制、异步执行流和SSE事件集成方式。

## 项目结构
图管理功能分布在后端Python FastAPI服务和前端React应用中。后端API路由定义在`graph_routes.py`中，核心业务逻辑由`graph_service.py`协调，图结构处理由`graph_processor.py`实现，执行逻辑在`graph_executor.py`中。模型定义位于`graph_schema.py`。前端通过`graphService.ts`调用这些API，并在`GraphEditor.tsx`中提供可视化编辑界面。

```mermaid
graph TD
subgraph "前端"
GraphEditor[GraphEditor.tsx]
graphService[graphService.ts]
end
subgraph "后端"
graph_routes[graph_routes.py]
graph_service[graph_service.py]
graph_processor[graph_processor.py]
graph_executor[graph_executor.py]
graph_schema[graph_schema.py]
end
GraphEditor --> graphService
graphService --> graph_routes
graph_routes --> graph_service
graph_service --> graph_processor
graph_service --> graph_executor
graph_processor --> graph_service
graph_executor --> graph_service
```

**Diagram sources**  
- [graph_routes.py](file://mag/app/api/graph_routes.py#L1-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L1-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)

## 核心组件
图管理API的核心组件包括图配置模型（GraphConfig）、图服务（GraphService）、图处理器（GraphProcessor）和图执行器（GraphExecutor）。这些组件协同工作，实现图的持久化、验证、预处理和流式执行。

**Section sources**
- [graph_schema.py](file://mag/app/models/graph_schema.py#L1-L116)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

## 架构概览
图管理API采用分层架构，前端通过HTTP请求与后端FastAPI路由交互。路由层调用图服务进行业务处理，图服务协调图处理器进行图结构分析和预处理，以及图执行器进行实际执行。执行结果通过SSE流式返回给前端。

```mermaid
graph TB
subgraph "前端"
FE[GraphEditor]
end
subgraph "API层"
API[graph_routes.py]
end
subgraph "服务层"
GS[graph_service.py]
end
subgraph "处理层"
GP[graph_processor.py]
GE[graph_executor.py]
end
FE --> API
API --> GS
GS --> GP
GS --> GE
GP --> GS
GE --> GS
```

**Diagram sources**  
- [graph_routes.py](file://mag/app/api/graph_routes.py#L1-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

## 详细组件分析

### 图配置模型分析
`GraphConfig`模型定义了图的结构，包含图名称、描述和节点列表。每个节点（AgentNode）包含模型、MCP服务器、提示词、输入/输出连接等配置。

```mermaid
classDiagram
class GraphConfig {
+str name
+str description
+List[AgentNode] nodes
+Optional[str] end_template
}
class AgentNode {
+str name
+Optional[str] description
+Optional[str] model_name
+List[str] mcp_servers
+str system_prompt
+str user_prompt
+List[str] input_nodes
+List[str] output_nodes
+Optional[int] handoffs
+bool global_output
+List[str] context
+str context_mode
+bool output_enabled
+bool is_subgraph
+Optional[str] subgraph_name
+Optional[Dict[str, float]] position
+Optional[int] level
+Optional[str] save
}
GraphConfig "1" *-- "0..*" AgentNode : 包含
```

**Diagram sources**  
- [graph_schema.py](file://mag/app/models/graph_schema.py#L1-L116)

**Section sources**
- [graph_schema.py](file://mag/app/models/graph_schema.py#L1-L116)

### 图服务分析
`GraphService`是图管理的核心服务类，负责协调图的CRUD操作、执行和会话管理。它初始化`GraphProcessor`和`GraphExecutor`，并提供统一的接口。

```mermaid
classDiagram
class GraphService {
-GraphProcessor processor
-ConversationManager conversation_manager
-GraphExecutor executor
-AIGraphGenerator ai_generator
+list_graphs() List[str]
+get_graph(graph_name) Optional[Dict]
+save_graph(graph_name, config) bool
+delete_graph(graph_name) bool
+rename_graph(old_name, new_name) bool
+validate_graph(config) Tuple[bool, str]
+execute_graph_stream(graph_name, input_text) AsyncGenerator
+continue_conversation_stream(conversation_id, input_text) AsyncGenerator
+generate_mcp_script(graph_name, config, host_url) Dict[str, Any]
}
class GraphProcessor {
+_flatten_all_subgraphs(config) Dict
+_calculate_node_levels(config) Dict
+preprocess_graph(config, prefix) Dict
+detect_graph_cycles(graph_name, visited) Optional[List[str]]
+validate_graph(config, get_model, get_server_status) Tuple[bool, str]
}
class GraphExecutor {
+execute_graph_stream(graph_name, original_config, flattened_config, input_text, model_service) AsyncGenerator
+continue_conversation_stream(conversation_id, input_text, model_service, continue_from_checkpoint) AsyncGenerator
}
GraphService --> GraphProcessor : 使用
GraphService --> GraphExecutor : 使用
GraphService --> ConversationManager : 使用
GraphService --> AIGraphGenerator : 使用
```

**Diagram sources**  
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

**Section sources**
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)

### 图执行流程分析
图执行采用流式响应，通过SSE将执行过程中的状态和结果实时推送给前端。执行流程包括图验证、子图展开、层级计算和节点顺序执行。

```mermaid
sequenceDiagram
participant Frontend as 前端
participant API as graph_routes
participant GS as GraphService
participant GE as GraphExecutor
participant SSE as SSEHelper
Frontend->>API : POST /graphs/execute
API->>GS : execute_graph_stream()
GS->>GS : 验证图存在
GS->>GS : 检测循环引用
GS->>GS : 预处理图展开子图
GS->>GE : 执行图流
loop 每个节点
GE->>GE : 按层级顺序执行节点
GE->>SSE : 发送节点状态
GE->>SSE : 发送执行结果
end
GE->>SSE : 发送完成标记
API-->>Frontend : StreamingResponse
```

**Diagram sources**  
- [graph_routes.py](file://mag/app/api/graph_routes.py#L285-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L145-L185)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L285-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L145-L185)

### 图处理器分析
`GraphProcessor`负责图的结构处理，包括子图展开、层级计算、循环检测和配置验证。它确保图结构的正确性和可执行性。

```mermaid
flowchart TD
Start([开始]) --> ValidateInput["验证输入参数"]
ValidateInput --> HasSubgraph{"包含子图?"}
HasSubgraph --> |是| ExpandSubgraph["展开所有子图"]
HasSubgraph --> |否| SkipExpand
ExpandSubgraph --> CalculateLevel["计算节点层级"]
SkipExpand --> CalculateLevel
CalculateLevel --> DetectCycle["检测循环引用"]
DetectCycle --> IsValid{"有效?"}
IsValid --> |否| ReturnError["返回验证错误"]
IsValid --> |是| ReturnSuccess["返回处理后的图"]
ReturnError --> End([结束])
ReturnSuccess --> End
```

**Diagram sources**  
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)

**Section sources**
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)

## 依赖分析
图管理模块的依赖关系清晰，`graph_routes.py`依赖`graph_service.py`，而`graph_service.py`依赖`graph_processor.py`和`graph_executor.py`。`graph_processor.py`和`graph_executor.py`都依赖`graph_schema.py`中的数据模型。

```mermaid
graph TD
graph_routes --> graph_service
graph_service --> graph_processor
graph_service --> graph_executor
graph_processor --> graph_schema
graph_executor --> graph_schema
graph_service --> graph_schema
```

**Diagram sources**  
- [graph_routes.py](file://mag/app/api/graph_routes.py#L1-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)
- [graph_schema.py](file://mag/app/models/graph_schema.py#L1-L116)

**Section sources**
- [graph_routes.py](file://mag/app/api/graph_routes.py#L1-L340)
- [graph_service.py](file://mag/app/services/graph_service.py#L1-L220)

## 性能考虑
图管理API在处理复杂图时需考虑性能。子图展开和层级计算的时间复杂度与节点数量相关。建议对大型图进行分页加载，并在执行前进行预验证以减少运行时错误。SSE流式传输避免了大响应的内存压力。

## 故障排除指南
常见问题包括图配置验证失败、循环引用、MCP服务器未连接等。可通过检查`graph_schema.py`中的验证规则、使用`detect_graph_cycles`方法检测循环、确认MCP服务器状态来排查。执行日志记录在`graph_executor.py`中，可用于调试执行流程。

**Section sources**
- [graph_schema.py](file://mag/app/models/graph_schema.py#L1-L116)
- [graph_processor.py](file://mag/app/services/graph/graph_processor.py#L1-L553)
- [graph_executor.py](file://mag/app/services/graph/graph_executor.py)

## 结论
图管理API提供了完整的图生命周期管理功能，从CRUD操作到流式执行，形成了一个强大且灵活的系统。通过清晰的分层架构和模块化设计，系统易于维护和扩展。前端与后端通过定义良好的API接口和SSE事件流实现了高效的交互。