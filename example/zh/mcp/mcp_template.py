import mag
import json

def get_mcp_template():
    """获取AI生成MCP的提示词模板"""
    template_data = mag.mcp_template()
    print("\nmcp template data:\n")
    print(json.dumps(template_data, ensure_ascii=False, indent=2))

    # 显示模板内容预览
    if "template" in template_data:
        print(f"\n=== 模板内容预览 ===\n")
        template_content = template_data["template"]
        print(template_content)

    # 显示使用说明
    if "note" in template_data:
        print(f"\n=== 使用说明 ===\n")
        print(template_data["note"])


if __name__ == "__main__":
    get_mcp_template()