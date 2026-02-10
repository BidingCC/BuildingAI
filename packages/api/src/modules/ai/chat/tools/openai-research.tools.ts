import type { AIProvider } from "@buildingai/ai-sdk-new";
import { tool } from "ai";
import { z } from "zod";

/**
 * 创建深度研究工具
 */
export function createDeepResearchTool(provider: AIProvider) {
    return tool({
        description:
            "使用 OpenAI 的专用研究模型（o3-deep-research、o4-mini-deep-research）进行全面的研究和分析。该工具可以从数百个来源查找、分析和综合信息，生成带有正确引用的详细报告。适用于需要深入研究和多源信息综合的复杂问题。",
        inputSchema: z.object({
            query: z.string().describe("研究主题或问题，需要详细描述研究目标和范围"),
            model: z
                .enum(["o3-deep-research", "o4-mini-deep-research", "gpt-4o"])
                .default("o3-deep-research")
                .describe(
                    "使用的研究模型：o3-deep-research（完整版）或 o4-mini-deep-research（精简版）",
                ),
            maxSources: z
                .number()
                .int()
                .min(1)
                .max(500)
                .default(100)
                .optional()
                .describe("最大搜索来源数量"),
            focusAreas: z.array(z.string()).optional().describe("重点研究领域或主题列表"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                // 检查模型是否可用（o3-deep-research 和 o4-mini-deep-research 是 OpenAI 的研究模型）
                // 如果模型不存在，尝试使用 gpt-4o 或 gpt-4-turbo 作为替代
                let modelId = input.model;
                try {
                    provider.languageModel(modelId);
                } catch {
                    // 如果研究模型不可用，使用 gpt-4o 作为替代
                    modelId = "gpt-4o";
                }

                const languageModel = provider.languageModel(modelId);

                // 构建研究提示
                const researchPrompt = `请对以下主题进行深度研究和分析：

研究主题：${input.query}
${input.focusAreas ? `重点领域：${input.focusAreas.join(", ")}` : ""}
${input.maxSources ? `最大来源数：${input.maxSources}` : ""}

请执行以下任务：
1. 从多个可靠来源收集相关信息
2. 分析和综合收集到的信息
3. 生成一份详细的研究报告，包括：
   - 执行摘要
   - 主要发现
   - 详细分析
   - 数据支持
   - 结论和建议
   - 所有引用的来源

请确保报告准确、全面，并包含所有引用的正确来源。如果使用了研究模型，请充分利用其多源搜索和分析能力。`;

                // 调用模型进行研究
                const { generateText } = await import("ai");
                const result = await generateText({
                    model: languageModel,
                    prompt: researchPrompt,
                });

                return {
                    success: true,
                    report: result.text,
                    model: modelId,
                    query: input.query,
                    sources: (result as any).experimental_providerMetadata?.sources || [],
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message || "深度研究失败",
                };
            }
        },
    });
}
