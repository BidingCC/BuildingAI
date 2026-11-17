import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import * as path from "node:path";

import { FileStorageService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { File as UploadedFile } from "@buildingai/db/entities";
import { IsNull, Raw, Repository } from "@buildingai/db/typeorm";
import { HttpError, HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import type { FileUIPart, ModelMessage, UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import { isUUID } from "class-validator";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_IMAGE_BYTES = 30 * 1024 * 1024;
const IMAGE_ACCESS_ERROR = "图片不存在或无权访问，请重新上传";

type LocalImagePath = { path: string; extensionId?: string };
type InlineImage = { url: string; mediaType: string; size: number };

function getLocalImagePath(url: string): LocalImagePath | undefined {
    try {
        const pathname = decodeURIComponent(new URL(url, "http://attachment.invalid").pathname);
        const match = pathname.match(/^\/(?:([^/]+)\/)?uploads\/(.+)$/);
        return match ? { path: match[2], extensionId: match[1] } : undefined;
    } catch {
        return undefined;
    }
}

function getObjectKey(localPath: LocalImagePath): string {
    return `${localPath.extensionId ? `${localPath.extensionId}/` : ""}uploads/${localPath.path}`;
}

function detectImageMediaType(data: Buffer): string | undefined {
    const signatures: Array<[string, string]> = [
        ["image/png", "89504e470d0a1a0a"],
        ["image/jpeg", "ffd8ff"],
        ["image/gif", "474946383761"],
        ["image/gif", "474946383961"],
        ["image/bmp", "424d"],
        ["image/tiff", "49492a00"],
        ["image/tiff", "4d4d002a"],
    ];
    const match = signatures.find(([, signature]) =>
        data.subarray(0, signature.length / 2).equals(Buffer.from(signature, "hex")),
    );
    if (match) return match[0];
    if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
        return "image/webp";
    }
    if (
        data.toString("ascii", 4, 8) === "ftyp" &&
        ["avif", "avis"].includes(data.toString("ascii", 8, 12))
    ) {
        return "image/avif";
    }
    return undefined;
}

@Injectable()
export class ChatImageService {
    constructor(
        @InjectRepository(UploadedFile)
        private readonly fileRepository: Repository<UploadedFile>,
        private readonly fileStorageService: FileStorageService,
    ) {}

    async convertToModelMessages(messages: UIMessage[]): Promise<ModelMessage[]> {
        const converted = await convertToModelMessages(messages);
        return converted.map((message) => {
            if (message.role !== "user" || !Array.isArray(message.content)) return message;
            return {
                ...message,
                content: message.content.map((part) => {
                    if (part.type !== "file" || !part.mediaType.startsWith("image/")) return part;
                    const data = part.data instanceof URL ? part.data.href : part.data;
                    const match =
                        typeof data === "string"
                            ? /^data:(image\/[^;,]+);base64,(.*)$/s.exec(data)
                            : null;
                    return match
                        ? { ...part, data: Buffer.from(match[2], "base64"), mediaType: match[1] }
                        : part;
                }),
            };
        });
    }

    async prepareMessages(
        messages: UIMessage[],
        userId: string | undefined,
        abortSignal?: AbortSignal,
    ): Promise<UIMessage[]> {
        const images = new Map<string, InlineImage>();
        const prepared: UIMessage[] = [];
        let totalBytes = 0;

        for (const message of messages) {
            abortSignal?.throwIfAborted();
            if (message.role !== "user") {
                prepared.push(message);
                continue;
            }
            const parts: UIMessage["parts"] = [];
            for (const part of message.parts ?? []) {
                if (part.type !== "file" || !part.mediaType?.startsWith("image/")) {
                    parts.push(part);
                    continue;
                }
                const fileId = part.providerMetadata?.buildingai?.fileId;
                if (fileId !== undefined && (typeof fileId !== "string" || !isUUID(fileId))) {
                    throw HttpErrorFactory.badRequest("图片附件 ID 无效，请重新上传");
                }
                const localPath = getLocalImagePath(part.url);
                if (fileId === undefined && !localPath) {
                    parts.push(part);
                    continue;
                }
                let file = await this.fileRepository.findOne({
                    where:
                        fileId !== undefined
                            ? { id: fileId as string }
                            : {
                                  path: localPath.path,
                                  extensionIdentifier: localPath.extensionId || IsNull(),
                              },
                    order: { createdAt: "ASC", id: "ASC" },
                });
                if (!file && fileId === undefined) {
                    file = await this.fileRepository.findOne({
                        where: {
                            path: getObjectKey(localPath),
                            extensionIdentifier: localPath.extensionId || IsNull(),
                        },
                        order: { createdAt: "ASC", id: "ASC" },
                    });
                }
                if (!userId || !file || file.uploaderId !== userId) {
                    throw HttpErrorFactory.badRequest(IMAGE_ACCESS_ERROR);
                }
                const { buildingai: _attachment, ...providerMetadata } =
                    part.providerMetadata ?? {};
                const cleanPart: FileUIPart = { ...part, providerMetadata };
                const storedPath = getLocalImagePath(file.url);
                if (!storedPath || file.path === getObjectKey(storedPath)) {
                    parts.push({ ...cleanPart, url: file.url });
                    continue;
                }
                if (
                    !file.path ||
                    path.isAbsolute(file.path) ||
                    path.posix.normalize(file.path) !== file.path ||
                    file.path
                        .split(/[\\/]/)
                        .some((segment) => segment === ".." || segment === ".") ||
                    file.path.includes("\\") ||
                    file.path.includes("\0") ||
                    (file.extensionIdentifier &&
                        !/^[a-zA-Z0-9_-]+$/.test(file.extensionIdentifier)) ||
                    storedPath.path !== file.path ||
                    (storedPath.extensionId || null) !== (file.extensionIdentifier || null)
                ) {
                    throw HttpErrorFactory.badRequest("图片存储路径无效，请重新上传");
                }
                const original = await this.fileRepository.findOne({
                    where: {
                        path: Raw((column) => `LOWER(${column}) = LOWER(:imagePath)`, {
                            imagePath: file.path,
                        }),
                        extensionIdentifier: file.extensionIdentifier
                            ? Raw((column) => `LOWER(${column}) = LOWER(:imageExtensionId)`, {
                                  imageExtensionId: file.extensionIdentifier,
                              })
                            : IsNull(),
                    },
                    order: { createdAt: "ASC", id: "ASC" },
                });
                if (original?.id !== file.id) {
                    throw HttpErrorFactory.badRequest(IMAGE_ACCESS_ERROR);
                }
                if (!file.mimeType?.startsWith("image/")) {
                    throw HttpErrorFactory.badRequest("附件不是图片，请重新上传");
                }
                if (file.size > MAX_IMAGE_BYTES) {
                    throw HttpErrorFactory.badRequest("单张图片不能超过 10 MiB");
                }
                let image = images.get(file.id);
                if (!image) {
                    image = await this.readImage(file, abortSignal);
                    images.set(file.id, image);
                }
                totalBytes += image.size;
                if (totalBytes > MAX_REQUEST_IMAGE_BYTES) {
                    throw HttpErrorFactory.badRequest("本次对话的图片总大小不能超过 30 MiB");
                }
                parts.push({ ...cleanPart, url: image.url, mediaType: image.mediaType });
            }
            prepared.push({ ...message, parts });
        }
        return prepared;
    }

    private async readImage(file: UploadedFile, signal?: AbortSignal): Promise<InlineImage> {
        const options = file.extensionIdentifier
            ? { extensionId: file.extensionIdentifier }
            : undefined;
        try {
            const root = await realpath(this.fileStorageService.getFullPath("", options));
            const target = await realpath(this.fileStorageService.getFullPath(file.path, options));
            const relative = path.relative(root, target);
            if (
                !relative ||
                relative === ".." ||
                relative.startsWith(`..${path.sep}`) ||
                path.isAbsolute(relative)
            ) {
                throw HttpErrorFactory.badRequest("图片存储路径无效，请重新上传");
            }
            const stats = await stat(target);
            if (!stats.isFile()) {
                throw HttpErrorFactory.badRequest("图片读取失败，请重新上传");
            }
            if (stats.size > MAX_IMAGE_BYTES) {
                throw HttpErrorFactory.badRequest("单张图片不能超过 10 MiB");
            }
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of createReadStream(target, { signal })) {
                size += chunk.length;
                if (size > MAX_IMAGE_BYTES) {
                    throw HttpErrorFactory.badRequest("单张图片不能超过 10 MiB");
                }
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks, size);
            const mediaType = detectImageMediaType(data);
            if (!mediaType) {
                throw HttpErrorFactory.badRequest("不支持的图片格式或图片内容无效，请重新上传");
            }
            return { url: `data:${mediaType};base64,${data.toString("base64")}`, mediaType, size };
        } catch (error) {
            if (error instanceof HttpError || signal?.aborted) throw error;
            throw HttpErrorFactory.badRequest("图片读取失败，请重新上传");
        }
    }
}
