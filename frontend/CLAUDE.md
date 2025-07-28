OpenAI原生响应数据格式
SSE流式响应结构
data: {JSON对象}
data: [DONE]
核心数据字段
1. 增量内容 (choices[0].delta)
- content: 回复文本的增量片段
- reasoning_content: Think模型思考过程增量（Think模型专有）
- tool_calls: 工具调用增量数据 
  - index: 工具调用索引
  - id: 工具调用ID
  - function.name: 工具名称增量
  - function.arguments: 工具参数增量
2. 状态信息 (choices[0])
- finish_reason: 完成原因 
  - null: 流式进行中
  - "stop": 正常结束
  - "tool_calls": 需要工具调用
3. Token使用量 (usage)
- total_tokens: 总token数量
- prompt_tokens: 输入token数量
- completion_tokens: 输出token数量
- completion_tokens_details.reasoning_tokens: 思考token数量（Think模型）

Chat 模式API
一、POST /api/chat/completions 扩展响应数据
自定义消息类型
1. 工具执行结果
{
  "role": "tool",
  "tool_call_id": "call_xxx",
  "content": "工具执行结果内容"
}
2. 错误信息
{
  "error": {
    "message": "错误描述信息",
    "type": "错误类型标识"
  }
}
完整响应流程
1. 建立连接 → SSE流开始
2. Think阶段（如适用） → reasoning_content 增量输出
3. 文本生成 → content 增量输出
4. 工具调用 → tool_calls 增量输出
5. 工具执行 → role: "tool" 结果返回
6. 多轮迭代 → 重复步骤3-5
7. Token统计 → usage 对象输出
8. 流结束 → data: [DONE]
请求端点与结构
端点: POST /api/chat/completions
请求体:
{
  "user_prompt": "用户输入内容",
  "system_prompt": "系统提示词",
  "mcp_servers": ["工具服务器列表"],
  "model_name": "模型名称",
  "conversation_id": "对话ID",
  "user_id": "用户ID"
}
核心特性
- 完全兼容OpenAI SSE流式格式
- 自动处理工具调用执行

Agent模式API - AI生成MCP
二、POST /api/mcp/generate 扩展响应数据
请求端点与结构
端点: POST /api/mcp/generate
请求体:
{
  "requirement": "MCP工具需求描述",
  "model_name": "模型名称",
  "conversation_id": "对话ID（可选）",
  "user_id": "用户ID"
}
自定义响应事件
1. 生成完成事件
{
  "completion": {
    "tool_name": "生成的工具名称",
    "message": "MCP工具 'xxx' 生成完成！"
  }
}
2. 生成未完成事件
{
  "incomplete": {
    "message": "MCP工具设计尚未完成，缺少: analysis, todo",
    "missing_fields": ["analysis", "todo", "folder_name"]
  }
}
3. 错误信息
{
  "error": {
    "message": "错误描述信息",
    "type": "错误类型标识"
  }
}
特殊指令
结束指令
发送 "<end>END</end>" 作为requirement来：
- 检查生成完整性
- 组装最终MCP工具
- 注册到系统配置
完整响应流程
1. 建立连接 → SSE流开始
2. 需求分析 → AI分析用户需求，输出analysis和todo
3. 设计生成 → 生成folder_name、script_files、dependencies等
4. 多轮交互 → 用户可继续优化和修改
5. 完成检查 → 发送<end>END</end>检查完整性
6. 工具创建 → 自动创建文件并注册到MCP配置
7. 流结束 → data: [DONE]

Agent模式API - AI生成Graph总结
三、POST /graphs/generate 扩展响应数据
请求端点与结构
端点: POST /graphs/generate
请求体:
{
  "requirement": "图配置需求描述",
  "model_name": "模型名称",
  "conversation_id": "对话ID（可选）",
  "user_id": "用户ID",
  "graph_name": "现有图名称（可选，用于更新）"
}
自定义响应事件
1. 生成完成事件
{
  "completion": {
    "graph_name": "生成的图名称",
    "message": "图 'xxx' 生成完成！"
  }
}
2. 生成未完成事件
{
  "incomplete": {
    "message": "图设计尚未完成，缺少: analysis, nodes",
    "missing_fields": ["analysis", "todo", "nodes"]
  }
}
3. 错误信息
{
  "error": {
    "message": "错误描述信息",
    "type": "错误类型标识"
  }
}
特殊指令
结束指令
发送 "<end>END</end>" 作为requirement来：
- 检查图配置完整性
- 组装最终图配置
- 保存到文件系统并生成README
完整响应流程
1. 建立连接 → SSE流开始
2. 需求分析 → AI分析需求，输出analysis和todo
3. 图设计 → 生成graph_name、graph_description、end_template
4. 节点设计 → 逐步生成和完善nodes配置
5. 多轮交互 → 用户可继续优化节点和连接关系
6. 完成检查 → 发送<end>END</end>检查完整性
7. 图保存 → 验证配置并保存到文件系统，生成README文档
8. 流结束 → data: [DONE]

