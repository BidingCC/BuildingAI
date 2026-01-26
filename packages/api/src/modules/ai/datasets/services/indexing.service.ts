import {
    IndexingSegmentsDto,
    IndexingSegmentsResponseDto,
    ParentSegmentDto,
    SegmentResultDto,
    TextPreprocessingRulesDto,
} from "@buildingai/dto/indexing-segments.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import * as axios from "axios";
import { pathExists, readFile } from "fs-extra";

import { FileParserService } from "./file-parser.service";

/** Sentence ending separator regex (precompiled) */
const SPLIT_REGEX = /[。！？.!?]\s*/g;
/** Multiple spaces regex */
const COLLAPSE_WS = /[ \t]{2,}/g;
/** Repeated newlines regex */
const COLLAPSE_NL = /\n{2,}/g;

/**
 * Indexing service class
 * Provides dataset segmentation and cleaning functionality
 */
@Injectable()
export class IndexingService {
    private readonly logger = new Logger(IndexingService.name);

    constructor(
        private readonly uploadService: UploadService,
        private readonly fileParserService: FileParserService,
    ) {}

    /**
     * Process separator escaping
     * Convert escaped strings from frontend to actual separators
     * @param segmentIdentifier Separator string
     * @returns Processed separator
     */
    private processSegmentIdentifier(segmentIdentifier: string): string {
        return segmentIdentifier
            .replace(/\\n/g, "\n") // Convert \\n to \n
            .replace(/\\t/g, "\t") // Convert \\t to \t
            .replace(/\\r/g, "\r"); // Convert \\r to \r
    }

