/**
 * HTTP 请求方法
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/**
 * 认证类型
 */
export type AuthType = "none" | "bearer" | "basic" | "api_key";

/**
 * 请求头
 */
export interface HttpHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * 查询参数
 */
export interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * 认证配置
 */
export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

/**
 * 请求体类型
 */
export type BodyType = "none" | "json" | "form" | "text" | "xml";

/**
 * HTTP Block 数据结构
 */
export interface HttpBlockData {
  // 基础配置
  method: HttpMethod;
  url: string;
  
  // 请求头
  headers: HttpHeader[];
  
  // 查询参数
  queryParams: QueryParam[];
  
  // 认证配置
  auth: AuthConfig;
  
  // 请求体
  bodyType: BodyType;
  body?: string;
  
  // 超时配置（毫秒）
  timeout?: number;
  
  // 重试配置
  retries?: number;
  retryDelay?: number;
  
  // 响应处理
  followRedirects?: boolean;
  validateStatus?: boolean;
  
  // 输出配置
  outputVariable?: string;
  extractResponse?: "full" | "body" | "headers" | "status";
}

/**
 * HTTP 方法显示配置
 */
export const HTTP_METHODS: Array<{ value: HttpMethod; label: string; color: string }> = [
  { value: "GET", label: "GET", color: "bg-green-100 text-green-700" },
  { value: "POST", label: "POST", color: "bg-blue-100 text-blue-700" },
  { value: "PUT", label: "PUT", color: "bg-yellow-100 text-yellow-700" },
  { value: "DELETE", label: "DELETE", color: "bg-red-100 text-red-700" },
  { value: "PATCH", label: "PATCH", color: "bg-purple-100 text-purple-700" },
  { value: "HEAD", label: "HEAD", color: "bg-gray-100 text-gray-700" },
  { value: "OPTIONS", label: "OPTIONS", color: "bg-gray-100 text-gray-700" },
];

/**
 * 认证类型显示名称
 */
export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: "无认证",
  bearer: "Bearer Token",
  basic: "Basic Auth",
  api_key: "API Key",
};
