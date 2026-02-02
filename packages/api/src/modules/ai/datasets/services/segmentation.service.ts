import { Injectable, Logger } from "@nestjs/common";

import { DEFAULT_SEGMENTATION_OPTIONS } from "../constants/datasets.constants";
import type { SegmentationOptions, SegmentInput } from "../interfaces/vectorization.interface";

/** 句末分隔正则 */
const SPLIT_REGEX = /[。！？.!?]\s*/g;
const COLLAPSE_WS = /[ \t]{2,}/g;
const COLLAPSE_NL = /\n{2,}/g;

/**
 * 分段服务
 *
 * 将原始文本按配置切分为分段（与 datasets-old indexing.service 切割效果一致），
 * 供文档解析后写入 Segment 并向量化。
 */
@Injectable()
export class SegmentationService {
    private readonly logger = new Logger(SegmentationService.name);

    /**
     * 将原始文本切分为分段
     * @param rawText 原始文本（解析后的全文）
     * @param options 分段配置，不传则使用默认配置
     */
    segment(rawText: string, options?: Partial<SegmentationOptions>): SegmentInput[] {
        const opts = { ...DEFAULT_SEGMENTATION_OPTIONS, ...options };
        const processed = this.preprocessText(rawText, opts);
        if (!processed?.trim()) {
            this.logger.warn("Segmentation input is empty after preprocessing");
            return [];
        }

        const separator = this.processSegmentIdentifier(opts.segmentIdentifier);
        const segments = this.splitLongSegment(
            processed,
            separator,
            opts.maxSegmentLength,
            opts.segmentOverlap ?? 0,
        );

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

    private splitLongSegment(
        text: string,
        segmentIdentifier: string,
        maxLength: number,
        overlap: number,
    ): string[] {
        let initialBlocks: string[] =
            text.split(segmentIdentifier).join(",").indexOf(",,") !== -1
                ? text.split(segmentIdentifier).join(",").split(",,")
                : text.split(segmentIdentifier);

        const segments: string[] = [];
        const minAdvance = Math.max(1, Math.floor(maxLength / 4));

        for (const blkRaw of initialBlocks) {
            const blk = (typeof blkRaw === "string" ? blkRaw : String(blkRaw)).trim();
            if (!blk) continue;

            let start = 0;
            while (start < blk.length) {
                let end = Math.min(start + maxLength, blk.length);

                if (end < blk.length) {
                    const slice = blk.substring(start, end);
                    SPLIT_REGEX.lastIndex = 0;
                    let match: RegExpExecArray | null;
                    let lastValid = -1;
                    while ((match = SPLIT_REGEX.exec(slice))) {
                        lastValid = start + match.index + match[0].length;
                    }
                    if (lastValid > start) {
                        end = lastValid;
                    }
                }

                const part = blk.slice(start, end).trim();
                if (part) {
                    segments.push(part);
                }

                start = end < blk.length ? Math.max(start + minAdvance, end - overlap) : end;
            }
        }

        return segments;
    }

    private preprocessText(text: string, opts: SegmentationOptions): string {
        let result = text.replace(/\n{3,}/g, "\n\n");

        if (opts.replaceConsecutiveWhitespace !== false) {
            result = result.replace(COLLAPSE_WS, " ").replace(COLLAPSE_NL, "\n").trim();
        }

        if (opts.removeUrlsAndEmails) {
            result = result
                .replace(/https?:\/\/[\w./:%#$&?()~\-+=]+/gi, "")
                .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
                .replace(COLLAPSE_WS, " ")
                .replace(COLLAPSE_NL, "\n")
                .trim();
        }

        return result;
    }
}
