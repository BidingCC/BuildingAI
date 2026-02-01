import { Ghost } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { HttpNodeComponent } from "./http.node";
import { HttpPanelComponent } from "./http.panel";
import type { HttpBlockData } from "./http.types";

export class HttpBlock extends BlockBase<HttpBlockData> {
  constructor() {
    super({
      type: "http",
      name: "HTTP 请求",
      description: "发送 HTTP 请求到外部 API 或服务",
      category: "integration",
      icon: createElement(Ghost),
      defaultData: () => ({
        method: "GET",
        url: "",
        headers: [],
        queryParams: [],
        auth: {
          type: "none",
        },
        bodyType: "none",
        timeout: 30000,
        retries: 0,
        followRedirects: true,
        validateStatus: true,
        extractResponse: "body",
      }),
      handles: {
        target: true,
        source: true,
      },
    });
  }

  get NodeComponent() {
    return HttpNodeComponent;
  }

  get PanelComponent() {
    return HttpPanelComponent;
  }

  validate(data: HttpBlockData) {
    const errors: string[] = [];

    // 验证 URL
    if (!data.url || data.url.trim() === "") {
      errors.push("URL 不能为空");
    } else {
      // 验证 URL 格式（支持变量）
      const urlWithoutVars = data.url.replace(/\{\{[^}]+\}\}/g, "placeholder");
      try {
        // 如果不是以 http:// 或 https:// 开头，尝试添加 https://
        const testUrl = urlWithoutVars.startsWith("http")
          ? urlWithoutVars
          : `https://${urlWithoutVars}`;
        new URL(testUrl);
      } catch {
        errors.push("URL 格式不正确");
      }
    }

    // 验证请求头
    data.headers.forEach((header, index) => {
      if (header.enabled) {
        if (!header.key || header.key.trim() === "") {
          errors.push(`请求头 ${index + 1} 缺少键名`);
        }
      }
    });

    // 验证查询参数
    data.queryParams.forEach((param, index) => {
      if (param.enabled) {
        if (!param.key || param.key.trim() === "") {
          errors.push(`查询参数 ${index + 1} 缺少键名`);
        }
      }
    });

    // 验证认证配置
    if (data.auth.type === "bearer" && !data.auth.token) {
      errors.push("Bearer 认证需要提供 Token");
    }

    if (data.auth.type === "basic") {
      if (!data.auth.username) {
        errors.push("Basic 认证需要提供用户名");
      }
      if (!data.auth.password) {
        errors.push("Basic 认证需要提供密码");
      }
    }

    if (data.auth.type === "api_key") {
      if (!data.auth.apiKey) {
        errors.push("API Key 认证需要提供 API Key");
      }
      if (!data.auth.apiKeyHeader) {
        errors.push("API Key 认证需要指定 Header 名称");
      }
    }

    // 验证请求体
    if (data.bodyType !== "none") {
      if (["POST", "PUT", "PATCH"].includes(data.method)) {
        if (data.bodyType === "json" && data.body) {
          try {
            JSON.parse(data.body);
          } catch {
            errors.push("JSON 请求体格式不正确");
          }
        }
      } else {
        errors.push(`${data.method} 请求通常不应包含请求体`);
      }
    }

    // 验证超时配置
    if (data.timeout && (data.timeout < 0 || data.timeout > 300000)) {
      errors.push("超时时间必须在 0-300000 毫秒之间");
    }

    // 验证重试配置
    if (data.retries && (data.retries < 0 || data.retries > 5)) {
      errors.push("重试次数必须在 0-5 之间");
    }

    if (data.retries && data.retryDelay && data.retryDelay < 0) {
      errors.push("重试延迟不能为负数");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  transform(data: HttpBlockData): HttpBlockData {
    // 过滤禁用的请求头和参数
    const enabledHeaders = data.headers.filter((h) => h.enabled);
    const enabledParams = data.queryParams.filter((p) => p.enabled);

    return {
      ...data,
      headers: enabledHeaders,
      queryParams: enabledParams,
      // 清理未定义的可选字段
      body: data.bodyType !== "none" ? data.body : undefined,
      outputVariable: data.outputVariable || undefined,
      timeout: data.timeout || undefined,
      retries: data.retries || undefined,
      retryDelay: data.retries ? data.retryDelay : undefined,
    };
  }
}
