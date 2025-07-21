import logging
import re
from typing import Dict, Any, List
from pathlib import Path
from app.core.file_manager import FileManager

logger = logging.getLogger(__name__)


class MCPAIGenerator:
    """MCP AI工具生成器 - 专门负责AI生成MCP工具的功能"""

    def __init__(self):
        pass

    def get_used_ports(self, mcp_config: Dict[str, Any] = None) -> List[int]:
        """
        获取已使用的端口列表
        
        Args:
            mcp_config: MCP配置，如果为None则从文件加载
            
        Returns:
            已使用的端口列表
        """
        ports = []
        try:
            if mcp_config is None:
                mcp_config = FileManager.load_mcp_config()
                
            for server_name, server_config in mcp_config.get("mcpServers", {}).items():
                url = server_config.get("url")
                if url:
                    # 解析URL中的端口
                    port_match = re.search(r':(\d+)', url)
                    if port_match:
                        ports.append(int(port_match.group(1)))
        except Exception as e:
            logger.error(f"获取已使用端口时出错: {str(e)}")
        
        return sorted(list(set(ports)))

    async def get_mcp_generator_template(self, requirement: str, all_tools_data: Dict[str, List[Dict]] = None) -> str:
        """
        获取MCP生成器的提示词模板
        
        Args:
            requirement: 用户需求
            all_tools_data: 所有工具数据，如果为None则需要外部提供
            
        Returns:
            生成的提示词模板
        """
        try:
            # 1. 读取模板文件
            current_file_dir = Path(__file__).parent.parent.parent
            template_path = current_file_dir / "templates" / "mcp_generator_template.md"
            
            if not template_path.exists():
                raise FileNotFoundError("找不到MCP生成器模板文件")
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # 2. 处理工具描述
            tools_description = ""
            
            if not all_tools_data:
                tools_description = "当前没有可用的MCP工具。\n\n"
            else:
                tools_description += "# 现有工具列表\n\n"
                
                for server_name, tools in all_tools_data.items():
                    if tools:
                        tools_description += f"## 服务：{server_name}\n\n"
                        for tool in tools:
                            tool_name = tool.get("name", "未知工具")
                            tool_desc = tool.get("description", "无描述")
                            tools_description += f"- **{tool_name}**：{tool_desc}\n"
                        tools_description += "\n"
            
            # 3. 获取已使用的端口
            used_ports = self.get_used_ports()
            ports_description = ", ".join(map(str, used_ports)) if used_ports else "无"
            
            # 4. 替换模板中的占位符
            final_prompt = template_content.replace("{REQUIREMENT}", requirement)
            final_prompt = final_prompt.replace("{TOOLS_DESCRIPTION}", tools_description)
            final_prompt = final_prompt.replace("{PORTS}", ports_description)
            
            return final_prompt
            
        except Exception as e:
            logger.error(f"生成MCP生成器模板时出错: {str(e)}")
            raise

    def parse_mcp_xml_response(self, xml_content: str) -> Dict[str, Any]:
        """
        解析MCP生成响应中的XML内容
        
        Args:
            xml_content: XML内容
            
        Returns:
            解析结果
        """
        result = {
            "success": False,
            "error": None,
            "folder_name": None,
            "script_files": {},
            "readme": None,
            "dependencies": None,
            "port": None  # 新增：端口号
        }
        
        try:
            # 解析folder_name
            folder_match = re.search(r'<folder_name>(.*?)</folder_name>', xml_content, re.DOTALL)
            if folder_match:
                result["folder_name"] = folder_match.group(1).strip()
            
            # 解析dependencies
            deps_match = re.search(r'<dependencies>(.*?)</dependencies>', xml_content, re.DOTALL)
            if deps_match:
                result["dependencies"] = deps_match.group(1).strip()
            
            # 解析readme
            readme_match = re.search(r'<readme>(.*?)</readme>', xml_content, re.DOTALL)
            if readme_match:
                result["readme"] = readme_match.group(1).strip()
            
            # 解析端口号
            port_match = re.search(r'<port>(.*?)</port>', xml_content, re.DOTALL)
            if port_match:
                try:
                    port_str = port_match.group(1).strip()
                    result["port"] = int(port_str)
                except ValueError:
                    logger.warning(f"无法解析端口号: {port_str}")
            
            # 解析脚本文件（支持单个和多个脚本）
            # 先尝试单个脚本格式
            script_name_match = re.search(r'<script_name>(.*?)</script_name>', xml_content, re.DOTALL)
            code_match = re.search(r'<code>(.*?)</code>', xml_content, re.DOTALL)
            
            if script_name_match and code_match:
                script_name = script_name_match.group(1).strip()
                code_content = code_match.group(1).strip()
                result["script_files"][script_name] = code_content
            
            # 再尝试多个脚本格式
            script_pattern = r'<script_name(\d+)>(.*?)</script_name\1>.*?<code\1>(.*?)</code\1>'
            script_matches = re.findall(script_pattern, xml_content, re.DOTALL)
            
            for num, script_name, code_content in script_matches:
                script_name = script_name.strip()
                code_content = code_content.strip()
                result["script_files"][script_name] = code_content
            
            # 验证必要字段
            if not result["folder_name"]:
                result["error"] = "缺少folder_name"
                return result
            
            if not result["script_files"]:
                result["error"] = "未找到有效的脚本文件"
                return result
            
            # 端口号验证
            if result["port"] is None:
                result["error"] = "缺少端口号"
                return result
            
            if not (8001 <= result["port"] <= 9099):
                result["error"] = f"端口号 {result['port']} 不在有效范围内 (8001-9099)"
                return result
            
            # 检查端口是否已被占用
            used_ports = self.get_used_ports()
            if result["port"] in used_ports:
                result["error"] = f"端口 {result['port']} 已被占用"
                return result
            
            result["success"] = True
            return result
            
        except Exception as e:
            result["error"] = f"解析XML时出错: {str(e)}"
            return result

    async def generate_mcp_tool(self, requirement: str, model_name: str, model_service, all_tools_data: Dict[str, List[Dict]] = None) -> Dict[str, Any]:
        """
        AI生成MCP工具
        
        Args:
            requirement: 用户需求
            model_name: 模型名称
            model_service: 模型服务实例
            all_tools_data: 所有工具数据
            
        Returns:
            生成结果
        """
        try:
            # 1. 验证模型是否存在
            model_config = model_service.get_model(model_name)
            if not model_config:
                return {
                    "status": "error",
                    "error": f"找不到模型 '{model_name}'"
                }
            
            # 2. 获取提示词模板
            prompt = await self.get_mcp_generator_template(requirement, all_tools_data)
            
            # 3. 调用模型生成
            messages = [{"role": "user", "content": prompt}]
            
            model_response = await model_service.call_model(
                model_name=model_name,
                messages=messages
            )
            
            if model_response.get("status") != "success":
                return {
                    "status": "error",
                    "error": f"模型调用失败: {model_response.get('error', '未知错误')}"
                }
            
            # 4. 解析模型输出
            model_output = model_response.get("content", "")
            parsed_result = self.parse_mcp_xml_response(model_output)
            
            if not parsed_result["success"]:
                return {
                    "status": "error",
                    "error": f"解析模型输出失败: {parsed_result.get('error', '未知错误')}",
                    "model_output": model_output
                }
            
            # 5. 检查工具名称冲突
            folder_name = parsed_result["folder_name"]
            if FileManager.mcp_tool_exists(folder_name):
                # 生成新的名称
                base_name = folder_name
                counter = 1
                while FileManager.mcp_tool_exists(folder_name):
                    folder_name = f"{base_name}_{counter}"
                    counter += 1
                parsed_result["folder_name"] = folder_name
            
            # 6. 创建MCP工具
            success = FileManager.create_mcp_tool(
                folder_name,
                parsed_result["script_files"],
                parsed_result["readme"] or "# MCP Tool\n\nAI生成的MCP工具",
                parsed_result["dependencies"] or ""
            )
            
            if not success:
                return {
                    "status": "error",
                    "error": "创建MCP工具文件失败"
                }
            
            return {
                "status": "success",
                "message": f"MCP工具 '{folder_name}' 生成成功",
                "tool_name": folder_name,
                "folder_name": folder_name,
                "port": parsed_result["port"],
                "model_output": model_output
            }
            
        except Exception as e:
            logger.error(f"生成MCP工具时出错: {str(e)}")
            return {
                "status": "error",
                "error": f"生成MCP工具时出错: {str(e)}"
            }

    async def generate_and_register_mcp_tool(self, requirement: str, model_name: str, model_service, 
                                           all_tools_data: Dict[str, List[Dict]] = None,
                                           update_config_func=None) -> Dict[str, Any]:
        """
        AI生成MCP工具并自动注册到配置
        
        Args:
            requirement: 用户需求
            model_name: 模型名称
            model_service: 模型服务实例
            all_tools_data: 所有工具数据
            update_config_func: 配置更新函数
            
        Returns:
            生成和注册结果
        """
        try:
            # 1. 生成MCP工具
            result = await self.generate_mcp_tool(
                requirement, model_name, model_service, all_tools_data
            )
            
            # 2. 如果生成成功，自动注册到配置
            if result.get("status") == "success":
                folder_name = result["folder_name"]
                port = result["port"]
                
                # 验证端口号
                if port is None:
                    logger.error("生成的工具缺少端口号")
                    FileManager.delete_mcp_tool(folder_name)
                    return {
                        "status": "error",
                        "error": "生成的工具缺少端口号"
                    }
                
                # 注册到配置
                if update_config_func:
                    register_success = await self.register_ai_mcp_tool(
                        folder_name, port, update_config_func
                    )
                    
                    if not register_success:
                        # 注册失败，清理文件
                        FileManager.delete_mcp_tool(folder_name)
                        return {
                            "status": "error",
                            "error": "注册MCP工具到配置失败"
                        }
                else:
                    logger.warning("未提供配置更新函数，跳过自动注册")
                    result["warning"] = "工具已生成但未自动注册到配置"
            
            return result
            
        except Exception as e:
            logger.error(f"生成并注册MCP工具时出错: {str(e)}")
            return {
                "status": "error",
                "error": f"生成工具失败: {str(e)}"
            }

    async def register_ai_mcp_tool(self, tool_name: str, port: int, update_config_func) -> bool:
        """
        注册AI生成的MCP工具到配置
        
        Args:
            tool_name: 工具名称
            port: 端口号
            update_config_func: 配置更新函数
            
        Returns:
            是否注册成功
        """
        try:
            # 再次验证端口未被占用（双重检查）
            used_ports = self.get_used_ports()
            if port in used_ports:
                logger.error(f"端口 {port} 已被占用，无法注册工具 {tool_name}")
                return False
            
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()
            
            # 添加新的MCP服务器配置
            current_config.setdefault("mcpServers", {})[tool_name] = {
                "transportType": "streamable_http",
                "url": f"http://localhost:{port}/mcp",
                "ai_generated": True  # 标记为AI生成的工具
            }
            
            # 保存配置
            success = await update_config_func(current_config)
            if success.get("status", {}).get("message"):
                logger.info(f"成功注册AI生成的MCP工具: {tool_name} (端口: {port})")
                return True
            else:
                logger.error(f"注册MCP工具失败: {success}")
                return False
                
        except Exception as e:
            logger.error(f"注册AI生成的MCP工具时出错: {str(e)}")
            return False

    async def unregister_ai_mcp_tool(self, tool_name: str, update_config_func) -> bool:
        """
        从配置中注销AI生成的MCP工具
        
        Args:
            tool_name: 工具名称
            update_config_func: 配置更新函数
            
        Returns:
            是否注销成功
        """
        try:
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()
            
            # 删除MCP服务器配置
            if tool_name in current_config.get("mcpServers", {}):
                del current_config["mcpServers"][tool_name]
                
                # 保存配置
                success = await update_config_func(current_config)
                if success.get("status", {}).get("message"):
                    logger.info(f"成功注销AI生成的MCP工具: {tool_name}")
                    return True
                else:
                    logger.error(f"注销MCP工具失败: {success}")
                    return False
            else:
                logger.warning(f"MCP工具 {tool_name} 在配置中不存在")
                return True
                
        except Exception as e:
            logger.error(f"注销AI生成的MCP工具时出错: {str(e)}")
            return False