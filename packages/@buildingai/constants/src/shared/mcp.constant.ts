/**
 * MCP服务类型枚举
 */
export enum McpServerType {
    /**
     * 用户自定义服务
     */
    USER = "user",

    /**
     * 系统内置服务
     */
    SYSTEM = "system",
}

/**
 * MCP服务通信的传输方式
 */
export enum McpCommunicationType {
    /**
     * SSE
     */
    SSE = "sse",

    /**
     * StreamableHTTP
     */
    STREAMABLEHTTP = "streamable-http",
}