Graph模式API - 图执行总结
四、POST /graphs/execute 扩展响应数据
请求端点与结构
端点: POST /graphs/execute
请求体:
{
  "graph_name": "要执行的图名称",
  "input_text": "用户输入内容",
  "conversation_id": "对话ID（可选，用于继续会话）",
  "continue_from_checkpoint": "是否从断点继续执行(default=False)"
}
自定义图执行事件
1. 节点开始事件
{
  "type": "node_start",
  "node_name": "节点名称",
  "level": 0
}
2. 节点结束事件
{
  "type": "node_end",
  "node_name": "节点名称"
}
3. 图完成事件
{
  "type": "graph_complete",
  "final_result": "图的最终输出结果",
  "execution_chain": [["start"], ["node1", "node2"], ["node3"]]
}
4. 错误事件
{
  "error": {
    "message": "错误描述信息",
    "type": "execution_error"
  }
}
工具执行响应
工具结果消息
{
  "role": "tool",
  "tool_call_id": "call_xxx",
  "content": "工具执行结果内容"
}
完整执行流程
1. 建立连接 → SSE流开始
2. 记录输入 → 保存用户输入为start节点
3. 层级遍历 → 按level顺序执行每一层
4. 节点执行循环: 
  - 发送node_start事件
  - 构建节点上下文和消息
  - OpenAI流式调用（包含工具调用处理）
  - 多轮工具调用迭代
  - 保存节点输出和全局输出
  - 发送node_end事件
5. Handoffs处理 → 检测跳转指令并执行目标节点
6. 图完成 → 发送graph_complete事件
7. 流结束 → data: [DONE]
会话管理
继续执行
- 使用existing conversation_id
- 支持断点续传（使用continue_from_checkpoint = true）
- 检测执行恢复点

