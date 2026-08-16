import { Injectable } from "@nestjs/common";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 解析后的 Skill 定义
 */
export interface ParsedSkill {
    name: string;
    description?: string;
    instructions: string;
}

/**
 * Skill 定义文件解析服务
 *
 * 从解压后的 zip 目录或 git clone 后的目录中解析 skill 定义文件。
 * 优先级：skill.json → SKILL.md（frontmatter）→ 首个 .md 文件。
 */
@Injectable()
export class SkillParserService {
    /**
     * 解析目录中的 skill 定义
     *
     * @param dir 已解压/clone 的目录路径
     * @param fallbackName 无法从定义文件取到 name 时使用的兜底名称
     * @returns 解析结果
     */
    parseDirectory(dir: string, fallbackName?: string): ParsedSkill {
        // 1. 直接在目录层级查找（skill.json / SKILL.md / 任意 .md）
        const here = this.tryParseAt(dir, fallbackName);
        if (here) return here;

        // 2. zip/git 常将内容包裹在子目录中（单层甚至多层），
        //    递归（深度受限）搜索整棵解压树，找到第一个定义文件。
        const found = this.findDefinitionInTree(dir);
        if (found) {
            if (found.type === "json") {
                const parsed = this.parseJson(found.path, fallbackName);
                if (parsed) return parsed;
            } else if (found.type === "skillmd") {
                const parsed = this.parseSkillMd(found.path, fallbackName);
                if (parsed) return parsed;
            } else {
                const content = readFileSync(found.path, "utf-8");
                const name = fallbackName || this.nameFromPath(found.path);
                const description = this.extractFirstLine(content);
                return { name, description, instructions: content.trim() };
            }
        }

        throw new Error(
            `在目录 ${dir} 中未找到 skill 定义文件（skill.json / SKILL.md / *.md）`,
        );
    }

    /**
     * 在指定目录中尝试解析 skill 定义（仅当前层级）。
     *
     * @returns 解析成功返回 ParsedSkill，否则返回 null
     */
    private tryParseAt(dir: string, fallbackName?: string): ParsedSkill | null {
        // 1. skill.json
        const jsonPath = join(dir, "skill.json");
        if (existsSync(jsonPath) && statSync(jsonPath).isFile()) {
            const parsed = this.parseJson(jsonPath, fallbackName);
            if (parsed) return parsed;
        }

        // 2. SKILL.md / skill.md（大小写不敏感，frontmatter）
        const skillMdPath = this.findCaseInsensitive(dir, "skill.md");
        if (skillMdPath && statSync(skillMdPath).isFile()) {
            const parsed = this.parseSkillMd(skillMdPath, fallbackName);
            if (parsed) return parsed;
        }

        // 3. 首个 .md 文件
        const mdFile = this.findFirstMarkdown(dir);
        if (mdFile) {
            const content = readFileSync(mdFile, "utf-8");
            const name = fallbackName || this.nameFromPath(mdFile);
            const description = this.extractFirstLine(content);
            return { name, description, instructions: content.trim() };
        }

        return null;
    }

