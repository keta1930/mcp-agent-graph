import time
from typing import Dict, List, Any, Optional
import html


class ConversationTemplate:
    """会话模板生成器"""

    @staticmethod
    def generate_conversation_filename(graph_name: str) -> str:
        """生成会话文件名 - 图名称+执行时间"""
        # 使用年月日小时分钟格式
        time_str = time.strftime("%Y%m%d_%H%M%S", time.localtime())
        # 替换图名称中可能的特殊字符
        safe_graph_name = graph_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        return f"{safe_graph_name}_{time_str}"

    @staticmethod
    def generate_header(graph_name: str, conversation_id: str, input_text: str, start_time: str = None) -> str:
        """生成会话头部"""
        if start_time is None:
            start_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        return f"""# 图执行: {graph_name}
**开始时间**: {start_time}
**会话ID**: {conversation_id}

<summary><b>📝 用户输入</b></summary>

```
{input_text}
```


## 执行进度
"""

    @staticmethod
    def generate_node_section(node: Dict[str, Any]) -> str:
        """生成节点执行部分"""
        node_name = node.get("node_name", "未知节点")
        node_input = node.get("input", "")
        node_output = node.get("output", "")

        # 处理工具调用
        tool_calls_content = ""
        tool_calls = node.get("tool_results", [])
        tool_results = node.get("tool_results", [])

        if tool_calls or tool_results:
            tool_calls_content = "\n\n<summary><b>🔧 工具调用</b></summary>\n\n"
            for i, tool in enumerate(tool_calls):
                tool_name = tool.get("tool_name", "未知工具")
                tool_calls_content += f"- **{tool_name}**\n"

            for i, result in enumerate(tool_results):
                tool_name = result.get("tool_name", "未知工具")
                content = result.get("content", "")
                error = result.get("error", "")
                if error:
                    tool_calls_content += f"  - 错误: {error}\n"
                else:
                    tool_calls_content += f"  - 结果: {content[:100]}\n"

        # 处理子图
        subgraph_content = ""
        if node.get("is_subgraph", False):
            subgraph_content = f"\n<details>\n<summary><b>📊 子图: {node.get('subgraph_name', '未知子图')}</b></summary>\n\n"
            subgraph_results = node.get("subgraph_results", [])
            for sub_node in subgraph_results:
                subgraph_content += ConversationTemplate.generate_node_section(sub_node)

            subgraph_content += "</details>\n"

        return f"""
<details>
<summary><b>🔄 节点: {node_name}</b></summary>


<summary><b> 输入</b></summary>

{node_input}



<summary><b> 输出</b></summary>

{node_output}


{tool_calls_content}
{subgraph_content}
</details>
"""

    @staticmethod
    def generate_final_output(output: str) -> str:
        """生成最终输出部分"""
        return f"""
## 最终输出

<details open>
<summary><b>📊 执行结果</b></summary>

{output}
</details>
"""

    @staticmethod
    def generate_template(conversation: Dict[str, Any]) -> str:
        """生成完整的会话模板"""
        graph_name = conversation.get("graph_name", "未知图")
        conversation_id = conversation.get("conversation_id", "未知ID")

        # 查找初始输入
        input_text = ""
        for result in conversation.get("results", []):
            if result.get("is_start_input", False):
                input_text = result.get("input", "")
                break

        if not input_text and "input" in conversation:
            input_text = conversation.get("input", "")

        # 获取开始时间
        start_time = conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))

        # 生成头部
        template = ConversationTemplate.generate_header(graph_name, conversation_id, input_text, start_time)

        # 生成节点执行部分 - 确保包含所有节点
        node_results = conversation.get("node_results", [])
        for node_result in node_results:
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                template += ConversationTemplate.generate_node_section(node_result)

        # 生成最终输出
        final_output = conversation.get("output", "")
        template += ConversationTemplate.generate_final_output(final_output)

        return template

    @staticmethod
    def update_template(existing_template: str, conversation: Dict[str, Any]) -> str:
        """更新现有模板，确保所有节点信息都被包含"""
        # 由于增量更新复杂且容易出错，这里直接重新生成完整模板
        return ConversationTemplate.generate_template(conversation)


