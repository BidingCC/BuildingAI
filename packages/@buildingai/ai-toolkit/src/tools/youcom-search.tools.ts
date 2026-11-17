import { tool } from "ai";
import { z } from "zod";

const YOUCOM_SEARCH_URL = "https://ydc-index.io/v1/search";

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

interface YoucomSearchResponse {
    results?: SearchResult[];
}

async function fetchJsonWithRetry(
    url: string,
    options?: RequestInit,
    retries = 2,
    timeoutMs = 15000,
): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP_${response.status}`);
                }

                return await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError instanceof Error ? lastError : new Error("FETCH_FAILED");
}

export const youcomSearch = tool({
    description:
        "Search the web for up-to-date information using You.com Search API. Use this tool when you need to find current events, latest news, real-time data, or any information that may not be in your training data. Input should be a self-contained search query.",
    inputSchema: z.object({
        query: z.string().describe("The search query — be specific and include key terms"),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(20)
            .default(10)
            .optional()
            .describe("Maximum number of results to return, between 1 and 20"),
    }),
    needsApproval: false,
    execute: async (input) => {
        const apiKey = process.env.YOUCOM_API_KEY;

        const payload: Record<string, unknown> = {
            query: input.query,
            count: input.maxResults ?? 10,
        };

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        if (apiKey) {
            headers["X-API-Key"] = apiKey;
        }

        let data: YoucomSearchResponse;
        try {
            data = (await fetchJsonWithRetry(
                YOUCOM_SEARCH_URL,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                },
                2,
                15000,
            )) as YoucomSearchResponse;
        } catch (error) {
            return {
                success: false,
                error: `You.com Search request failed: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
            };
        }

        const results = data?.results;
        if (!results || results.length === 0) {
            return { success: true, results: [], message: "No results found" };
        }

        return {
            success: true,
            results: results.slice(0, input.maxResults ?? 10).map((r) => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
            })),
        };
    },
});
