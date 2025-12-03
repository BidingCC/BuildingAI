import { readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import type { MiddlewareInfo, ResolvedOptions } from "./types.js";

function normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
}

function splitByCase(str: string): string[] {
    return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[_\s]+/g, "-")
        .toLowerCase()
        .split("-")
        .filter(Boolean);
}

function pascalCase(parts: string[] | string): string {
    const arr = typeof parts === "string" ? splitByCase(parts) : parts;
    return arr.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

function camelCase(str: string): string {
    const pascal = pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function scanDir(dir: string, baseDir: string): string[] {
    const files: string[] = [];
    try {
        for (const entry of readdirSync(dir)) {
            const fullPath = join(dir, entry);
            try {
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    if (
                        entry !== "node_modules" &&
                        !entry.startsWith(".") &&
                        !entry.startsWith("__")
                    ) {
                        files.push(...scanDir(fullPath, baseDir));
                    }
                } else if (stat.isFile() && /\.(ts|js)$/.test(entry) && !entry.endsWith(".d.ts")) {
                    files.push(relative(baseDir, fullPath));
                }
            } catch {}
        }
    } catch {}
    return files;
}

export function scanMiddlewares(options: ResolvedOptions): MiddlewareInfo[] {
    const middlewares: MiddlewareInfo[] = [];
    const middlewareDir = resolve(options.programRoot, options.middlewareDir);
    const files = scanDir(middlewareDir, middlewareDir);
    files.sort();

    for (const file of files) {
        const filePath = join(middlewareDir, file);
        const dirNameParts = splitByCase(normalizePath(relative(middlewareDir, dirname(filePath))));
        let fileName = basename(filePath, extname(filePath));
        if (fileName.toLowerCase() === "index") {
            fileName = basename(dirname(filePath));
        }

        const fileNameParts = splitByCase(fileName);
        const middlewareNameParts: string[] = [];
        while (
            dirNameParts.length &&
            (dirNameParts[0] || "").toLowerCase() !== (fileNameParts[0] || "").toLowerCase()
        ) {
            middlewareNameParts.push(dirNameParts.shift()!);
        }

        const middlewareName = pascalCase(middlewareNameParts) + pascalCase(fileNameParts);
        const value = pascalCase(middlewareName).replace(/["']/g, "");
        const name = camelCase(value);

        if (!middlewares.find((m) => m.name === name)) {
            middlewares.push({ name, value, path: normalizePath(filePath) });
        }
    }
    return middlewares;
}