class HTMLConversationTemplate:
    """HTML会话模板生成器"""

    @staticmethod
    def _escape_html(text):
        """自定义HTML转义函数"""
        if not isinstance(text, str):
            return ""
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'",
                                                                                                                   "&#39;")

    @staticmethod
    def generate_html_template(conversation: Dict[str, Any]) -> str:
        """生成完整的HTML会话模板"""
        graph_name = conversation.get("graph_name", "未知图")
        conversation_id = conversation.get("conversation_id", "未知ID")

        # 查找初始输入
        input_text = ""
        for result in conversation.get("results", []):
            if result.get("is_start_input", False):
                input_text = result.get("input", "")
                break

        if not input_text and "input" in conversation:
            input_text = conversation.get("input", "")

        # 获取开始时间
        start_time = conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))

        # 安全转义函数
        escape_html = HTMLConversationTemplate._escape_html

        # 生成HTML头部和样式
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图执行: {escape_html(graph_name)}</title>
    <!-- 引入marked.js库用于解析Markdown -->
    <script src="https://cdn.jsdelivr.net/npm/marked@4.0.0/marked.min.js"></script>
    <style>
        :root {{
            --primary-color: #3498db;
            --secondary-color: #2c3e50;
            --accent-color: #e74c3c;
            --background-color: #f9f9f9;
            --card-bg: #ffffff;
            --text-color: #333333;
            --border-color: #dddddd;
            --sidebar-width: 280px;
            --header-height: 60px;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.5;
            color: var(--text-color);
            background-color: var(--background-color);
            margin: 0;
            padding: 0;
        }}

        .layout {{
            display: flex;
            min-height: 100vh;
        }}

        .sidebar {{
            width: var(--sidebar-width);
            background-color: var(--card-bg);
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            overflow-y: auto;
            z-index: 100;
            padding-top: var(--header-height);
            transition: transform 0.3s ease;
        }}

        .sidebar-hidden {{
            transform: translateX(-100%);
        }}

        .sidebar-toggle {{
            position: fixed;
            left: 20px;
            top: 20px;
            z-index: 200;
            background-color: var(--primary-color);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }}

        .sidebar-toggle:focus {{
            outline: none;
        }}

        .main-content {{
            flex: 1;
            margin-left: var(--sidebar-width);
            padding: 20px;
            padding-top: calc(var(--header-height) + 20px);
            transition: margin-left 0.3s ease;
        }}

        .main-content-full {{
            margin-left: 0;
        }}

        .nav-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}

        .nav-item {{
            padding: 10px 15px;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
        }}

        .nav-item:hover {{
            background-color: rgba(0,0,0,0.05);
        }}

        .nav-item.active {{
            background-color: rgba(52, 152, 219, 0.2);
            border-left: 4px solid var(--primary-color);
        }}

        .nav-section {{
            font-weight: bold;
            padding: 15px;
            background-color: var(--secondary-color);
            color: white;
        }}

        .nav-subitem {{
            padding: 8px 15px 8px 30px;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.9em;
            cursor: pointer;
        }}

        .nav-subitem:hover {{
            background-color: rgba(0,0,0,0.05);
        }}

        header {{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: var(--header-height);
            background-color: var(--primary-color);
            color: white;
            z-index: 99;
            display: flex;
            align-items: center;
            padding: 0 20px 0 calc(var(--sidebar-width) + 20px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: padding 0.3s ease;
        }}

        header.full-width {{
            padding-left: 80px;
        }}

        header h1 {{
            margin: 0;
            font-size: 1.4rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        .info-card {{
            margin-bottom: 25px;
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            overflow: hidden;
        }}

        .info-header {{
            background-color: var(--secondary-color);
            color: white;
            padding: 15px 20px;
            font-weight: bold;
        }}

        .info-body {{
            padding: 15px 20px;
        }}

        .info-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }}

        .info-table td {{
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }}

        .info-table td:first-child {{
            font-weight: bold;
            width: 150px;
        }}

        .card {{
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            margin-bottom: 20px;
            overflow: hidden;
        }}

        .card-header {{
            background-color: var(--secondary-color);
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }}

        .card-body {{
            padding: 15px;
        }}

        .input-section, .output-section {{
            background-color: #f5f5f5;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            white-space: pre-wrap;
            overflow-x: auto;
            font-size: 0.95em;
        }}

        .input-label, .output-label {{
            font-weight: bold;
            margin-bottom: 6px;
            color: var(--secondary-color);
            display: flex;
            align-items: center;
        }}

        .input-label::before, .output-label::before {{
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 8px;
            border-radius: 50%;
        }}

        .input-label::before {{
            background-color: var(--secondary-color);
        }}

        .output-label::before {{
            background-color: var(--primary-color);
        }}

        .tool-calls {{
            border-left: 4px solid var(--accent-color);
            padding-left: 15px;
            margin: 15px 0;
            background-color: rgba(231, 76, 60, 0.05);
            border-radius: 0 4px 4px 0;
            padding: 10px 15px;
        }}

        .tool-name {{
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 5px;
        }}

        .tool-result {{
            margin-top: 5px;
            padding: 8px;
            background-color: rgba(0,0,0,0.03);
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9em;
        }}

        .subgraph {{
            margin-left: 20px;
            border-left: 3px solid var(--primary-color);
            padding-left: 15px;
            margin-top: 15px;
        }}

        .final-output {{
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 5px solid var(--primary-color);
        }}

        .toggle-button {{
            background-color: rgba(255,255,255,0.2);
            border: none;
            border-radius: 4px;
            color: white;
            padding: 3px 8px;
            cursor: pointer;
            font-size: 0.8em;
        }}

        section {{
            scroll-margin-top: 80px;
        }}

        /* Markdown 渲染样式 */
        .markdown-content {{
            line-height: 1.6;
        }}

        .markdown-content table {{
            border-collapse: collapse;
            margin: 15px 0;
            width: 100%;
        }}

        .markdown-content table th,
        .markdown-content table td {{
            padding: 8px 12px;
            border: 1px solid var(--border-color);
        }}

        .markdown-content table th {{
            background-color: rgba(0,0,0,0.05);
            font-weight: bold;
        }}

        .markdown-content pre code {{
            display: block;
            padding: 12px;
            background-color: #f0f0f0;
            border-radius: 4px;
            overflow-x: auto;
        }}

        .markdown-content code {{
            background-color: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }}

        .markdown-content blockquote {{
            border-left: 4px solid var(--primary-color);
            padding-left: 15px;
            margin-left: 0;
            color: #777;
        }}

        .scroll-top {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: var(--primary-color);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 99;
            opacity: 0;
            transition: opacity 0.3s ease;
        }}

        .scroll-top.visible {{
            opacity: 1;
        }}

        @media (max-width: 992px) {{
            .sidebar {{
                transform: translateX(-100%);
            }}

            .sidebar.active {{
                transform: translateX(0);
            }}

            .main-content {{
                margin-left: 0;
            }}

            header {{
                padding-left: 80px;
            }}
        }}

        @media (prefers-color-scheme: dark) {{
            :root {{
                --primary-color: #3498db;
                --secondary-color: #2c3e50;
                --accent-color: #e74c3c;
                --background-color: #121212;
                --card-bg: #1e1e1e;
                --text-color: #f5f5f5;
                --border-color: #333333;
            }}

            .input-section, .output-section {{
                background-color: #2c2c2c;
            }}

            .markdown-content code,
            .markdown-content pre code {{
                background-color: #2a2a2a;
            }}

            .markdown-content table th {{
                background-color: rgba(255,255,255,0.05);
            }}

            .tool-result {{
                background-color: rgba(255,255,255,0.05);
            }}
        }}
    </style>
