export interface ModerationModelV1 {
    readonly modelId: string;
    readonly provider: string;
    doModerate(params: ModerationParams): Promise<ModerationResult>;
}

export interface ModerationParams {
    input: string | string[];
}

export interface ModerationResult {
    results: ModerationResultItem[];
    model: string;
}

export interface ModerationResultItem {
    flagged: boolean;
    categories: ModerationCategories;
    categoryScores: ModerationCategoryScores;
}

export interface ModerationCategories {
    hate: boolean;
    "hate/threatening": boolean;
    harassment: boolean;
    "harassment/threatening": boolean;
    "self-harm": boolean;
    "self-harm/intent": boolean;
    "self-harm/instructions": boolean;
    sexual: boolean;
    "sexual/minors": boolean;
    violence: boolean;
    "violence/graphic": boolean;
}

export interface ModerationCategoryScores {
    hate: number;
    "hate/threatening": number;
    harassment: number;
    "harassment/threatening": number;
    "self-harm": number;
    "self-harm/intent": number;
    "self-harm/instructions": number;
    sexual: number;
    "sexual/minors": number;
    violence: number;
    "violence/graphic": number;
}