    /**
     * Segment multiple files according to mode
     */
    async indexingSegments(dto: IndexingSegmentsDto): Promise<IndexingSegmentsResponseDto> {
        const startTime = Date.now();
        this.logger.log(
            `Starting dataset segmentation, file count: ${dto.fileIds.length}, mode: ${dto.documentMode}`,
        );

        try {
            // Process each file in parallel, maintaining file information
            const fileResults = await Promise.all(
                dto.fileIds.map(async (fileId) => {
                    const file = await this.uploadService.getFileById(fileId);
                    if (!file) throw new Error(`File not found: ${fileId}`);

                    const segments = await this.processFileByMode(fileId, dto);
                    return {
                        fileId,
                        fileName: file.originalName,
                        segments,
                        segmentCount: segments.length,
                    };
                }),
            );

            // Calculate total segment count
            const totalSegments = fileResults.reduce((total, file) => total + file.segmentCount, 0);

            const processingTime = Date.now() - startTime;

            return {
                fileResults,
                totalSegments,
                processedFiles: dto.fileIds.length,
                processingTime,
            };
        } catch (error) {
            this.logger.error(
                `Dataset segmentation processing failed: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.internal(`Segmentation processing failed: ${error.message}`);
        }
    }

    /**
     * Process single file according to normal / hierarchical mode
     */
    private async processFileByMode(
        fileId: string,
        dto: IndexingSegmentsDto,
    ): Promise<ParentSegmentDto[] | SegmentResultDto[]> {
        const file = await this.uploadService.getFileById(fileId);
        if (!file) throw new Error(`File not found: ${fileId}`);

        this.logger.log(`Processing file: ${file.originalName}`);
        const raw = await this.readFileContent(fileId, file);
        const preprocess = (txt: string) => this.preprocessText(txt, dto.preprocessingRules);

        // Parent-child segmentation
        if (dto.documentMode === "hierarchical") {
            if (!dto.parentContextMode || !dto.subSegmentation) {
                throw new Error(
                    "Parent-child segmentation mode must provide parent context mode and child segmentation configuration",
                );
            }
            // Parent block list: full text or split by max length
            const parents =
                dto.parentContextMode === "fullText"
                    ? [raw]
                    : this.splitLongSegment(
                          raw,
                          this.processSegmentIdentifier(dto.segmentation!.segmentIdentifier),
                          dto.segmentation!.maxSegmentLength,
                          0,
                          false,
                      );

            return parents.flatMap((p, pi) => {
                const cleanParent = preprocess(p);
                if (!cleanParent) return [];

                const children = this.splitLongSegment(
                    cleanParent,
                    this.processSegmentIdentifier(dto.subSegmentation!.segmentIdentifier),
                    dto.subSegmentation!.maxSegmentLength,
                    0,
                    true,
                )
                    .map((c, ci) => ({
                        content: preprocess(c),
                        index: ci,
                        length: c.length,
                    }))
                    .filter((c) => c.content);

                return children.length
                    ? [
                          {
                              content: cleanParent,
                              index: pi,
                              length: cleanParent.length,
                              children,
                          },
                      ]
                    : [];
            });
        }

        // Normal segmentation
        return this.splitLongSegment(
            raw,
            this.processSegmentIdentifier(dto.segmentation!.segmentIdentifier),
            dto.segmentation!.maxSegmentLength,
            dto.segmentation!.segmentOverlap!,
            false,
        )
            .map((seg, i) => ({
                content: preprocess(seg),
                index: i,
                length: seg.length,
            }))
            .filter((s) => s.content);
    }

    /**
     * Split long text by max length and overlap
     */
    private splitLongSegment(
        text: string,
        segmentIdentifier: string,
        maxLength: number,
        overlap: number,
        hasChild: boolean,
    ): string[] {
        // Non-child mode: first rough cut by user separator
        let initialBlocks: string[] | string | any;
        initialBlocks =
            text.split(segmentIdentifier).join(",").indexOf(",,") !== -1
                ? text.split(segmentIdentifier).join(",").split(",,")
                : text.split(segmentIdentifier);

        if (hasChild) {
            initialBlocks = initialBlocks.join(",").split(",");
        }

        const segments: string[] = [];
        const minAdvance = Math.max(1, Math.floor(maxLength / 4));

        for (const blkRaw of initialBlocks) {
            const blk = blkRaw.trim();
            if (!blk) continue;

            let start = 0;
            while (start < blk.length) {
                let end = Math.min(start + maxLength, blk.length);

                if (end < blk.length) {
                    let lastValid = -1;
                    const slice = blk.substring(start, end);
                    let match: RegExpExecArray | null;
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

    /**
     * Text preprocessing: merge empty lines/spaces, remove URLs and emails
     */
    private preprocessText(text: string, rules?: TextPreprocessingRulesDto): string {
        let result = text.replace(/\n{3,}/g, "\n\n");

        if (rules?.replaceConsecutiveWhitespace) {
            result = result.replace(COLLAPSE_WS, " ").replace(COLLAPSE_NL, "\n").trim();
        }

        if (rules?.removeUrlsAndEmails) {
            result = result
                .replace(/https?:\/\/[\w./:%#$&?()~\-+=]+/gi, "")
                .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
                .replace(COLLAPSE_WS, " ")
                .replace(COLLAPSE_NL, "\n")
                .trim();
        }

        return result;
    }

    /**
     * Read file content and pass to parsing service
     */
    private async readFileContent(fileId: string, file: any): Promise<string> {
        let buffer: Buffer;

        // Check if file is stored in OSS (URL starts with http:// or https://)
        if (file.url && (file.url.startsWith("http://") || file.url.startsWith("https://"))) {
            // OSS file: download from URL
            try {
                this.logger.log(`Downloading OSS file from URL: ${file.url}`);
                const response = await axios.default.get(file.url, {
                    responseType: "arraybuffer",
                    timeout: 60000, // 60 seconds timeout
                });
                buffer = Buffer.from(response.data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Failed to download OSS file from URL: ${file.url}`,
                    errorMessage,
                );
                throw new Error(
                    `Failed to download file from OSS: ${file.originalName} - ${errorMessage}`,
                );
            }
        } else {
            // Local file: read from file system
            const filePath = await this.uploadService.getFilePath(fileId);
            if (!(await pathExists(filePath))) {
                throw new Error(`File not found or deleted: ${file.originalName}`);
            }
            buffer = await readFile(filePath);
        }

        const mockFile: Express.Multer.File = {
            buffer,
            originalname: file.originalName,
            mimetype: file.mimeType,
            size: file.size,
            fieldname: "file",
            encoding: "utf-8",
            filename: file.storageName,
            destination: "",
            path: file.path || file.url || "",
            stream: null,
        };

        return this.fileParserService.parseFile(mockFile);
    }
}
