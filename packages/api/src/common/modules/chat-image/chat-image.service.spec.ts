import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { FileStorageService } from "@buildingai/core/modules";
import type { File as UploadedFile } from "@buildingai/db/entities";
import type { Repository } from "@buildingai/db/typeorm";
import type { FileUIPart, UIMessage } from "ai";
import { convertToModelMessages, ToolLoopAgent } from "ai";
import { MockLanguageModelV3 } from "ai/test";

import { ChatImageService } from "./chat-image.service";

jest.mock("@buildingai/core/modules", () => ({
    FileStorageService: class FileStorageService {},
}));
jest.mock("@buildingai/db/entities", () => ({
    File: class File {},
}));
jest.mock("@buildingai/errors", () => {
    class HttpError extends Error {}
    return {
        HttpError,
        HttpErrorFactory: { badRequest: (message: string) => new HttpError(message) },
    };
});

const FILE_ID = "8eb0189a-54af-4b25-b91a-8d691cad4b9f";
const OTHER_FILE_ID = "a27d76fc-3511-4e05-8176-117054e93269";
const USER_ID = "ec166e49-7ce0-42a8-bdf4-c106c7f29429";
const IMAGE_PATH = `image/2026/11/${FILE_ID}.png`;
const IMAGE = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
    "base64",
);

function message(part: Partial<FileUIPart> = {}): UIMessage {
    return {
        id: "user-message",
        role: "user",
        parts: [
            {
                type: "file",
                mediaType: "image/png",
                url: `http://172.19.0.105/uploads/${IMAGE_PATH}`,
                filename: "image.png",
                providerMetadata: { buildingai: { fileId: FILE_ID } },
                ...part,
            },
        ],
    };
}

