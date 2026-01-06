export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
}

export interface McpServerOptions {
    url: string;
    name?: string;
    description?: string;
    version?: string;
    customHeaders?: Record<string, string>;
}
