from typing import Dict, List, Any, Optional
from .template_utils import escape_html, format_timestamp, get_node_execution_sequence
from .template_utils import get_input_from_conversation, sanitize_id
from .flow_diagram import FlowDiagram

class HTMLGenerator:
    """HTML会话模板生成器"""

    @staticmethod
    def generate_html_template(conversation: Dict[str, Any]) -> str:
        """生成完整的HTML会话模板，按节点执行顺序排列"""
        graph_name = conversation.get("graph_name", "未知图")
        conversation_id = conversation.get("conversation_id", "未知ID")
        
        # 获取用户输入
        input_text = get_input_from_conversation(conversation)
        
        # 获取开始时间
        start_time = conversation.get("start_time", format_timestamp())
        
        # 最终输出
        final_output = conversation.get("output", "")

        # 获取按执行顺序排列的节点结果
        node_sequence = get_node_execution_sequence(conversation)
        
        # 为每个节点添加执行顺序标记
        for i, node in enumerate(node_sequence):
            node['_execution_order'] = i + 1

        # 生成Mermaid流程图
        mermaid_diagram = FlowDiagram.generate_mermaid_diagram(conversation)

        # 生成HTML头部和样式
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图执行: {escape_html(graph_name)}</title>
    <!-- 引入Mermaid库 -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@9.3.0/dist/mermaid.min.js"></script>
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
            --node-completed: #9cf;
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

        .flow-diagram {{
            width: 100%;
            overflow: auto;
            background-color: white;
            border-radius: 6px;
            padding: 10px;
        }}

        .execution-step {{
            display: inline-block;
            background-color: var(--primary-color);
            color: white;
            font-size: 0.8em;
            padding: 3px 8px;
            border-radius: 12px;
            margin-left: 10px;
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

        /* 暗黑模式 */
        @media (prefers-color-scheme: dark) {{
            :root {{
                --background-color: #121212;
                --card-bg: #1e1e1e;
                --text-color: #f5f5f5;
                --border-color: #333333;
                --node-completed: #36648b;
            }}
            
            .input-section, .output-section {{
                background-color: #2c2c2c;
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
            <ul class="nav-list">
                <li class="nav-item" data-target="info-section">基本信息</li>
                <li class="nav-item" data-target="input-section">用户输入</li>
                <li class="nav-item" data-target="flow-diagram-section">执行流程图</li>"""

        # 为每个节点创建导航项 - 按执行顺序排列
        for i, node_result in enumerate(node_sequence):
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                node_name = node_result.get("node_name", "未知节点")
                node_id = f"node-{i}"
                step = node_result.get("_execution_order", i+1)
                html += f'\n                <li class="nav-item" data-target="{node_id}">节点: {escape_html(node_name)} <span class="execution-step">{step}</span></li>'

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
                        <pre>{escape_html(input_text)}</pre>
                    </div>
                </section>

                <section id="flow-diagram-section" class="card">
                    <div class="card-header">
                        📊 执行流程图
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <div class="flow-diagram">
                            <div class="mermaid">
{escape_html(mermaid_diagram)}
                            </div>
                        </div>
                    </div>
                </section>

                <h2>执行进度</h2>
"""

        # 生成节点执行部分 - 按执行顺序排列
        for i, node_result in enumerate(node_sequence):
            if not node_result.get("is_start_input", False):  # 跳过初始输入节点
                node_id = f"node-{i}"
                html += HTMLGenerator._generate_node_section_html(node_result, node_id)

        # 生成最终输出
        html += f"""
                <section id="final-output" class="card">
                    <div class="card-header">
                        📊 最终输出
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <pre>{escape_html(final_output)}</pre>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <script>
        // 配置Mermaid
        mermaid.initialize({{
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {{ 
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis'
            }},
            startOnLoad: true
        }});

        document.addEventListener('DOMContentLoaded', function() {{
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
        node_name = node.get("node_name", "未知节点")
        node_input = node.get("input", "")
        node_output = node.get("output", "")
        execution_order = node.get("_execution_order", "N/A")

        # 处理工具调用
        tool_calls_content = ""
        tool_calls = node.get("tool_calls", [])
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
                    tool_calls_content += f'<div class="tool-result">{escape_html(str(content))}</div>'

            tool_calls_content += "</div>"

        # 处理子图
        subgraph_content = ""
        if node.get("is_subgraph", False):
            subgraph_content = f"""<div class="subgraph">
                <div class="subgraph-label">📊 子图: {escape_html(node.get('subgraph_name', '未知子图'))}</div>
            """
            subgraph_results = node.get("subgraph_results", [])
            for i, sub_node in enumerate(subgraph_results):
                subgraph_content += HTMLGenerator._generate_node_section_html(sub_node, f"{node_id}-sub-{i}")

            subgraph_content += "</div>"

        return f"""
                <section id="{node_id}" class="card">
                    <div class="card-header">
                        🔄 节点: {escape_html(node_name)} <span class="execution-step">{execution_order}</span>
                        <button class="toggle-button">展开/折叠</button>
                    </div>
                    <div class="card-body">
                        <div>
                            <div class="input-label">输入</div>
                            <pre class="input-section">{escape_html(node_input)}</pre>
                        </div>
                        <div>
                            <div class="output-label">输出</div>
                            <pre class="output-section">{escape_html(node_output)}</pre>
                        </div>
                        {tool_calls_content}
                        {subgraph_content}
                    </div>
                </section>
        """