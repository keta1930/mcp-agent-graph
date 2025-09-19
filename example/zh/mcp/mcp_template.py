import mag
import json

def get_mcp_template():
    """获取AI生成MCP的提示词模板"""
    mcp_gen_prompt = mag.mcp_gen_prompt()
    print("\nmcp generation prompt:\n")
    print(json.dumps(mcp_gen_prompt, ensure_ascii=False, indent=2))

    # 显示模板内容预览
    if "template" in mcp_gen_prompt:
        print(f"\n=== 模板内容预览 ===\n")
        template_content = mcp_gen_prompt["template"]
        print(template_content)

    # 显示使用说明
    if "note" in mcp_gen_prompt:
        print(f"\n=== 使用说明 ===\n")
        print(mcp_gen_prompt["note"])


if __name__ == "__main__":
    get_mcp_template()