对话管理API总结
一、GET /api/chat/conversations - 获取对话列表
请求格式
端点: GET /api/chat/conversations
查询参数:
- user_id: 用户ID（可选，默认："default_user"）
请求示例:
GET /api/chat/conversations?user_id=default_user
响应格式
Content-Type: application/json
响应结构:
{
  "conversations": [
    {
      "_id": "对话唯一标识",
      "user_id": "用户ID", 
      "type": "对话类型",
      "title": "对话标题",
      "created_at": "创建时间ISO字符串",
      "updated_at": "更新时间ISO字符串",
      "round_count": "轮次数量",
      "total_token_usage": {
        "total_tokens": "总token数",
        "prompt_tokens": "输入token数",
        "completion_tokens": "输出token数"
      },
      "status": "对话状态",
      "tags": ["标签数组"]
    }
  ],
  "total_count": "对话总数"
}
字段说明
对话类型 (type)
- "chat": 普通聊天对话
- "agent": AI生成对话（图/MCP生成）
- "graph": 图执行对话
对话状态 (status)
- "active": 活跃状态
- "deleted": 已删除（软删除）
- "favorite": 收藏状态
二、GET /api/chat/conversations/{conversation_id} - 获取对话详情
请求格式
端点: GET /api/chat/conversations/{conversation_id}
路径参数:
- conversation_id: 对话ID（必需）
请求示例:
GET /api/chat/conversations/conv_123456789
响应格式
Content-Type: application/json
响应结构:
{
  "conversation_id": "对话唯一标识",
  "title": "对话标题",
  "rounds": [
    {
      "round": "轮次编号",
      "messages": [
        {
          "role": "消息角色",
          "content": "消息内容",
          "tool_calls": ["工具调用数组（可选）"]
        }
      ]
    }
  ],
  "generation_type": "生成类型标识",
  "parsed_results": "解析结果对象（AI生成时）",
  "execution_chain": "执行链数组（图运行时）",
  "final_result": "最终执行结果（图运行时）"
}
rounds详细结构
Chat对话rounds/AI生成对话（图/MCP生成）rounds:
{
  "round": 1,
  "messages": [
    {
      "role": "user",
      "content": "用户输入"
    },
    {
      "role": "assistant", 
      "content": "AI回复",
      "tool_calls": [
        {
          "id": "call_xxx",
          "type": "function",
          "function": {
            "name": "工具名",
            "arguments": "工具参数JSON"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_xxx",
      "content": "工具执行结果"
    }
  ]
}
Graph执行rounds
{
  "round": 1,
  "node_name": "节点名称",
  "level": "节点层级",
  "output_enabled": "输出模式",
  "messages": ["节点执行的消息列表"],
  "mcp_servers": ["使用的MCP服务器"]
}
generation_type字段
根据对话类型自动识别：
- "chat": 普通聊天对话
- "graph": AI图生成对话
- "mcp": AI MCP生成对话
- "graph_run": 图执行对话
按generation_type返回的扩展字段
"graph_run" - 图执行对话
{
  "execution_chain": [["start"], ["node1", "node2"], ["node3"]],
  "final_result": "图的最终执行结果文本"
}
"graph" - AI图生成对话
{
  "parsed_results": {
    "analysis": "需求分析",
    "todo": "待办事项", 
    "graph_name": "图名称",
    "graph_description": "图描述",
    "nodes": ["节点配置数组"],
    "end_template": "输出模板"
  }
}
"mcp" - AI MCP生成对话
{
  "parsed_results": {
    "analysis": "需求分析",
    "todo": "待办事项",
    "folder_name": "工具文件夹名", 
    "script_files": {"main.py": "代码内容"},
    "dependencies": "依赖信息",
    "readme": "说明文档"
  }
}
错误响应
{
  "detail": "找不到对话 'conversation_id'"
}
HTTP 500:
{
  "detail": "获取对话详情出错: 错误信息"
}
三、PUT /api/chat/conversations/{conversation_id}/status - 更新对话状态
请求格式
端点: PUT /api/chat/conversations/{conversation_id}/status
路径参数:
- conversation_id: 对话ID（必需）
请求体:
{
  "status": "对话状态",
  "user_id": "用户ID"
}
状态值:
- "active": 活跃状态
- "deleted": 软删除状态
- "favorite": 收藏状态
响应格式
成功响应 (HTTP 200):
{
  "status": "success",
  "message": "状态描述信息",
  "conversation_id": "对话ID",
  "new_status": "新状态值"
}
错误响应:
- HTTP 404: {"detail": "找不到对话 'conversation_id' 或状态更新失败"}
- HTTP 500: {"detail": "更新对话状态出错: 错误信息"}
四、PUT /api/chat/conversations/{conversation_id}/title - 更新对话标题
请求格式
端点: PUT /api/chat/conversations/{conversation_id}/title
路径参数:
- conversation_id: 对话ID（必需）
请求体:
{
  "title": "新的对话标题",
  "user_id": "用户ID"
}
响应格式
成功响应 (HTTP 200):
{
  "status": "success",
  "message": "对话标题更新成功",
  "conversation_id": "对话ID",
  "title": "更新后的标题"
}
错误响应:
- HTTP 400: {"detail": "标题不能为空"}
- HTTP 404: {"detail": "找不到对话 'conversation_id' 或更新失败"}
- HTTP 500: {"detail": "更新对话标题出错: 错误信息"}
五、PUT /api/chat/conversations/{conversation_id}/tags - 更新对话标签
请求格式
端点: PUT /api/chat/conversations/{conversation_id}/tags
路径参数:
- conversation_id: 对话ID（必需）
请求体:
{
  "tags": ["标签1", "标签2", "标签3"],
  "user_id": "用户ID"
}
响应格式
成功响应 (HTTP 200):
{
  "status": "success",
  "message": "对话标签更新成功",
  "conversation_id": "对话ID",
  "tags": ["更新后的标签数组"]
}
错误响应:
- HTTP 404: {"detail": "找不到对话 'conversation_id' 或更新失败"}
- HTTP 500: {"detail": "更新对话标签出错: 错误信息"}
六、DELETE /api/chat/conversations/{conversation_id}/permanent - 永久删除对话
请求格式
端点: DELETE /api/chat/conversations/{conversation_id}/permanent
路径参数:
- conversation_id: 对话ID（必需）
查询参数:
- user_id: 用户ID（可选，默认："default_user"）
请求示例:
DELETE /api/chat/conversations/conv_123456/permanent?user_id=default_user
响应格式
成功响应 (HTTP 200):
{
  "status": "success",
  "message": "对话 'conversation_id' 已永久删除",
  "conversation_id": "对话ID"
}
错误响应:
- HTTP 404: {"detail": "找不到对话 'conversation_id'"}
- HTTP 403: {"detail": "无权限访问此对话"}
- HTTP 500: {"detail": "永久删除对话 'conversation_id' 失败"}
七、POST /api/chat/conversations/{conversation_id}/compact - 压缩对话内容（only chat mode可用）
请求格式
端点: POST /api/chat/conversations/{conversation_id}/compact
路径参数:
- conversation_id: 对话ID（必需）
请求体:
{
  "conversation_id": "对话ID（必须与路径参数一致）",
  "model_name": "用于总结的模型名称",
  "compact_type": "压缩类型",
  "compact_threshold": "压缩阈值（字符数）",
  "user_id": "用户ID"
}
压缩类型:
- "brutal": 暴力压缩（每轮只保留system + user + 最后一个assistant消息）
- "precise": 精确压缩（对超过阈值的tool消息内容进行AI总结）
响应格式
成功响应 (HTTP 200):
{
  "status": "success",
  "message": "对话压缩成功，压缩比: 45.2%",
  "conversation_id": "对话ID",
  "compact_type": "压缩类型",
  "statistics": {
    "original_rounds": "原始轮次数",
    "original_messages": "原始消息数",
    "compacted_rounds": "压缩后轮次数", 
    "compacted_messages": "压缩后消息数",
    "compression_ratio": "压缩比例（0-1）",
    "tool_contents_summarized": "总结的工具内容数量"
  },
  "error": null
}
错误响应:
{
  "status": "error",
  "message": "错误描述信息",
  "conversation_id": "对话ID",
  "compact_type": "压缩类型",
  "statistics": null,
  "error": "详细错误信息"
}