</head>
<body>
    <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle menu">≡</button>

    <header id="main-header">
        <h1>图执行: {escape_html(graph_name)}</h1>
    </header>

    <div class="layout">
        <nav id="sidebar" class="sidebar">
            <div class="nav-section">目录导航</div>
            <ul class="nav-list">
                <li class="nav-item" data-target="info-section">基本信息</li>
                <li class="nav-item" data-target="input-section">用户输入</li>"""

        # 为每个节点创建导航项
        node_results = conversation.get("node_results", [])
        for i, node_result in enumerate(node_results):
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                node_name = node_result.get("node_name", "未知节点")
                node_id = f"node-{i}"
                html += f'\n                <li class="nav-item" data-target="{node_id}">{escape_html(node_name)}</li>'

        html += f"""
                <li class="nav-item" data-target="final-output">最终输出</li>
            </ul>
        </nav>

        <main id="main-content" class="main-content">
            <div class="container">
                <section id="info-section" class="info-card">
                    <div class="info-header">基本信息</div>
                    <div class="info-body">
                        <table class="info-table">
                            <tr>
                                <td>开始时间</td>
                                <td>{escape_html(start_time)}</td>
                            </tr>
                            <tr>
                                <td>会话ID</td>
                                <td>{escape_html(conversation_id)}</td>
                            </tr>
                        </table>
                    </div>
                </section>

                <section id="input-section" class="card">
                    <div class="card-header">
                        📝 用户输入
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <div class="input-section markdown-content" data-markdown="{escape_html(input_text)}"></div>
                    </div>
                </section>

                <h2>执行进度</h2>
