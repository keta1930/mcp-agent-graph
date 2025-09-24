import mag
import json

def get_mcp_template():
    """Get prompt template for AI-generated MCP"""
    mcp_gen_prompt = mag.mcp_gen_prompt()
    print("\nmcp generation prompt:\n")
    print(json.dumps(mcp_gen_prompt, ensure_ascii=False, indent=2))

    # Display template content preview
    if "template" in mcp_gen_prompt:
        print(f"\n=== Template Content Preview ===\n")
        template_content = mcp_gen_prompt["template"]
        print(template_content)

    # Display usage instructions
    if "note" in mcp_gen_prompt:
        print(f"\n=== Usage Instructions ===\n")
        print(mcp_gen_prompt["note"])


if __name__ == "__main__":
    get_mcp_template()