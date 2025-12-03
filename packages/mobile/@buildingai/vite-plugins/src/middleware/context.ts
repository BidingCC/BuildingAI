import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ResolvedConfig } from "vite";

import { scanMiddlewares } from "./scan.js";
import type { MiddlewareInfo, ResolvedOptions } from "./types.js";

interface PagesJson {
    middleware?: string[];
    pages?: Array<{ path: string; middleware?: string[] }>;
    subPackages?: Array<{ root: string; pages?: Array<{ path: string; middleware?: string[] }> }>;
}

function parseJsonc(content: string): any {
    const withoutComments = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, "$1"));
}

export class MiddlewareContext {
    options: ResolvedOptions;
    config!: ResolvedConfig;
    middlewares: MiddlewareInfo[] = [];
    pagesJson: PagesJson = {};

    constructor(options: ResolvedOptions) {
        this.options = options;
    }

    generateVirtualModule(): string {
        this.middlewares = scanMiddlewares(this.options);

        try {
            const pagesJsonPath = resolve(this.config.root, this.options.pagesJsonPath);
            this.pagesJson = parseJsonc(readFileSync(pagesJsonPath, "utf-8"));
        } catch {
            this.pagesJson = {};
        }

        const imports = this.middlewares.map((m) => `import ${m.value} from "${m.path}";`);
        const globalMiddlewares = this.findMiddlewaresByNames(this.pagesJson.middleware || []);
        const pagesMiddlewares = this.getPagesMiddlewares();

        return `${imports.join("\n")}
export const middlewares = {
    global: [${globalMiddlewares.map((m) => m.value).join(", ")}],
    ${pagesMiddlewares.map((p) => `"${p.key}": [${p.middlewares.map((m) => m.value).join(", ")}]`).join(",\n    ")}
};`;
    }

    private getPagesMiddlewares(): Array<{ key: string; middlewares: MiddlewareInfo[] }> {
        const result: Array<{ key: string; middlewares: MiddlewareInfo[] }> = [];

        for (const page of this.pagesJson.pages || []) {
            if (page.middleware?.length) {
                result.push({
                    key: page.path,
                    middlewares: this.findMiddlewaresByNames(page.middleware),
                });
            }
        }

        for (const sub of this.pagesJson.subPackages || []) {
            for (const page of sub.pages || []) {
                if (page.middleware?.length) {
                    result.push({
                        key: `${sub.root}/${page.path}`,
                        middlewares: this.findMiddlewaresByNames(page.middleware),
                    });
                }
            }
        }
        return result;
    }

    private findMiddlewaresByNames(names: string[]): MiddlewareInfo[] {
        return this.middlewares.filter((m) => names.includes(m.name));
    }
}
