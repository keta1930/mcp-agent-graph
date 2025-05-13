from typing import Dict, List, Any, Optional
from .template_utils import sanitize_id

class FlowDiagram:
    """工作流程图生成器"""
    
    @staticmethod
    def generate_mermaid_diagram(conversation: Dict[str, Any]) -> str:
        """生成表示执行流程的Mermaid图表
        
        基于实际节点执行顺序创建有向图，从start到end，展示完整执行路径
        """
        # 获取已执行的节点及其执行顺序
        results = conversation.get("results", [])
        graph_config = conversation.get("graph_config", {})
        
        # 筛选出已执行的节点(按执行顺序)
        executed_nodes = []
        for result in results:
            if not result.get("is_start_input", False):
                executed_nodes.append(result.get("node_name"))
        
        # 如果没有执行过节点，返回简单图表
        if not executed_nodes:
            return "graph TD;\n    start([开始]) --> end([结束]);"
        
        # 创建Mermaid图表
        mermaid = ["graph TD;"]
        mermaid.append("    start([开始]) --> " + sanitize_id(executed_nodes[0]) + ";")
        
        # 添加节点定义
        node_info = {}  # 存储节点信息，如类型、描述等
        
        for node in graph_config.get("nodes", []):
            node_name = node["name"]
            if node_name in executed_nodes:
                node_info[node_name] = {
                    "is_subgraph": node.get("is_subgraph", False),
                    "is_end": node.get("is_end", False) or "end" in node.get("output_nodes", []),
                    "description": node.get("description", "")
                }
        
        # 添加节点及其连接，按照执行顺序
        for i, node_name in enumerate(executed_nodes):
            # 使用不同形状区分节点类型
            if node_name in node_info:
                if node_info[node_name]["is_subgraph"]:
                    # 子图节点用六边形
                    mermaid.append(f'    {sanitize_id(node_name)}{{"{node_name}"}};')
                elif node_info[node_name]["is_end"]:
                    # 结束节点用圆角矩形
                    mermaid.append(f'    {sanitize_id(node_name)}["{node_name}"];')
                else:
                    # 普通节点用矩形
                    mermaid.append(f'    {sanitize_id(node_name)}["{node_name}"];')
                
                # 添加悬停提示
                if node_info[node_name]["description"]:
                    mermaid.append(f'    {sanitize_id(node_name)}:::tooltip;')
                    mermaid.append(f'    classDef tooltip title="{node_info[node_name]["description"]}";')
            else:
                # 默认为普通节点
                mermaid.append(f'    {sanitize_id(node_name)}["{node_name}"];')
            
            # 设置执行节点的样式
            mermaid.append(f'    style {sanitize_id(node_name)} fill:#9cf,stroke:#333,stroke-width:2px;')
            
            # 添加节点之间的连接
            if i < len(executed_nodes) - 1:
                mermaid.append(f'    {sanitize_id(node_name)} --> {sanitize_id(executed_nodes[i+1])};')
        
        # 最后一个节点连接到end
        mermaid.append(f'    {sanitize_id(executed_nodes[-1])} --> end([结束]);')
        
        # 添加注释说明执行顺序
        mermaid.append("    %% 节点按实际执行顺序连接")
        
        return "\n".join(mermaid)