    /**
     * 在目录树中（最大深度 4 层）查找首个 skill 定义文件。
     * 优先顺序：skill.json > SKILL.md/skill.md > 任意 .md。
     * 自动跳过 __MACOSX / .DS_Store / node_modules 等无关目录。
     */
    private findDefinitionInTree(
        root: string,
    ): { type: "json" | "skillmd" | "md"; path: string } | null {
        const MAX_DEPTH = 4;
        const SKIP = new Set(["__MACOSX", ".DS_Store", "node_modules", ".git"]);

        const queue: Array<{ dir: string; depth: number }> = [
            { dir: root, depth: 0 },
        ];
        while (queue.length) {
            const { dir, depth } = queue.shift()!;
            let entries: string[];
            try {
                entries = readdirSync(dir);
            } catch {
                continue;
            }
            for (const entry of entries) {
                if (SKIP.has(entry)) continue;
                const full = join(dir, entry);
                let isDir = false;
                try {
                    isDir = statSync(full).isDirectory();
                } catch {
                    continue;
                }
                if (isDir) {
                    if (depth < MAX_DEPTH) {
                        queue.push({ dir: full, depth: depth + 1 });
                    }
                    continue;
                }
                const lower = entry.toLowerCase();
                if (lower === "skill.json") {
                    return { type: "json", path: full };
                }
                if (lower === "skill.md") {
                    return { type: "skillmd", path: full };
                }
            }
        }
        // 第二轮：任意 .md（避免优先匹配到无关 README）
        const queue2: Array<{ dir: string; depth: number }> = [
            { dir: root, depth: 0 },
        ];
        while (queue2.length) {
            const { dir, depth } = queue2.shift()!;
            let entries: string[];
            try {
                entries = readdirSync(dir);
            } catch {
                continue;
            }
            for (const entry of entries) {
                if (SKIP.has(entry)) continue;
                const full = join(dir, entry);
                let isDir = false;
                try {
                    isDir = statSync(full).isDirectory();
                } catch {
                    continue;
                }
                if (isDir) {
                    if (depth < MAX_DEPTH) {
                        queue2.push({ dir: full, depth: depth + 1 });
                    }
                    continue;
                }
                if (entry.toLowerCase().endsWith(".md")) {
                    return { type: "md", path: full };
                }
            }
        }
        return null;
    }

    /**
     * 在目录中按大小写不敏感的方式查找指定文件名。
     */
    private findCaseInsensitive(dir: string, target: string): string | null {
        const lower = target.toLowerCase();
        let entries: string[];
        try {
            entries = readdirSync(dir);
        } catch {
            return null;
        }
        for (const entry of entries) {
            if (entry.toLowerCase() === lower) return join(dir, entry);
        }
        return null;
    }

    private parseJson(path: string, fallbackName?: string): ParsedSkill | null {
        let raw: string;
        try {
            raw = readFileSync(path, "utf-8");
        } catch {
            return null;
        }
        let data: Record<string, any>;
        try {
            data = JSON.parse(raw);
        } catch {
            return null;
        }
        const instructions = data.instructions ?? data.instruction ?? data.content;
        if (!instructions || typeof instructions !== "string") return null;
        return {
            name: data.name ?? fallbackName ?? "未命名 Skill",
            description: data.description,
            instructions: instructions.trim(),
        };
    }

    private parseSkillMd(path: string, fallbackName?: string): ParsedSkill | null {
        const raw = readFileSync(path, "utf-8");
        const fm = this.parseFrontmatter(raw);
        const body = fm.body.trim();
        if (!body) return null;
        return {
            name: fm.data.name ?? fallbackName ?? this.nameFromPath(path),
            description: fm.data.description,
            instructions: body,
        };
    }

    /**
     * 解析 YAML frontmatter（简单实现，仅支持 key: value 顶层字段）
     */
    private parseFrontmatter(raw: string): {
        data: Record<string, string>;
        body: string;
    } {
        const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
        if (!match) return { data: {}, body: raw };
        const fmText = match[1];
        const body = match[2];
        const data: Record<string, string> = {};
        for (const line of fmText.split("\n")) {
            const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
            if (m) {
                data[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
            }
        }
        return { data, body };
    }

    private findFirstMarkdown(dir: string): string | null {
        if (!existsSync(dir)) return null;
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const full = join(dir, entry);
            if (statSync(full).isFile() && entry.toLowerCase().endsWith(".md")) {
                return full;
            }
        }
        return null;
    }

    private nameFromPath(path: string): string {
        return path.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || "未命名 Skill";
    }

    private extractFirstLine(content: string): string | undefined {
        const line = content.split("\n").find((l) => l.trim().length > 0);
        return line?.trim();
    }
}
