/**
 * HttpBlock 类型定义
 */

import type { InputVariable } from "../../types/variable.types";

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: "none" | "bearer" | "basic" | "api_key";
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface HttpBlockData {
  inputs: InputVariable[];
  outputs: InputVariable[];
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  auth: AuthConfig;
  bodyType: "none" | "json" | "form" | "raw";
  body?: string;
  timeout: number;
  retries: number;
}
