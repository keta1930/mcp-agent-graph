import requests
from bs4 import BeautifulSoup
from fastmcp import FastMCP
import re

mcp = FastMCP(
    name="ArxivSearchAssistant",
    instructions="此服务器提供arXiv论文搜索功能。使用search_arxiv()来搜索论文。"
)

@mcp.tool()
def search_arxiv(query: str) -> str:
    """
    search paper from arxiv
    """

    search_type = "title"
    order = ""  
    size = 50  
    
    # 构建搜索URL
    url = f"https://arxiv.org/search/?query={query}&searchtype={search_type}&abstracts=show&order={order}&size={size}"
    try:
        # 发送请求
        response = requests.get(url)
        response.raise_for_status()
        
        # 解析结果
        results = parse_results(response.text)
        
        # 格式化结果
        return format_results(results, query, url)
    except requests.RequestException as e:
        return f"请求失败: {e}"

def parse_results(html_content):
    """解析搜索结果"""
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, 'html.parser')
    results = []

    for idx, item in enumerate(soup.select('li.arxiv-result'), 1):
        try:
            # 提取论文ID和链接
            arxiv_id_element = item.select_one('p.list-title a')
            arxiv_id = arxiv_id_element.text.strip() if arxiv_id_element else "未知ID"

            # 提取PDF链接
            pdf_link_element = item.select_one('p.list-title span a[href*=pdf]')
            pdf_link = pdf_link_element['href'] if pdf_link_element else ""

            # 提取标题
            title_element = item.select_one('p.title')
            title = title_element.text.strip() if title_element else "未知标题"

            # 提取作者
            authors_element = item.select_one('p.authors')
            authors = authors_element.text.replace("Authors:", "").strip() if authors_element else "未知作者"

            # 提取摘要
            abstract_element = item.select_one('span.abstract-full')
            abstract = abstract_element.text.strip() if abstract_element else "无摘要"

            # 提取提交日期
            date_element = item.select_one('p.is-size-7')
            date_info = date_element.text.strip() if date_element else "未知日期"

            result = {
                'id': idx,
                'arxiv_id': arxiv_id,
                'pdf_link': pdf_link,
                'title': title,
                'authors': authors,
                'abstract': abstract,
                'date_info': date_info
            }

            results.append(result)

        except Exception as e:
            # 跳过错误项
            continue

    return results

def format_results(results, query, url):
    """将结果格式化为字符串，只显示前10个结果"""
    if not results:
        return "未找到结果"

    # 只保留前10个结果
    results_to_show = results[:10]
    
    output = [f"arXiv搜索结果 - 关键词: {query}"]
    output.append(f"搜索URL: {url}")
    output.append(f"找到 {len(results)} 条结果，显示前 {len(results_to_show)} 条\n")

    for result in results_to_show:
        arxiv_id = result['arxiv_id'].replace("arXiv:", "")
        
        output.append(f"--- 结果 {result['id']} ---")
        output.append(f"标题: {result['title']}")
        output.append(f"作者: {result['authors']}")
        output.append(f"摘要: {result['abstract']}")
        output.append(f"日期信息: {result['date_info']}")
        output.append(f"arXiv ID: {arxiv_id}")
        output.append(f"PDF链接: {result['pdf_link']}")
        output.append("")  # 空行分隔

    return "\n".join(output)

if __name__ == "__main__":
    mcp.run(transport="stdio") 