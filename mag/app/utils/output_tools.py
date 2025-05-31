def _parse_placeholder(placeholder: str) -> tuple:
    """
    占位符解析函数，支持三种基本模式

    Args:
        placeholder: 占位符字符串，不含括号

    Returns:
        元组：(节点名称, 获取模式, 参数n)
    """
    # 默认值
    node_name = placeholder
    mode = "latest"
    n = 1

    # 检查是否有模式指定
    if ":" in placeholder:
        parts = placeholder.split(":", 1)
        node_name = parts[0]
        mode_part = parts[1]

        # 处理模式
        if mode_part == "all":
            mode = "all"
        elif mode_part == "latest":
            mode = "latest"
        elif mode_part.startswith("latest_"):
            mode = "latest_n"
            try:
                n = int(mode_part[7:])
            except (ValueError, IndexError):
                # 如果格式不正确，使用默认值
                n = 1
    return node_name, mode, n


def _format_content_with_default_style(outputs: list) -> str:
    """
    使用默认样式格式化多轮内容，包括分隔符和适当的空行

    Args:
        outputs: 输出内容列表

    Returns:
        格式化后的字符串
    """
    if not outputs:
        return ""

    # 如果只有一条输出，直接返回
    if len(outputs) == 1:
        return outputs[0]

    # 对于多条输出，使用换行和分隔线进行格式化
    formatted_parts = []

    for i, content in enumerate(outputs):
        # 对第一项不添加分隔符
        if i > 0:
            # 添加美观的分隔符（三个破折号）
            formatted_parts.append("\n\n---\n\n")

        # 添加内容
        formatted_parts.append(content)

    return "".join(formatted_parts)