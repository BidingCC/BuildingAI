import type { Request } from "express";

export function getClientIp(req: Request): string {
    let ip = "";

    const xForwardedFor = req.headers["x-forwarded-for"];
    if (typeof xForwardedFor === "string" && xForwardedFor.length > 0) {
        // 多级代理：取第一个
        ip = xForwardedFor.split(",")[0].trim();
    } else if (Array.isArray(xForwardedFor)) {
        ip = xForwardedFor[0];
    } else if (req.headers["x-real-ip"]) {
        ip = String(req.headers["x-real-ip"]);
    } else {
        ip = req.socket.remoteAddress || "";
    }

    // 处理 IPv6 映射 IPv4
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }

    // 处理 IPv6 本地回环
    if (ip === "::1") {
        ip = "127.0.0.1";
    }

    return ip;
}
