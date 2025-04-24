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
  fetchTools: () => Promise<void>;
  connectAllServers: () => Promise<{ success: string[], failed: string[] }>;

  // Helper methods for server management
  addServer: (serverName: string, serverConfig: MCPServerConfig) => Promise<void>;
  updateServer: (serverName: string, serverConfig: MCPServerConfig) => Promise<void>;
  deleteServer: (serverName: string) => Promise<void>;
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
    }
  },

  connectAllServers: async () => {
    try {
      set({ loading: true, error: undefined });
      const { config } = get();
      const serverNames = Object.keys(config.mcpServers);

      // Filter out disabled servers and already connected servers
      const enabledServers = serverNames.filter(name => {
        const server = config.mcpServers[name];
        const serverStatus = get().status[name];
        return !server.disabled && (!serverStatus || !serverStatus.connected);
      });

      // Track successes and failures
      const results = {
        success: [] as string[],
        failed: [] as string[]
      };

      // Connect servers sequentially
      for (const serverName of enabledServers) {
        try {
          await mcpService.connectServer(serverName);
          results.success.push(serverName);
        } catch (error) {
          results.failed.push(serverName);
        }
      }

      // Update status after connecting
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

  // Helper methods
  addServer: async (serverName, serverConfig) => {
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
    const { config, updateConfig } = get();
    const newMcpServers = { ...config.mcpServers };
    delete newMcpServers[serverName];
    const newConfig = {
      ...config,
      mcpServers: newMcpServers
    };
    await updateConfig(newConfig);
  },
}));