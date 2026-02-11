/**
 * Common prompts that can be used across different modules
 */

export const GENERATE_TITLE_PROMPT = (content: string) =>
    `Generate a concise title (max 10 words) for this conversation. Rules: use the SAME language as the content, output ONLY the title, no quotes or punctuation wrapping.\n\nContent: ${content}`;