"""

        # 生成节点执行部分
        for i, node_result in enumerate(node_results):
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                node_id = f"node-{i}"
                html += HTMLConversationTemplate._generate_node_section_html(node_result, node_id)

        # 生成最终输出
        final_output = conversation.get("output", "")
        html += f"""
                <section id="final-output" class="card">
                    <div class="card-header">
                        📊 最终输出
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <div class="output-section markdown-content" data-markdown="{escape_html(final_output)}"></div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <div id="scroll-top" class="scroll-top">↑</div>

    <script>
        // 初始化Markdown解析
        document.addEventListener('DOMContentLoaded', function() {{
            // 配置Marked选项
            marked.setOptions({{
                breaks: true,
                gfm: true,
                headerIds: true,
                mangle: false
            }});

            // 处理所有标记为markdown的内容
            document.querySelectorAll('[data-markdown]').forEach(element => {{
                const markdownText = element.getAttribute('data-markdown');
                if (markdownText) {{
                    element.innerHTML = marked.parse(markdownText);
                }}
            }});

            // 侧边栏切换
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('main-content');
            const header = document.getElementById('main-header');
            const sidebarToggle = document.getElementById('sidebar-toggle');

            sidebarToggle.addEventListener('click', function() {{
                sidebar.classList.toggle('sidebar-hidden');
                mainContent.classList.toggle('main-content-full');
                header.classList.toggle('full-width');
            }});

            // 导航菜单点击事件
            document.querySelectorAll('.nav-item').forEach(item => {{
                item.addEventListener('click', function() {{
                    const targetId = this.getAttribute('data-target');
                    const targetElement = document.getElementById(targetId);

                    if (targetElement) {{
                        // 高亮当前导航项
                        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                        this.classList.add('active');

                        // 滚动到目标元素
                        targetElement.scrollIntoView({{
                            behavior: 'smooth'
                        }});

                        // 在小屏幕上自动关闭侧边栏
                        if (window.innerWidth < 992) {{
                            sidebar.classList.add('sidebar-hidden');
                            mainContent.classList.add('main-content-full');
                            header.classList.add('full-width');
                        }}
                    }}
                }});
            }});

            // 展开/折叠按钮
            document.querySelectorAll('.card-header').forEach(header => {{
                header.addEventListener('click', function(event) {{
                    // 如果点击的是按钮，不执行折叠操作
                    if (event.target.classList.contains('toggle-button')) {{
                        return;
                    }}
                    const body = this.nextElementSibling;
                    body.style.display = body.style.display === 'none' ? 'block' : 'none';
                }});
            }});

            // 单独处理展开/折叠按钮
            document.querySelectorAll('.toggle-button').forEach(button => {{
                button.addEventListener('click', function(event) {{
                    event.stopPropagation(); // 阻止事件冒泡
                    const body = this.closest('.card-header').nextElementSibling;
                    body.style.display = body.style.display === 'none' ? 'block' : 'none';
                }});
            }});

            // 滚动到顶部按钮
            const scrollTopBtn = document.getElementById('scroll-top');

            window.addEventListener('scroll', function() {{
                if (window.pageYOffset > 300) {{
                    scrollTopBtn.classList.add('visible');
                }} else {{
                    scrollTopBtn.classList.remove('visible');
                }}
            }});

            scrollTopBtn.addEventListener('click', function() {{
                window.scrollTo({{
                    top: 0,
                    behavior: 'smooth'
                }});
            }});

            // 响应式设计初始化
            if (window.innerWidth < 992) {{
                sidebar.classList.add('sidebar-hidden');
                mainContent.classList.add('main-content-full');
                header.classList.add('full-width');
            }}
        }});
    </script>
