// src/types/mcp.ts
export interface MCPServerConfig {
  autoApprove: string[];
  disabled: boolean;
  timeout: number;
  command?: string;
  args: string[];
  transportType: string;
  base_url?: string;
  [key: string]: any;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPStatus {
  [serverName: string]: {
    connected: boolean;
    init_attempted: boolean;
    tools: string[];
    error?: string;
  };
}

export interface MCPTools {
  [serverName: string]: Array<{
    name: string;
    description: string;
    input_schema: any;
  }>;
}