describe("ChatImageService", () => {
    let root: string;
    let records: UploadedFile[];
    let service: ChatImageService;
    let findOne: jest.Mock;
    let getFullPath: jest.Mock;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "buildingai-chat-image-"));
        records = [
            {
                id: FILE_ID,
                uploaderId: USER_ID,
                path: IMAGE_PATH,
                url: `http://172.19.0.105/uploads/${IMAGE_PATH}`,
                mimeType: "image/png",
                size: IMAGE.length,
                extensionIdentifier: null,
            } as UploadedFile,
        ];
        findOne = jest.fn(async ({ where }) =>
            records.find(
                (record) =>
                    (!where.id || where.id === record.id) &&
                    (!where.path ||
                        (where.path.type === "raw"
                            ? where.path.objectLiteralParameters.imagePath.toLowerCase() ===
                              record.path.toLowerCase()
                            : where.path === record.path)) &&
                    (where.extensionIdentifier === undefined ||
                        (typeof where.extensionIdentifier === "string"
                            ? where.extensionIdentifier === record.extensionIdentifier
                            : where.extensionIdentifier.type === "raw"
                              ? where.extensionIdentifier.objectLiteralParameters.imageExtensionId.toLowerCase() ===
                                record.extensionIdentifier?.toLowerCase()
                              : !record.extensionIdentifier)),
            ),
        );
        getFullPath = jest.fn((relativePath, options) =>
            path.join(root, options?.extensionId || "main", relativePath),
        );
        service = new ChatImageService(
            { findOne } as unknown as Repository<UploadedFile>,
            { getFullPath } as unknown as FileStorageService,
        );
        await mkdir(path.dirname(getFullPath(IMAGE_PATH)), { recursive: true });
        await writeFile(getFullPath(IMAGE_PATH), IMAGE);
        getFullPath.mockClear();
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it.each(["172.19.0.105", "10.0.0.20:8080", "192.168.10.50", "localhost:4090"])(
        "按附件 ID 读取图片，不绑定访问地址 %s",
        async (host) => {
            const original = message({ url: `http://${host}/uploads/${IMAGE_PATH}` });
            const prepared = await service.prepareMessages([original], USER_ID);
            const part = prepared[0].parts[0] as FileUIPart;

            expect(part.url).toBe(`data:image/png;base64,${IMAGE.toString("base64")}`);
            expect(part.providerMetadata?.buildingai).toBeUndefined();
            expect(original.parts[0]).toMatchObject({
                url: `http://${host}/uploads/${IMAGE_PATH}`,
                providerMetadata: { buildingai: { fileId: FILE_ID } },
            });
        },
    );

    it("通过存储路径兼容旧 IP 下没有附件 ID 的历史图片", async () => {
        const historical = message({
            url: `http://10.20.30.40:8080/uploads/${IMAGE_PATH}?version=1`,
            providerMetadata: undefined,
        });
        const latest: UIMessage = {
            id: "latest-message",
            role: "user",
            parts: [{ type: "text", text: "1+1?" }],
        };
        const prepared = await service.prepareMessages([historical, latest], USER_ID);

        expect((prepared[0].parts[0] as FileUIPart).url).toMatch(/^data:image\/png;base64,/);
        expect(prepared[1]).toEqual(latest);
        expect(findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ path: IMAGE_PATH }) }),
        );
    });

    it.each([true, false])("SDK 回归：历史图片内联，附件 ID=%s", async (hasId) => {
        const messages: UIMessage[] = [
            message(hasId ? {} : { providerMetadata: undefined }),
            { id: "latest", role: "user", parts: [{ type: "text", text: "1+1?" }] },
        ];
        const model = new MockLanguageModelV3({
            doGenerate: async () => {
                throw new Error("MOCK_MODEL_REACHED");
            },
        });
        const agent = new ToolLoopAgent({ model, maxRetries: 0 });

        await expect(
            agent.generate({ messages: await convertToModelMessages(messages) }),
        ).rejects.toThrow("URL with IP address 172.19.0.105 is not allowed");
        expect(model.doGenerateCalls).toHaveLength(0);

        const prepared = await service.prepareMessages(messages, USER_ID);
        await expect(
            agent.generate({ messages: await service.convertToModelMessages(prepared) }),
        ).rejects.toThrow("MOCK_MODEL_REACHED");
        expect(model.doGenerateCalls).toHaveLength(1);
        const prompt = model.doGenerateCalls[0].prompt.find((entry) => entry.role === "user");
        const filePart = prompt.content.find((part) => part.type === "file");
        expect(filePart).toMatchObject({ mediaType: "image/png" });
        const data = filePart.data;
        expect(
            typeof data === "string"
                ? Buffer.from(data, "base64")
                : Buffer.from(data as Uint8Array),
        ).toEqual(IMAGE);
        expect((messages[0].parts[0] as FileUIPart).url).toMatch(/^http:/);
    });

    it("调用模型前将内联图片变为二进制，而不是可下载的 URL", async () => {
        const original = message();
        const prepared = await service.prepareMessages([original], USER_ID);
        const converted = await service.convertToModelMessages(prepared);
        const user = converted.find((entry) => entry.role === "user");
        if (!Array.isArray(user.content)) throw new Error("应包含图片内容");
        const file = user.content.find((part) => part.type === "file");

        expect(file.data).toBeInstanceOf(Uint8Array);
        expect(Buffer.from(file.data as Uint8Array)).toEqual(IMAGE);
        expect(file).toMatchObject({ mediaType: "image/png", filename: "image.png" });
        expect((original.parts[0] as FileUIPart).url).toMatch(/^http:/);
    });

    it("模型转换不将外部图片或普通文档变为图片二进制", async () => {
        const converted = await service.convertToModelMessages([
            message({ url: "https://example.com/image.png", providerMetadata: undefined }),
            message({ mediaType: "application/pdf" }),
        ]);
        const files = converted.flatMap((entry) =>
            entry.role === "user" && Array.isArray(entry.content)
                ? entry.content.filter((part) => part.type === "file")
                : [],
        );
        expect(files[0].data.toString()).toBe("https://example.com/image.png");
        expect(files[1]).toMatchObject({ mediaType: "application/pdf" });
        expect(files[1].data.toString()).toMatch(/^http:/);
    });

    it("SDK 流式调用同样直接接收二进制图片", async () => {
        const model = new MockLanguageModelV3({
            doStream: async () => ({
                stream: new ReadableStream({
                    start(controller) {
                        controller.enqueue({ type: "stream-start", warnings: [] });
                        controller.enqueue({ type: "text-start", id: "text-1" });
                        controller.enqueue({ type: "text-delta", id: "text-1", delta: "ok" });
                        controller.enqueue({ type: "text-end", id: "text-1" });
                        controller.enqueue({
                            type: "finish",
                            finishReason: { unified: "stop", raw: "stop" },
                            usage: {
                                inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
                                outputTokens: { total: 0, text: 0, reasoning: 0 },
                            },
                        });
                        controller.close();
                    },
                }),
            }),
        });
        const prepared = await service.prepareMessages([message()], USER_ID);
        const agent = new ToolLoopAgent({ model, maxRetries: 0 });
        const result = await agent.stream({
            messages: await service.convertToModelMessages(prepared),
        });
        expect(await result.text).toBe("ok");
        expect(model.doStreamCalls).toHaveLength(1);
        const prompt = model.doStreamCalls[0].prompt.find((entry) => entry.role === "user");
        const file = prompt.content.find((part) => part.type === "file");
        expect(file.data).toBeInstanceOf(Uint8Array);
        expect(Buffer.from(file.data as Uint8Array)).toEqual(IMAGE);
    });

    it("同一次请求重复引用同一图片时只读取一次文件", async () => {
        const prepared = await service.prepareMessages([message(), message()], USER_ID);

        expect(prepared[0].parts).toEqual(prepared[1].parts);
        expect(getFullPath).toHaveBeenCalledTimes(2);
    });

    it.each([undefined, "", "another-user"])("拒绝无权访问的用户：%s", async (userId) => {
        await expect(service.prepareMessages([message()], userId)).rejects.toThrow(
            "图片不存在或无权访问",
        );
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("旧消息同样执行附件归属校验", async () => {
        await expect(
            service.prepareMessages([message({ providerMetadata: undefined })], "another-user"),
        ).rejects.toThrow("图片不存在或无权访问");
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("无效附件 ID 不回退到 URL", async () => {
        await expect(
            service.prepareMessages(
                [message({ providerMetadata: { buildingai: { fileId: "invalid" } } })],
                USER_ID,
            ),
        ).rejects.toThrow("附件 ID 无效");
        expect(findOne).not.toHaveBeenCalled();
    });

    it("附件记录不存在时明确报错", async () => {
        records = [];
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
            "图片不存在或无权访问",
        );
    });

    it("历史图片记录不存在时提示重新上传，不静默丢弃", async () => {
        records = [];
        await expect(
            service.prepareMessages([message({ providerMetadata: undefined })], USER_ID),
        ).rejects.toThrow("图片不存在或无权访问");
    });

    it("不允许重复登记其他用户图片路径来伪造附件所有权", async () => {
        records[0].uploaderId = "another-user";
        records.push({ ...records[0], id: OTHER_FILE_ID, uploaderId: USER_ID });

        await expect(
            service.prepareMessages(
                [message({ providerMetadata: { buildingai: { fileId: OTHER_FILE_ID } } })],
                USER_ID,
            ),
        ).rejects.toThrow("图片不存在或无权访问");
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("不允许在大小写不敏感的文件系统上通过路径大小写伪造所有权", async () => {
        records[0].uploaderId = "another-user";
        records.push({
            ...records[0],
            id: OTHER_FILE_ID,
            uploaderId: USER_ID,
            path: IMAGE_PATH.toUpperCase(),
            url: `http://172.19.0.105/uploads/${IMAGE_PATH.toUpperCase()}`,
        });

        await expect(
            service.prepareMessages(
                [message({ providerMetadata: { buildingai: { fileId: OTHER_FILE_ID } } })],
                USER_ID,
            ),
        ).rejects.toThrow("图片不存在或无权访问");
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("不带附件 ID 的路径查找也不能绕过原始附件归属检查", async () => {
        records[0].uploaderId = "another-user";
        records.push({
            ...records[0],
            id: OTHER_FILE_ID,
            uploaderId: USER_ID,
            path: IMAGE_PATH.toUpperCase(),
            url: `http://172.19.0.105/uploads/${IMAGE_PATH.toUpperCase()}`,
        });

        await expect(
            service.prepareMessages(
                [
                    message({
                        url: records[1].url,
                        providerMetadata: undefined,
                    }),
                ],
                USER_ID,
            ),
        ).rejects.toThrow("图片不存在或无权访问");
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("从插件对应的上传目录读取图片", async () => {
        records[0].extensionIdentifier = "buildingai-blog";
        records[0].url = `http://172.19.0.105/buildingai-blog/uploads/${IMAGE_PATH}`;
        const target = getFullPath(IMAGE_PATH, { extensionId: "buildingai-blog" });
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, IMAGE);

        const prepared = await service.prepareMessages([message()], USER_ID);

        expect((prepared[0].parts[0] as FileUIPart).url).toMatch(/^data:image\/png;base64,/);
        expect(getFullPath).toHaveBeenCalledWith(IMAGE_PATH, { extensionId: "buildingai-blog" });
    });

    it.each(["../outside.png", "/outside.png", IMAGE_PATH.replace("image/", "image//")])(
        "拒绝不安全的存储路径：%s",
        async (filePath) => {
            records[0].path = filePath;
            await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
                "图片存储路径无效",
            );
        },
    );

    it("拒绝通过插件标识跳出上传目录", async () => {
        records[0].extensionIdentifier = "../outside";
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
            "图片存储路径无效",
        );
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("拒绝指向上传目录外的符号链接", async () => {
        const outside = path.join(root, "outside.png");
        await writeFile(outside, IMAGE);
        await rm(getFullPath(IMAGE_PATH));
        await symlink(outside, getFullPath(IMAGE_PATH));

        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
            "图片存储路径无效",
        );
    });

    it("图片丢失时提示重新上传", async () => {
        await rm(getFullPath(IMAGE_PATH));
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
            "图片读取失败，请重新上传",
        );
    });

    it("拒绝把非图片内容伪装成图片传给模型", async () => {
        await writeFile(getFullPath(IMAGE_PATH), "not an image");
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow(
            "不支持的图片格式或图片内容无效",
        );
    });

    it("实际图片类型优先于客户端声明", async () => {
        const prepared = await service.prepareMessages(
            [message({ mediaType: "image/jpeg" })],
            USER_ID,
        );
        expect(prepared[0].parts[0]).toMatchObject({ mediaType: "image/png" });
    });

    it("读取前拒绝元数据中超过 10 MiB 的图片", async () => {
        records[0].size = 10 * 1024 * 1024 + 1;
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow("10 MiB");
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("实际文件大小超过限制时不能通过伪造元数据绕过", async () => {
        await writeFile(getFullPath(IMAGE_PATH), Buffer.alloc(10 * 1024 * 1024 + 1));
        await expect(service.prepareMessages([message()], USER_ID)).rejects.toThrow("10 MiB");
    });

    it("累计图片内容超过 30 MiB 时拒绝请求，包括重复引用", async () => {
        const largeImage = Buffer.alloc(8 * 1024 * 1024);
        IMAGE.copy(largeImage);
        records[0].size = largeImage.length;
        await writeFile(getFullPath(IMAGE_PATH), largeImage);

        await expect(
            service.prepareMessages([message(), message(), message(), message()], USER_ID),
        ).rejects.toThrow("30 MiB");
    });

    it("保留其他厂商的附件元数据", async () => {
        const prepared = await service.prepareMessages(
            [
                message({
                    providerMetadata: {
                        buildingai: { fileId: FILE_ID },
                        openai: { imageDetail: "high" },
                    },
                }),
            ],
            USER_ID,
        );
        expect((prepared[0].parts[0] as FileUIPart).providerMetadata).toEqual({
            openai: { imageDetail: "high" },
        });
    });

    it("云存储附件保持远程 URL，不尝试读取本地磁盘", async () => {
        records[0].path = `uploads/${IMAGE_PATH}`;
        const prepared = await service.prepareMessages([message()], USER_ID);

        expect((prepared[0].parts[0] as FileUIPart).url).toBe(records[0].url);
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("带签名参数的云存储附件也不误读为本地文件", async () => {
        records[0].path = `uploads/${IMAGE_PATH}`;
        records[0].url += "?signature=test";

        const prepared = await service.prepareMessages([message()], USER_ID);
        expect((prepared[0].parts[0] as FileUIPart).url).toBe(records[0].url);
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("兼容没有附件 ID 的云存储历史图片", async () => {
        records[0].path = `uploads/${IMAGE_PATH}`;

        const prepared = await service.prepareMessages(
            [message({ providerMetadata: undefined })],
            USER_ID,
        );
        expect((prepared[0].parts[0] as FileUIPart).url).toBe(records[0].url);
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("请求取消后不继续读取图片", async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(
            service.prepareMessages([message()], USER_ID, controller.signal),
        ).rejects.toMatchObject({ name: "AbortError" });
        expect(findOne).not.toHaveBeenCalled();
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("外部图片和已有内联图片保持原处理方式", async () => {
        const messages = [
            message({ url: "https://example.com/image.png", providerMetadata: undefined }),
            message({
                url: `data:image/png;base64,${IMAGE.toString("base64")}`,
                providerMetadata: undefined,
            }),
        ];
        expect(await service.prepareMessages(messages, USER_ID)).toEqual(messages);
        expect(findOne).not.toHaveBeenCalled();
        expect(getFullPath).not.toHaveBeenCalled();
    });

    it("不改动纯文本、文档、音视频消息", async () => {
        const messages: UIMessage[] = [
            {
                id: "text-message",
                role: "user",
                parts: [{ type: "text", text: "hello" }],
            },
            message({ mediaType: "application/pdf" }),
            message({ mediaType: "video/mp4" }),
            message({ mediaType: "audio/mpeg" }),
        ];
        expect(await service.prepareMessages(messages, USER_ID)).toEqual(messages);
        expect(findOne).not.toHaveBeenCalled();
    });
});
