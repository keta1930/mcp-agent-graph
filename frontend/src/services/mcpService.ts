// src/services/mcpService.ts
import api from './api';
import { MCPConfig, MCPServerConfig } from '../types/mcp';

export const getMCPConfig = async () => {
  const response = await api.get('/mcp/config');
  return response.data;
};

export const updateMCPConfig = async (config: MCPConfig) => {
  const response = await api.post('/mcp/config', config);
  return response.data;
};

export const addMCPServer = async (serverName: string, serverConfig: MCPServerConfig) => {
  const response = await api.post('/mcp/add', {
    mcpServers: {
      [serverName]: serverConfig
    }
  });
  return response.data;
};

export const removeMCPServers = async (serverNames: string[]) => {
  const response = await api.post('/mcp/remove', serverNames);
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