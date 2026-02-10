import type { AIProvider, ImageModelV1 } from "@buildingai/ai-sdk-new";
import { generateImage } from "@buildingai/ai-sdk-new";
import { tool } from "ai";
import { z } from "zod";

/**
 * 创建 DALL-E 2 图像生成工具
 */
export function createDalle2ImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "使用 DALL-E 2 根据文本描述生成图像。DALL-E 2 是 OpenAI 的图像生成模型，可以根据详细的文本提示创建高质量的图像。",
        inputSchema: z.object({
            prompt: z.string().describe("详细的图像描述，包括风格、颜色、构图等细节"),
            size: z
                .enum(["256x256", "512x512", "1024x1024"])
                .default("1024x1024")
                .describe("生成图像的尺寸"),
            n: z.number().int().min(1).max(10).default(1).describe("生成图像的数量"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel("dall-e-2") as ImageModelV1;
                const result = await generateImage({
                    model: imageModel,
                    prompt: input.prompt,
                    size: input.size,
                    n: input.n,
                });

                return {
                    success: true,
                    images: result.images.map((img) => ({
                        url: img.url,
                        revisedPrompt: img.revisedPrompt || undefined,
                    })),
                    model: "dall-e-2",
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message || "图像生成失败",
                };
            }
        },
    });
}

/**
 * 创建 DALL-E 3 图像生成工具
 */
export function createDalle3ImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "使用 DALL-E 3 根据文本描述生成高质量图像。DALL-E 3 是 OpenAI 最先进的图像生成技术，图像质量更高，生成速度更快，能够更好地理解复杂的文本提示。",
        inputSchema: z.object({
            prompt: z.string().describe("详细的图像描述，包括风格、颜色、构图等细节"),
            size: z
                .enum(["1024x1024", "1792x1024", "1024x1792"])
                .default("1024x1024")
                .describe("生成图像的尺寸"),
            quality: z
                .enum(["standard", "hd"])
                .default("standard")
                .describe("图像质量：standard（标准）或 hd（高清）"),
            style: z
                .enum(["vivid", "natural"])
                .default("vivid")
                .describe("图像风格：vivid（生动）或 natural（自然）"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel("dall-e-3") as ImageModelV1;
                const result = await generateImage({
                    model: imageModel,
                    prompt: input.prompt,
                    size: input.size,
                    quality: input.quality,
                    style: input.style,
                    n: 1, // DALL-E 3 只支持生成 1 张图像
                });

                return {
                    success: true,
                    images: result.images.map((img) => ({
                        url: img.url,
                        revisedPrompt: img.revisedPrompt || undefined,
                    })),
                    model: "dall-e-3",
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message || "图像生成失败",
                };
            }
        },
    });
}

/**
 * 创建 GPT 图像生成工具（通用）
 */
export function createGptImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "使用 GPT 图像生成模型根据文本描述生成图像。这是一个通用的图像生成工具，可以根据文本提示创建各种风格的图像。",
        inputSchema: z.object({
            prompt: z.string().describe("详细的图像描述，包括风格、颜色、构图等细节"),
            model: z
                .string()
                .default("dall-e-3")
                .describe("使用的图像生成模型（dall-e-2 或 dall-e-3）"),
            size: z.string().default("1024x1024").describe("生成图像的尺寸"),
            quality: z.enum(["standard", "hd"]).optional().describe("图像质量（仅 DALL-E 3 支持）"),
            style: z.enum(["vivid", "natural"]).optional().describe("图像风格（仅 DALL-E 3 支持）"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel(input.model) as ImageModelV1;
                const result = await generateImage({
                    model: imageModel,
                    prompt: input.prompt,
                    size: input.size as any,
                    quality: input.quality,
                    style: input.style,
                    n: input.model === "dall-e-3" ? 1 : 1,
                });

                return {
                    success: true,
                    images: result.images.map((img) => ({
                        url: img.url,
                        revisedPrompt: img.revisedPrompt || undefined,
                    })),
                    model: input.model,
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message || "图像生成失败",
                };
            }
        },
    });
}
