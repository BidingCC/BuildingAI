import type { AIProvider, ImageModelV1 } from "@buildingai/ai-sdk-new";
import { generateImage } from "@buildingai/ai-sdk-new";
import { tool } from "ai";
import { z } from "zod";

export function createDalle2ImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "Generate images from text descriptions using DALL-E 2. DALL-E 2 is OpenAI's image generation model that can create high-quality images based on detailed text prompts.",
        inputSchema: z.object({
            prompt: z
                .string()
                .describe(
                    "Detailed image description including style, colors, composition and other details",
                ),
            size: z
                .enum(["256x256", "512x512", "1024x1024"])
                .default("1024x1024")
                .describe("Size of the generated image"),
            n: z.number().int().min(1).max(10).default(1).describe("Number of images to generate"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel!("dall-e-2") as ImageModelV1;
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
                    error: error.message || "Image generation failed",
                };
            }
        },
    });
}

export function createDalle3ImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "Generate high-quality images from text descriptions using DALL-E 3. DALL-E 3 is OpenAI's most advanced image generation technology with higher image quality, faster generation speed, and better understanding of complex text prompts.",
        inputSchema: z.object({
            prompt: z
                .string()
                .describe(
                    "Detailed image description including style, colors, composition and other details",
                ),
            size: z
                .enum(["1024x1024", "1792x1024", "1024x1792"])
                .default("1024x1024")
                .describe("Size of the generated image"),
            quality: z
                .enum(["standard", "hd"])
                .default("standard")
                .describe("Image quality: standard (standard) or hd (high definition)"),
            style: z
                .enum(["vivid", "natural"])
                .default("vivid")
                .describe("Image style: vivid (vibrant) or natural (natural)"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel!("dall-e-3") as ImageModelV1;
                const result = await generateImage({
                    model: imageModel,
                    prompt: input.prompt,
                    size: input.size,
                    quality: input.quality,
                    style: input.style,
                    n: 1,
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
                    error: error.message || "Image generation failed",
                };
            }
        },
    });
}

export function createGptImageGenerationTool(provider: AIProvider) {
    return tool({
        description:
            "Generate images from text descriptions using GPT image generation model. This is a general-purpose image generation tool that can create images in various styles based on text prompts.",
        inputSchema: z.object({
            prompt: z
                .string()
                .describe(
                    "Detailed image description including style, colors, composition and other details",
                ),
            model: z
                .string()
                .default("dall-e-3")
                .describe("Image generation model to use (dall-e-2 or dall-e-3)"),
            size: z.string().default("1024x1024").describe("Size of the generated image"),
            quality: z
                .enum(["standard", "hd"])
                .optional()
                .describe("Image quality (only supported by DALL-E 3)"),
            style: z
                .enum(["vivid", "natural"])
                .optional()
                .describe("Image style (only supported by DALL-E 3)"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                const imageModel = provider.imageModel!(input.model) as ImageModelV1;
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
                    error: error.message || "Image generation failed",
                };
            }
        },
    });
}
