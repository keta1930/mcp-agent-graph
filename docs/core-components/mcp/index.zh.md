# MCP(模型上下文协议)

## 什么是 MCP

MCP 是连接 AI 智能体与外部工具和数据源的标准化协议。可以把它想象成 AI 领域的 USB-C——一个协议就能兼容所有服务。

无需为每个工具编写自定义集成,MCP 让您一次连接即可使用数百种服务:数据库、API、文件系统、云平台等。

## 核心组件

| 组件 | 用途 | 示例 |
|------|------|------|
| **服务器** | 提供工具和数据 | GitHub 服务器提供仓库操作功能 |
| **工具** | 智能体可执行的操作 | 搜索文件、创建问题、提交代码 |
| **资源** | 智能体可读取的数据 | 文件内容、API 响应、数据库记录 |
| **客户端** | 连接服务器到智能体 | 已内置在 MAG 平台 |

## 为什么使用 MCP

**扩展智能体能力**
无需编写集成代码即可添加工具。连接文件系统、数据库、云服务或自定义 API。

**标准化集成**
一个协议适配所有 MCP 服务器。通过安装服务器添加新能力,无需编写集成代码。

**社区生态**
使用来自开源社区的即用型服务器。

## 了解更多

- [MCP 官方文档](https://www.anthropic.com/news/model-context-protocol) - Anthropic 的 MCP 介绍
- [MCP 规范](https://github.com/modelcontextprotocol) - 技术细节和标准
- [社区讨论](https://github.com/orgs/modelcontextprotocol/discussions) - 加入对话
- [MCP.so](https://mcp.so/) -  mcp综合站
- [ModelScope](https://www.modelscope.cn/mcp) - modelscope mcp综合站
- [FastMCP](https://gofastmcp.com) - Python 框架和服务器示例
