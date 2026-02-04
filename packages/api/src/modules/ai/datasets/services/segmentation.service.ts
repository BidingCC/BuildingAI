import { Injectable, Logger } from "@nestjs/common";

import { DEFAULT_SEGMENTATION_OPTIONS } from "../constants/datasets.constants";
import type { SegmentationOptions, SegmentInput } from "../interfaces/vectorization.interface";

const COLLAPSE_WS = /[ \t]{2,}/g;
const COLLAPSE_NL = /\n{3,}/g;

@Injectable()
export class SegmentationService {
    private readonly logger = new Logger(SegmentationService.name);

    segment(rawText: string, options?: Partial<SegmentationOptions>): SegmentInput[] {
        const opts = { ...DEFAULT_SEGMENTATION_OPTIONS, ...options };
        const processed = this.preprocessText(rawText, opts);
        if (!processed?.trim()) {
            this.logger.warn("Segmentation input is empty after preprocessing");
            return [];
        }

        const segments = this.splitRecursive(processed, opts);

        return segments
            .map((content, index) => ({
                content,
                index,
                length: content.length,
            }))
            .filter((s) => s.content.trim());
    }

    private processSegmentIdentifier(segmentIdentifier: string): string {
        return segmentIdentifier.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
    }

    private splitRecursive(text: string, opts: SegmentationOptions): string[] {
        const chunkSize = Math.max(1, Math.floor(opts.maxSegmentLength));
        const chunkOverlap = Math.max(0, Math.floor(opts.segmentOverlap ?? 0));
        const keepSeparator = opts.keepSeparator !== false;
        const separators = (
            opts.separators?.length ? opts.separators : ["\n\n", "。", ". ", " ", ""]
        ).map((s) => String(s ?? ""));

        const mode = opts.mode ?? (opts.fixedSeparator != null ? "fixed" : "automatic");
        if (mode === "fixed") {
            const fixed = this.processSegmentIdentifier(
                (opts.fixedSeparator ?? opts.segmentIdentifier ?? "\n\n") as string,
            );
            return text
                .split(fixed)
                .flatMap((chunk) => {
                    const t = chunk.trim();
                    if (!t) return [];
                    if (t.length <= chunkSize) return [t];
                    return this.recursiveSplitText(
                        t,
                        separators,
                        chunkSize,
                        chunkOverlap,
                        keepSeparator,
                    );
                })
                .filter((x) => x.trim());
        }

        return this.recursiveSplitText(
            text,
            separators,
            chunkSize,
            chunkOverlap,
            keepSeparator,
        ).filter((x) => x.trim());
    }

    private recursiveSplitText(
        text: string,
        separators: string[],
        chunkSize: number,
        chunkOverlap: number,
        keepSeparator: boolean,
    ): string[] {
        const picked = this.pickSeparator(text, separators);
        if (picked === "") {
            return this.splitByCharactersWithOverlap(text, chunkSize, chunkOverlap);
        }

        const sepIndex = separators.indexOf(picked);
        const nextSeps = sepIndex >= 0 ? separators.slice(sepIndex + 1) : [];
        const splits = this.splitOnSeparator(text, picked, keepSeparator);
        const filtered = this.filterSplits(splits, picked);

        const final: string[] = [];
        const good: string[] = [];
        const goodLens: number[] = [];

        for (const s of filtered) {
            const len = s.length;
            if (len < chunkSize) {
                good.push(s);
                goodLens.push(len);
                continue;
            }

            if (good.length) {
                final.push(
                    ...this.mergeSplits(
                        good,
                        picked,
                        goodLens,
                        chunkSize,
                        chunkOverlap,
                        keepSeparator,
                    ),
                );
                good.length = 0;
                goodLens.length = 0;
            }

            const t = s.trim();
            if (!t) continue;
            if (nextSeps.length === 0) {
                final.push(t);
            } else {
                final.push(
                    ...this.recursiveSplitText(t, nextSeps, chunkSize, chunkOverlap, keepSeparator),
                );
            }
        }

        if (good.length) {
            final.push(
                ...this.mergeSplits(good, picked, goodLens, chunkSize, chunkOverlap, keepSeparator),
            );
        }

        return final;
    }

