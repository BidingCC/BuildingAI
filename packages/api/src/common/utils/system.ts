import { AppConfig } from "@buildingai/config/app.config";
import { getCachedExtensionList } from "@buildingai/core/modules";
import { TerminalLogger } from "@buildingai/logger";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { existsSync, readFileSync } from "fs";
import { networkInterfaces } from "os";
import * as path from "path";

/**
 * 启动日志
 */
export const startLog = (currentPort?: number, startTime?: number) => {
    const port = currentPort ?? process.env.SERVER_PORT ?? 4090;
    const env = process.env.NODE_ENV;
    const nets = networkInterfaces();
    const ipAddresses: string[] = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
            const isIPv4 = net.family === "IPv4" || (net.family as unknown) === 4;
            if (isIPv4 && !net.internal) {
                ipAddresses.push(net.address);
            }
        }
    }

    TerminalLogger.log("App Name", AppConfig.name);
    TerminalLogger.log("App Version", `v${AppConfig.version}`);
    TerminalLogger.log("Env", env ?? "unknown");
    TerminalLogger.log("Node Version", process.version);

    const pm2Instances = process.env.PM2_INSTANCES || "1";
    if (parseInt(pm2Instances) > 1) {
        TerminalLogger.log("PM2 Instances", pm2Instances, { color: "magenta" });
    }

    TerminalLogger.log("Local", `http://localhost:${port}`, { color: "cyan" });

    if (ipAddresses.length > 0) {
        ipAddresses.forEach((ip) => {
            TerminalLogger.log("Network", `http://${ip}:${port}`, {
                color: "cyan",
            });
        });
    }

    const duration = startTime ? Date.now() - startTime : 0;

    if (duration < 1000) {
        TerminalLogger.success("Startup Time", `${duration} ms`);
    } else if (duration < 5000) {
        TerminalLogger.info("Startup Time", `${duration} ms`);
    } else if (duration < 10000) {
        TerminalLogger.warn("Startup Time", `${duration} ms`);
    } else {
        TerminalLogger.error("Startup Time", `${duration} ms`, { icon: "⚠️" });
    }
};

/**
 * Try to listen on a port. If the port is in use, try the next one (development only).
 * @param app NestJS application instance
 * @param initialPort Initial port number
 * @param maxRetries Maximum number of retries
 * @returns Promise<void>
 */
export const tryListen = async (
    app: INestApplication,
    initialPort: number,
    maxRetries = 10,
    startTime?: number,
): Promise<void> => {
    let currentPort = initialPort;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await app.listen(currentPort);
            // Log when port is changed
            if (currentPort !== initialPort) {
                TerminalLogger.success(
                    "Port switched",
                    `Port ${initialPort} was in use, switched to port ${currentPort}`,
                );
            }
            startLog(currentPort, startTime);
            return;
        } catch (error) {
            if (error.code === "EADDRINUSE" && process.env.NODE_ENV === "development") {
                retries++;
                currentPort = initialPort + retries;
                TerminalLogger.warn(
                    "Port in use",
                    `Port ${initialPort + retries - 1} is in use, trying port ${currentPort}...`,
                );
            } else {
                // Non EADDRINUSE error or non-development environment: rethrow
                throw error;
            }
        }
    }

    throw new Error(`Unable to start server after trying ${maxRetries} ports`);
};

/**
 * Set static resource directories
 * @param app NestExpressApplication instance
 */
export const setAssetsDir = async (app: NestExpressApplication) => {
    const enabledIdentifiers = getCachedExtensionList();
    const rootDir = path.join(process.cwd(), "..", "..");

    const extensionsAssets = enabledIdentifiers.map((item) => {
        return {
            dir: path.join(rootDir, "extensions", item.identifier, "storage", "static"),
            prefix: `/${item.identifier}/static`,
        };
    });

    const extensionsUploads = enabledIdentifiers.map((item) => {
        return {
            dir: path.join(rootDir, "extensions", item.identifier, "storage", "uploads"),
            prefix: `/${item.identifier}/uploads`,
        };
    });

    const dirs: Record<string, any>[] = [
        {
            dir: path.join(rootDir, "public", "web"),
            prefix: "/",
        },
        {
            dir: path.join(rootDir, "storage", "uploads"),
            prefix: "/uploads",
        },
        {
            dir: path.join(rootDir, "storage", "static"),
            prefix: "/static",
        },
        ...extensionsAssets,
        ...extensionsUploads,
    ];

    dirs.forEach((dir) => {
        app.useStaticAssets(dir.dir, {
            prefix: dir.prefix,
        });
    });

    // extension static
    const extensionsMain = enabledIdentifiers
        .filter((item) => item.enabled)
        .map((item) => {
            return {
                dir: path.join(rootDir, "extensions", item.identifier, ".output", "public"),
                prefix: `/extension/${item.identifier}`,
            };
        });

    const extensionIndexHtmlCache = new Map<string, string>();

    extensionsMain.forEach((item) => {
        const indexPath = path.join(item.dir, "index.html");
        if (existsSync(item.dir) && existsSync(indexPath)) {
            extensionIndexHtmlCache.set(item.prefix, readFileSync(indexPath, "utf-8"));
        }
    });

    extensionsMain.forEach((item) => {
        if (existsSync(item.dir)) {
            app.useStaticAssets(item.dir, {
                prefix: item.prefix,
                index: false,
                fallthrough: true,
            });
        }
    });

    if (extensionIndexHtmlCache.size > 0) {
        app.use((req: Request, res: Response, next: NextFunction) => {
            const matchedPrefix = Array.from(extensionIndexHtmlCache.keys()).find(
                (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
            );

            if (matchedPrefix && !res.headersSent) {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                return res.send(extensionIndexHtmlCache.get(matchedPrefix)!);
            }

            next();
        });
    }
};
