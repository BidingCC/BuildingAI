import { Globe } from "lucide-react";
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
      icon: createElement(Globe),
      defaultData: () => ({
        inputs: [],
        outputs: [
          { name: "body", type: "object", label: "响应体" },
          { name: "status", type: "number", label: "状态码" },
          { name: "headers", type: "object", label: "响应头" },
        ],
        method: "GET",
        url: "",
        headers: [],
        queryParams: [],
        auth: { type: "none" },
        bodyType: "none",
        timeout: 30000,
        retries: 0,
      }),
      handles: { target: true, source: true },
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

    if (!data.url?.trim()) {
      errors.push("URL 不能为空");
    }

    if (data.auth.type === "bearer" && !data.auth.token) {
      errors.push("Bearer 认证需要提供 Token");
    }

    if (data.auth.type === "basic") {
      if (!data.auth.username) errors.push("Basic 认证需要提供用户名");
      if (!data.auth.password) errors.push("Basic 认证需要提供密码");
    }

    return { valid: !errors.length, errors: errors.length ? errors : undefined };
  }
}
