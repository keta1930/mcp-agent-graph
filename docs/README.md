# MAG SDK 文档结构

本目录包含MAG SDK的模块化文档系统。

## 文件结构

```
docs/
├── index.html          # 主导航页面，包含样式和导航逻辑
├── modules/            # 模块化文档目录
│   ├── quickstart.html # 快速开始模块
│   ├── model.html      # 模型管理模块
│   ├── mcp.html        # MCP管理模块
│   ├── graph.html      # 图管理模块
│   ├── conversation.html # 会话管理模块
│   ├── shared.css      # 共享样式文件
│   └── shared.js       # 共享JavaScript功能
└── README.md           # 本说明文件
```

## 功能特性

### 主要特性
- **模块化设计**: 每个功能模块独立的HTML文件
- **统一样式**: 共享CSS文件确保样式一致性
- **主题支持**: 支持浅色/深色主题切换
- **代码高亮**: 使用highlight.js进行语法高亮
- **响应式设计**: 适配不同屏幕尺寸
- **iframe加载**: 模块内容通过iframe动态加载

### 技术栈
- **CSS框架**: Tailwind CSS 2.2.19
- **图标库**: Font Awesome 6.4.0
- **代码高亮**: Highlight.js 11.9.0
- **字体**: Google Fonts (Noto Sans SC / Noto Serif SC)

## 使用方法

1. 直接在浏览器中打开 `index.html`
2. 使用左侧导航菜单切换不同模块
3. 点击右上角的主题切换按钮改变主题

## 模块说明

### 快速开始 (quickstart.html)
- 安装部署指南
- 基础使用示例
- 核心概念介绍

### 模型管理 (model.html)
- 添加、查看、更新、删除模型
- 模型配置详解
- 完整使用示例

### MCP管理 (mcp.html)
- MCP服务器配置和管理
- 工具调用和测试
- AI生成MCP功能

### 图管理 (graph.html)
- 图的创建和运行
- AI图生成和优化
- 导入导出功能

### 会话管理 (conversation.html)
- 聊天完成接口
- 会话历史管理
- 会话压缩功能

## 开发说明

### 添加新模块
1. 在 `modules/` 目录创建新的HTML文件
2. 引用共享的CSS和JS文件
3. 在 `index.html` 中添加导航链接

### 修改样式
- 全局样式修改 `modules/shared.css`
- 模块特定样式在各自HTML文件中添加

### JavaScript功能
- 共享功能在 `modules/shared.js` 中
- 模块特定功能在各自HTML文件中添加

## 注意事项

- 所有模块文件都需要引用 `shared.css` 和 `shared.js`
- 主题切换功能通过父窗口通信实现
- 代码复制功能包含降级兼容性处理
- 支持跨域限制下的主题同步