</body>
</html>
"""

        return html

    @staticmethod
    def _generate_node_section_html(node: Dict[str, Any], node_id: str = "") -> str:
        """生成节点执行部分的HTML"""
        escape_html = HTMLConversationTemplate._escape_html

        node_name = node.get("node_name", "未知节点")
        node_input = node.get("input", "")
        node_output = node.get("output", "")

        # 处理工具调用
        tool_calls_content = ""
        tool_calls = node.get("tool_results", [])
        tool_results = node.get("tool_results", [])

        if tool_calls or tool_results:
            tool_calls_content = """<div class="tool-calls">
                <div class="input-label">🔧 工具调用</div>
            """
            for i, tool in enumerate(tool_calls):
                tool_name = tool.get("tool_name", "未知工具")
                tool_calls_content += f'<div class="tool-name">{escape_html(tool_name)}</div>'

            for i, result in enumerate(tool_results):
                tool_name = result.get("tool_name", "未知工具")
                content = result.get("content", "")
                error = result.get("error", "")
                if error:
                    tool_calls_content += f'<div class="tool-result">错误: {escape_html(error)}</div>'
                else:
                    # 显示完整内容，不截断
                    tool_calls_content += f'<div class="tool-result">{escape_html(str(content))}</div>'

            tool_calls_content += "</div>"

        # 处理子图
        subgraph_content = ""
        if node.get("is_subgraph", False):
            subgraph_content = f"""<div class="subgraph">
                <div class="input-label">📊 子图: {escape_html(node.get('subgraph_name', '未知子图'))}</div>
            """
            subgraph_results = node.get("subgraph_results", [])
            for i, sub_node in enumerate(subgraph_results):
                subgraph_content += HTMLConversationTemplate._generate_node_section_html(sub_node, f"{node_id}-sub-{i}")

            subgraph_content += "</div>"

        return f"""
                <section id="{node_id}" class="card">
                    <div class="card-header">
                        🔄 节点: {escape_html(node_name)}
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <div>
                            <div class="input-label">输入</div>
                            <div class="input-section markdown-content" data-markdown="{escape_html(node_input)}"></div>
                        </div>
                        <div>
                            <div class="output-label">输出</div>
                            <div class="output-section markdown-content" data-markdown="{escape_html(node_output)}"></div>
                        </div>
                        {tool_calls_content}
                        {subgraph_content}
                    </div>
                </section>
        """