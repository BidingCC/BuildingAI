import type { Request } from "express";

class RequestUtil {
    /**
     * Extract request domain from request
     *
     * @param request Express request object
     * @returns Request domain (format: protocol://host)
     */
    static getRequestDomain(request: Request): string | undefined {
        try {
            // Get protocol, prioritize proxy headers (X-Forwarded-Proto)
            let protocol =
                request.get("x-forwarded-proto") ||
                request.headers?.["x-forwarded-proto"] ||
                request.protocol ||
                "http";

            // Handle multiple protocol values (comma-separated), take the first one
            if (typeof protocol === "string" && protocol.includes(",")) {
                protocol = protocol.split(",")[0].trim();
            }

            // Get host (including port), prioritize proxy headers (X-Forwarded-Host)
            let host =
                request.get("x-forwarded-host") ||
                request.headers?.["x-forwarded-host"] ||
                request.get("host") ||
                request.headers?.host;

            if (!host) {
                return undefined;
            }

            // Convert to string if it's an array
            if (Array.isArray(host)) {
                host = host[0];
            }

            // Ensure host is a string
            if (typeof host !== "string") {
                return undefined;
            }

            // Handle multiple host values (comma-separated), take the first one
            if (host.includes(",")) {
                host = host.split(",")[0].trim();
            }

            // Force https for production domains (non-localhost/IP without port)
            const isProductionDomain =
                !host.includes("localhost") &&
                !host.includes("127.0.0.1") &&
                !host.match(/^\d+\.\d+\.\d+\.\d+/) &&
                !host.includes(":");

            if (isProductionDomain && protocol !== "https") {
                protocol = "https";
            } else {
                // Ensure protocol is http or https
                protocol = protocol === "https" ? "https" : "http";
            }

            // Check port and correct protocol based on port
            if (host.includes(":443")) {
                protocol = "https";
            } else if (host.includes(":80")) {
                protocol = "http";
            }

            // Remove default ports (http:80, https:443)
            host = this.normalizeHost(host, protocol);

            // Handle localhost/127.0.0.1 addresses
            if (host.includes("127.0.0.1") || host.includes("localhost")) {
                console.warn(
                    `[FileUpload] Detected internal address (${host}), attempting to resolve from referer or environment variable`,
                );

                // Try to extract from referer header
                const referer = request.get("referer") || request.headers?.referer;
                if (referer && typeof referer === "string") {
                    try {
                        const refererUrl = new URL(referer);
                        const refererHost = refererUrl.host;

                        // Validate referer host is not also localhost
                        if (
                            !refererHost.includes("127.0.0.1") &&
                            !refererHost.includes("localhost")
                        ) {
                            host = refererHost;
                            protocol = refererUrl.protocol.replace(":", "") as "http" | "https";
                            console.log(
                                `[FileUpload] Resolved domain from referer: ${protocol}://${host}`,
                            );
                        }
                    } catch (_error) {
                        console.warn(`[FileUpload] Failed to parse referer: ${referer}`);
                    }
                }

                // If still localhost, fallback to APP_DOMAIN environment variable
                if (host.includes("127.0.0.1") || host.includes("localhost")) {
                    const appDomain = process.env.APP_DOMAIN;
                    if (appDomain) {
                        try {
                            const domainUrl = new URL(
                                appDomain.startsWith("http") ? appDomain : `https://${appDomain}`,
                            );
                            host = domainUrl.host;
                            protocol = domainUrl.protocol.replace(":", "") as "http" | "https";
                            console.log(
                                `[FileUpload] Using APP_DOMAIN from environment: ${protocol}://${host}`,
                            );
                        } catch {
                            console.error(
                                `[FileUpload] Invalid APP_DOMAIN format: ${appDomain}. Using localhost as fallback.`,
                            );
                        }
                    } else {
                        console.error(
                            `[FileUpload] No APP_DOMAIN configured. File URLs will use localhost and may be inaccessible externally.`,
                        );
                    }
                }
            }

            const result = `${protocol}://${host}`;

            return result;
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    /**
     * Normalize host by removing default ports
     *
     * @param host Host name (may include port)
     * @param protocol Protocol
     * @returns Normalized host name
     */
    static normalizeHost(host: string, protocol: string): string {
        // Use regex to remove default ports
        const normalizedHost =
            protocol === "https"
                ? host.replace(/:443$/, "") // Remove https :443
                : host.replace(/:80$/, ""); // Remove http :80

        // Debug log
        if (normalizedHost !== host) {
            console.log(`[FileUpload] Port normalized: ${host} -> ${normalizedHost}`);
        }

        return normalizedHost;
    }

    /**
     * Extract client IP from request
     *
     * @param request Express request object
     * @returns Client IP address
     */
    static getClientIP(request: Request) {
        // Check x-forwarded-for header (real IP behind proxy)
        const xForwardedFor = request.headers["x-forwarded-for"] as string;
        if (xForwardedFor) {
            const ips = xForwardedFor.split(",").map((ip) => ip.trim());
            const clientIP = ips[0];
            if (clientIP) {
                return clientIP.startsWith("::ffff:") ? clientIP.substring(7) : clientIP;
            }
        }

        // Use connection address
        const remoteAddress = request.socket?.remoteAddress || request.ip;
        return remoteAddress?.startsWith("::ffff:")
            ? remoteAddress.substring(7)
            : remoteAddress || "unknown";
    }

    /**
     * Extract uploader ID from request
     *
     * @param request Express request object
     * @returns Uploader ID or null
     */
    static getUploaderId(request: Request): string | null {
        const user = (request as any).user;
        return user?.id || null;
    }

    /**
     * Extract extension ID from request path
     *
     * Plugin path format: /extensionId/api/xxx or /extensionId/consoleapi/xxx
     * Main app path format: /api/xxx or /consoleapi/xxx
     *
     * @param request Express request object
     * @returns Extension ID or undefined if main app
     */
    static getExtensionIdFromPath(request: Request): string | undefined {
        try {
            const path = request.originalUrl || request.url || "";
            // Match pattern: /extensionId/api/... or /extensionId/consoleapi/...
            const match = path.match(/^\/([^/]+)\/(api|consoleapi)\//);

            if (match && match[1]) {
                const potentialExtensionId = match[1];
                // Exclude main app paths (api, consoleapi themselves)
                if (potentialExtensionId !== "api" && potentialExtensionId !== "consoleapi") {
                    return potentialExtensionId;
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Get effective extension ID from options or request path
     *
     * @param request Express request object
     * @param providedExtensionId Explicitly provided extension ID
     * @returns Extension ID or undefined
     */
    static getEffectiveExtensionId(
        request: Request,
        providedExtensionId?: string,
    ): string | undefined {
        // Explicit extensionId takes priority
        if (providedExtensionId) {
            return providedExtensionId;
        }
        // Try to extract from request path
        return this.getExtensionIdFromPath(request);
    }
}

export { RequestUtil };
