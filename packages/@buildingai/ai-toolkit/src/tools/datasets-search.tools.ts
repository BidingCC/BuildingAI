import type { RetrievalResult } from "@buildingai/types/ai/retrieval-config.interface";
import { tool } from "ai";
import { z } from "zod";

export interface DatasetsSearchResult {
    index: number;
    source: string;
    sourceUrl?: string;
    relevanceScore: number;
    content: string;
}

export interface CreateDatasetsSearchToolOptions {
    retrieve: (query: string) => Promise<RetrievalResult>;
}

export function createDatasetsSearchTool(options: CreateDatasetsSearchToolOptions) {
    const { retrieve } = options;
    const seenChunkIds = new Set<string>();

    return tool({
        description: [
            "Search the datasets for information relevant to the user's question.",
            "WHEN TO USE: Call this tool whenever the user asks a factual question, requests explanation, or needs information that could exist in uploaded documents.",
            "WHEN NOT TO USE: Do NOT call this for greetings, thanks, casual chat, or when the user asks you to summarize/rephrase your previous answer.",
            "QUERY TIPS: Rewrite the query to be self-contained — incorporate context from the conversation history. For complex questions, call this tool multiple times with different focused queries.",
        ].join(" "),
        inputSchema: z.object({
            queries: z
                .array(z.string())
                .min(1)
                .max(3)
                .describe(
                    "One to three search queries. For simple questions use one query. For complex or multi-faceted questions, decompose into multiple focused queries. Each query should be self-contained and incorporate relevant context from the conversation.",
                ),
        }),
        execute: async ({ queries }) => {
            const allChunks = await Promise.all(queries.map((q) => retrieve(q)));
            const results: DatasetsSearchResult[] = [];
            for (const r of allChunks) {
                for (const chunk of r.chunks) {
                    if (seenChunkIds.has(chunk.id)) continue;
                    seenChunkIds.add(chunk.id);
                    results.push({
                        index: seenChunkIds.size,
                        source: chunk.fileName || chunk.content.slice(0, 60),
                        sourceUrl: (chunk.metadata?.fileUrl as string) || undefined,
                        relevanceScore: Math.round((chunk.score ?? 0) * 1000) / 1000,
                        content: chunk.content,
                    });
                }
            }
            if (results.length === 0) {
                return { found: false, results: [] };
            }
            return { found: true, results };
        },
    });
}
