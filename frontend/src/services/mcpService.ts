// src/services/mcpService.ts
import api from './api';
import { MCPConfig, MCPServerConfig, MCPConfigWithVersion } from '../types/mcp';

export const getMCPConfig = async (): Promise<MCPConfigWithVersion> => {
  const response = await api.get('/mcp/config');
  return response.data;
};

export const updateMCPConfig = async (config: MCPConfig, version: number) => {
  const response = await api.post('/mcp/config', {
    config,
    version
  });
  return response.data;
};

export const addMCPServer = async (serverName: string, serverConfig: MCPServerConfig, version: number) => {
  const response = await api.post('/mcp/add', {
    mcpServers: {
      [serverName]: serverConfig
    },
    version
  });
  return response.data;
};

export const removeMCPServers = async (serverNames: string[], version: number) => {
  const response = await api.post('/mcp/remove', {
    server_names: serverNames,
    version
  });
  return response.data;
};

export const getMCPStatus = async () => {
  const response = await api.get('/mcp/status');
  return response.data;
};

export const connectServer = async (serverName: string) => {
  const response = await api.post(`/mcp/connect/${serverName}`);
  return response.data;
};

export const disconnectServer = async (serverName: string) => {
  const response = await api.post(`/mcp/disconnect/${serverName}`);
  return response.data;
};

export const getMCPTools = async () => {
  const response = await api.get('/mcp/tools');
  return response.data;
};

export const registerMCPTool = async (toolData: {
  folder_name: string;
  script_files: Record<string, string>;
  readme: string;
  dependencies: string;
  port?: number;
}) => {
  const response = await api.post('/mcp/register-tool', toolData);
  return response.data;
};

export const testMCPTool = async (serverName: string, toolName: string, params: Record<string, any>) => {
  const response = await api.post('/mcp/test-tool', {
    server_name: serverName,
    tool_name: toolName,
    params
  });
  return response.data;
};
