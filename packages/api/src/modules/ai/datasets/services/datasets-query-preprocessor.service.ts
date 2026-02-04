import { Injectable, Logger } from "@nestjs/common";
import { Jieba } from "@node-rs/jieba";

const TOKEN_OK = /[\u4e00-\u9fa5a-zA-Z0-9]/;

@Injectable()
export class DatasetsQueryPreprocessorService {
    private readonly logger = new Logger(DatasetsQueryPreprocessorService.name);
    private readonly jieba: Jieba;

    constructor() {
        try {
            this.jieba = new Jieba();
        } catch (err) {
            this.logger.error(
                `Init jieba failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            throw err;
        }
    }

    escapeQueryForSearch(query: string): string {
        return String(query ?? "").replaceAll(`"`, `\\"`);
    }

    segmentForFullTextSearch(query: string, maxTokens: number): string {
        const q = String(query ?? "")
            .replaceAll("\n", " ")
            .trim();
        if (!q) return "";
        const tokens = this.jieba
            .cut(q, true)
            .map((t) => String(t ?? "").trim())
            .filter((t) => t && TOKEN_OK.test(t))
            .slice(0, Math.max(1, Math.floor(maxTokens)));
        return tokens.length ? tokens.join(" ") : q;
    }

    tokenize(text: string): string[] {
        const t = String(text ?? "")
            .replaceAll("\n", " ")
            .trim();
        if (!t) return [];
        const base = this.jieba
            .cut(t, true)
            .map((x) => String(x ?? "").trim())
            .filter((x) => x && TOKEN_OK.test(x));
        const out: string[] = [];
        for (const token of base) {
            out.push(token);
            if (this.isMostlyChinese(token) && token.length >= 2) {
                for (const ch of Array.from(token)) {
                    if (ch && TOKEN_OK.test(ch)) out.push(ch);
                }
            }
        }
        return out;
    }

    private isMostlyChinese(token: string): boolean {
        let cn = 0;
        let total = 0;
        for (const ch of Array.from(token)) {
            total += 1;
            if (/[\u4e00-\u9fa5]/.test(ch)) cn += 1;
        }
        return total > 0 && cn / total >= 0.6;
    }
}
