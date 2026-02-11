import type { AIProvider } from "@buildingai/ai-sdk-new";
import { tool } from "ai";
import { z } from "zod";

export function createDeepResearchTool(provider: AIProvider) {
    return tool({
        description:
            "Use OpenAI's specialized research models (o3-deep-research, o4-mini-deep-research) for comprehensive research and analysis. This tool can find, analyze, and synthesize information from hundreds of sources, generating detailed reports with proper citations. Suitable for complex problems requiring in-depth research and multi-source information synthesis.",
        inputSchema: z.object({
            query: z
                .string()
                .describe(
                    "Research topic or question, requiring detailed description of research objectives and scope",
                ),
            model: z
                .enum(["o3-deep-research", "o4-mini-deep-research", "gpt-4o"])
                .default("o3-deep-research")
                .describe(
                    "Research model to use: o3-deep-research (full version) or o4-mini-deep-research (compact version)",
                ),
            maxSources: z
                .number()
                .int()
                .min(1)
                .max(500)
                .default(100)
                .optional()
                .describe("Maximum number of search sources"),
            focusAreas: z
                .array(z.string())
                .optional()
                .describe("List of key research areas or topics"),
        }),
        needsApproval: true,
        execute: async (input) => {
            try {
                let modelId = input.model;
                try {
                    provider.languageModel(modelId);
                } catch {
                    modelId = "gpt-4o";
                }

                const languageModel = provider.languageModel(modelId);

                const researchPrompt = `Please conduct deep research and analysis on the following topic:

Research Topic: ${input.query}
${input.focusAreas ? `Focus Areas: ${input.focusAreas.join(", ")}` : ""}
${input.maxSources ? `Maximum Sources: ${input.maxSources}` : ""}

Please perform the following tasks:
1. Collect relevant information from multiple reliable sources
2. Analyze and synthesize the collected information
3. Generate a detailed research report including:
   - Executive summary
   - Key findings
   - Detailed analysis
   - Data support
   - Conclusions and recommendations
   - All cited sources

Please ensure the report is accurate, comprehensive, and includes correct sources for all citations. If using a research model, please fully utilize its multi-source search and analysis capabilities.`;

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
                    error: error.message || "Deep research failed",
                };
            }
        },
    });
}
