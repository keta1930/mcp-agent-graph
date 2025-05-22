import requests
import sys
from pathlib import Path

# API地址（默认为本地服务器，可以通过命令行参数修改）
API_URL = "http://localhost:9999/api/prompt-template"

# 获取脚本所在目录，并在该目录下创建输出文件
SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "mag_prompt_template.md"

def main():
    # 检查命令行参数以覆盖默认值
    global API_URL, OUTPUT_FILE
    if len(sys.argv) > 1:
        API_URL = sys.argv[1]
    if len(sys.argv) > 2:
        # 如果用户指定了输出文件，也确保它在脚本目录下
        OUTPUT_FILE = SCRIPT_DIR / sys.argv[2]
    
    print(f"正在从 {API_URL} 获取提示词模板...")
    
    try:
        # 调用API
        response = requests.get(API_URL)
        response.raise_for_status()  # 如果响应表明请求失败，抛出异常
        
        # 从响应中提取提示词内容
        data = response.json()
        prompt_content = data.get("prompt", "")
        
        if not prompt_content:
            print("错误：API返回的提示词内容为空")
            return
        
        # 保存到文件
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(prompt_content)
        
        print(f"提示词模板已成功保存到 {OUTPUT_FILE}")
        
    except requests.exceptions.RequestException as e:
        print(f"请求错误：{e}")
    except Exception as e:
        print(f"发生错误：{e}")

if __name__ == "__main__":
    main()