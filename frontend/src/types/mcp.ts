// src/types/mcp.ts
export interface MCPServerConfig {
  autoApprove: string[];
  disabled: boolean;
  timeout: number;
  command?: string;
  args: string[];
  transportType: 'stdio' | 'sse' | 'streamable_http'; // 明确支持的类型
  url?: string; // SSE URL or HTTP URL
  base_url?: string;
  env?: Record<string, string>;
  [key: string]: any;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPConfigWithVersion {
  mcpServers: Record<string, MCPServerConfig>;
  version: number;
  updated_at?: string;
}

export interface MCPStatus {
  [serverName: string]: {
    connected: boolean;
    init_attempted: boolean;
    tools: string[];
    error?: string;
    transport_type?: string;
  };
}

export interface MCPTools {
  [serverName: string]: Array<{
    name: string;
    description: string;
    input_schema: any;
  }>;
}