    private pickSeparator(text: string, separators: string[]): string {
        for (const sep of separators) {
            if (!sep) continue;
            if (text.includes(sep)) return sep;
        }
        return separators[separators.length - 1] ?? "";
    }

    private splitOnSeparator(text: string, separator: string, keepSeparator: boolean): string[] {
        if (separator === "") return Array.from(text);
        const parts = separator === " " ? text.split(/\s+/) : text.split(separator);
        if (!keepSeparator) return parts;
        if (parts.length <= 1) return parts;
        const out = parts.slice(0, -1).map((p) => p + separator);
        out.push(parts[parts.length - 1]);
        return out;
    }

    private filterSplits(splits: string[], separator: string): string[] {
        if (separator === "\n") {
            return splits.filter((s) => s !== "");
        }
        return splits.filter((s) => s !== "" && s !== "\n");
    }

    private splitByCharactersWithOverlap(
        text: string,
        chunkSize: number,
        chunkOverlap: number,
    ): string[] {
        const chars = Array.from(text);
        const out: string[] = [];
        const maxBeforeOverlap = Math.max(1, chunkSize - chunkOverlap);

        let current: string[] = [];
        let currentLen = 0;
        let overlapPart: string[] = [];
        let overlapLen = 0;

        for (const c of chars) {
            const l = c.length;
            if (currentLen + l <= maxBeforeOverlap) {
                current.push(c);
                currentLen += l;
                continue;
            }
            if (currentLen + l <= chunkSize) {
                current.push(c);
                currentLen += l;
                overlapPart.push(c);
                overlapLen += l;
                continue;
            }

            const doc = current.join("").trim();
            if (doc) out.push(doc);

            current = overlapPart.length ? [...overlapPart, c] : [c];
            currentLen = overlapLen + l;
            overlapPart = [];
            overlapLen = 0;
        }

        const last = current.join("").trim();
        if (last) out.push(last);
        return out;
    }

    private mergeSplits(
        splits: string[],
        separator: string,
        lengths: number[],
        chunkSize: number,
        chunkOverlap: number,
        keepSeparator: boolean,
    ): string[] {
        const joiner = keepSeparator ? "" : separator;
        const sepLen = joiner.length;
        const docs: string[] = [];

        const current: string[] = [];
        const currentLens: number[] = [];
        let total = 0;

        for (let i = 0; i < splits.length; i++) {
            const d = splits[i] ?? "";
            const len = lengths[i] ?? d.length;
            const additional = current.length > 0 ? sepLen : 0;

            if (total + len + additional > chunkSize) {
                if (current.length) {
                    const doc = current.join(joiner).trim();
                    if (doc) docs.push(doc);
                }

                while (
                    total > chunkOverlap ||
                    (total + len + (current.length > 0 ? sepLen : 0) > chunkSize && total > 0)
                ) {
                    const removedLen = currentLens.shift();
                    current.shift();
                    total -= removedLen ?? 0;
                    if (current.length > 0) total -= sepLen;
                }
            }

            current.push(d);
            currentLens.push(len);
            total += len + (current.length > 1 ? sepLen : 0);
        }

        if (current.length) {
            const doc = current.join(joiner).trim();
            if (doc) docs.push(doc);
        }
        return docs;
    }

    private preprocessText(text: string, opts: SegmentationOptions): string {
        let result = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        result = result.replace(COLLAPSE_NL, "\n\n");

        if (opts.replaceConsecutiveWhitespace !== false) {
            result = result.replace(COLLAPSE_WS, " ").replace(COLLAPSE_NL, "\n\n").trim();
        }

        if (opts.removeUrlsAndEmails) {
            result = result
                .replace(/https?:\/\/[\w./:%#$&?()~\-+=]+/gi, "")
                .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
                .replace(COLLAPSE_WS, " ")
                .replace(COLLAPSE_NL, "\n\n")
                .trim();
        }

        return result;
    }
}
