import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { McpServerOptions, MCPTool } from "./type";

export class McpServerSSE {
    protected client: Client;
    protected transport: SSEClientTransport;
    private tools: MCPTool[] = [];
    public readonly options: McpServerOptions;
    private isConnected: boolean = false;

    constructor(options: McpServerOptions) {
        this.options = options;
        // Initialize MCP transport layer with custom headers support
        this.transport = new SSEClientTransport(new URL(options.url), {
            requestInit: {
                headers: options.customHeaders || {},
            },
        });

        // Initialize MCP client
        this.client = new Client(
            {
                name: "buildingai-mcp-client",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            },
        );
    }

    /**
     * Connect to MCP server
     */
    async connect(): Promise<void> {
        try {
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log(`✅ MCP SSE 连接成功: ${this.options.url}`);
        } catch (error) {
            this.isConnected = false;
            console.error(`❌ MCP SSE 连接失败: ${this.options.url}`, error);
            throw error;
        }
    }

    /**
     * Get MCP tools list
     */
    async getToolsList(): Promise<MCPTool[]> {
        try {
            const response = await this.client.listTools();

            this.tools = response.tools.map((tool: any) => ({
                name: tool.name,
                description: tool.description || "",
                inputSchema: tool.inputSchema,
            }));

            return this.tools;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Call MCP tool with auto-reconnect on connection failure
     */
    async callTool(name: string, arguments_: any): Promise<any> {
        try {
            // Check if connection is still valid
            if (!this.isConnected) {
                console.warn(`⚠️  MCP 连接已断开，尝试重新连接: ${this.options.url}`);
                await this.reconnect();
            }

            const response = await this.client.callTool({
                name: name,
                arguments: arguments_,
            });

            return response;
        } catch (error: unknown) {
            // Type guard for error with message property
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Check if error is connection-related
            const isConnectionError =
                errorMessage.includes("connect") ||
                errorMessage.includes("timeout") ||
                errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("ENOTFOUND");

            if (isConnectionError) {
                console.warn(`⚠️  MCP 工具调用失败，可能是连接问题，尝试重连: ${name}`);
                this.isConnected = false;

                try {
                    await this.reconnect();
                    // Retry the tool call after reconnection
                    const response = await this.client.callTool({
                        name: name,
                        arguments: arguments_,
                    });
                    return response;
                } catch (retryError) {
                    console.error(`❌ 重连后仍然失败: ${name}`, retryError);
                    throw retryError;
                }
            }

            console.error(`❌ MCP 工具调用失败: ${name}`, error);
            throw error;
        }
    }

    /**
     * Reconnect to MCP server
     */
    private async reconnect(): Promise<void> {
        try {
            console.log(`🔄 正在重新连接 MCP 服务器: ${this.options.url}`);

            // Close existing connection if any
            try {
                await this.client.close();
            } catch (closeError) {
                console.error(closeError);
                // Ignore close errors
            }

            // Create new transport and client
            this.transport = new SSEClientTransport(new URL(this.options.url), {
                requestInit: {
                    headers: this.options.customHeaders || {},
                },
            });

            this.client = new Client(
                {
                    name: "buildingai-mcp-client",
                    version: "1.0.0",
                },
                {
                    capabilities: {
                        tools: {},
                        resources: {},
                    },
                },
            );

            // Reconnect
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log(`✅ MCP 重新连接成功: ${this.options.url}`);
        } catch (error) {
            this.isConnected = false;
            console.error(`❌ MCP 重新连接失败: ${this.options.url}`, error);
            throw error;
        }
    }

    /**
     * Disconnect from server
     */
    async disconnect(): Promise<void> {
        try {
            await this.client.close();
            this.isConnected = false;
            console.log(`🔌 MCP 连接已断开: ${this.options.url}`);
        } catch (error) {
            this.isConnected = false;
            console.error(`⚠️  MCP 断开连接时出错: ${this.options.url}`, error);
            throw error;
        }
    }
}
