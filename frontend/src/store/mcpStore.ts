// src/store/mcpStore.ts
import { create } from 'zustand';
import { MCPConfig, MCPServerConfig } from '../types/mcp';
import * as mcpService from '../services/mcpService';

interface MCPState {
  config: MCPConfig;
  status: Record<string, any>;
  tools: Record<string, any[]>;
  loading: boolean;
  error?: string;

  fetchConfig: () => Promise<void>;
  updateConfig: (config: MCPConfig) => Promise<void>;
  fetchStatus: () => Promise<void>;
  connectServer: (serverName: string) => Promise<void>;
  disconnectServer: (serverName: string) => Promise<void>;
  fetchTools: () => Promise<void>;
  connectAllServers: () => Promise<{ success: string[], failed: string[] }>;

  // Helper methods for server management
  addServer: (serverName: string, serverConfig: MCPServerConfig) => Promise<void>;
  updateServer: (serverName: string, serverConfig: MCPServerConfig) => Promise<void>;
  deleteServer: (serverName: string) => Promise<void>;

  // Tool-related methods
  registerMCPTool: (toolData: any) => Promise<void>;
  testTool: (serverName: string, toolName: string, params: Record<string, any>) => Promise<any>;
  getUsedPorts: () => number[];
}

export const useMCPStore = create<MCPState>((set, get) => ({
  config: { mcpServers: {} },
  status: {},
  tools: {},
  loading: false,
  error: undefined,

  fetchConfig: async () => {
    try {
      set({ loading: true, error: undefined });
      const config = await mcpService.getMCPConfig();
      set({ config, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch MCP config'
      });
    }
  },

  updateConfig: async (config) => {
    try {
      set({ loading: true, error: undefined });
      await mcpService.updateMCPConfig(config);
      set({ config, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update MCP config'
      });
      throw error;
    }
  },

  fetchStatus: async () => {
    try {
      set({ loading: true, error: undefined });
      const status = await mcpService.getMCPStatus();
      set({ status, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch server status'
      });
    }
  },

  connectServer: async (serverName) => {
    try {
      set({ loading: true, error: undefined });
      await mcpService.connectServer(serverName);
      // Update status after connect
      await get().fetchStatus();
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to connect server ${serverName}`
      });
      throw error;
    }
  },

  disconnectServer: async (serverName) => {
    try {
      set({ loading: true, error: undefined });
      await mcpService.disconnectServer(serverName);
      await get().fetchStatus();
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to disconnect server ${serverName}`
      });
      throw error;
    }
  },

  connectAllServers: async () => {
    try {
      set({ loading: true, error: undefined });
      const { config } = get();
      const serverNames = Object.keys(config.mcpServers);

      const enabledServers = serverNames.filter(name => {
        const server = config.mcpServers[name];
        const serverStatus = get().status[name];
        return !server.disabled && (!serverStatus || !serverStatus.connected);
      });

      const results = {
        success: [] as string[],
        failed: [] as string[]
      };

      for (const serverName of enabledServers) {
        try {
          await mcpService.connectServer(serverName);
          results.success.push(serverName);
        } catch (error) {
          results.failed.push(serverName);
        }
      }

      await get().fetchStatus();

      set({ loading: false });
      return results;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect servers'
      });
      throw error;
    }
  },

  fetchTools: async () => {
    try {
      set({ loading: true, error: undefined });
      const tools = await mcpService.getMCPTools();
      set({ tools, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch MCP tools'
      });
    }
  },

  addServer: async (serverName, serverConfig) => {
    await mcpService.addMCPServer(serverName, serverConfig);
    await get().fetchConfig();
  },

  updateServer: async (serverName, serverConfig) => {
    const { config, updateConfig } = get();
    const newConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: serverConfig
      }
    };
    await updateConfig(newConfig);
  },

  deleteServer: async (serverName) => {
    await mcpService.removeMCPServers([serverName]);
    await get().fetchConfig();
  },

  registerMCPTool: async (toolData) => {
    try {
      set({ loading: true, error: undefined });
      await mcpService.registerMCPTool(toolData);
      await get().fetchConfig();
      await get().fetchStatus();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to register MCP tool'
      });
      throw error;
    }
  },

  testTool: async (serverName, toolName, params) => {
    try {
      return await mcpService.testMCPTool(serverName, toolName, params);
    } catch (error) {
      throw error;
    }
  },

  getUsedPorts: () => {
    const { config } = get();
    const ports: number[] = [];
    
    Object.values(config.mcpServers).forEach(server => {
      if (server.url) {
        const match = server.url.match(/:(\d+)/);
        if (match) {
          ports.push(parseInt(match[1]));
        }
      }
    });
    
    return [...new Set(ports)].sort((a, b) => a - b);
  },
}));
