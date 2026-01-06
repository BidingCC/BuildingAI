import type { ModerationModelV1, ModerationResult } from "../types";

export interface ModerateRequest {
    model: ModerationModelV1;
    input: string | string[];
}

export async function moderate(params: ModerateRequest): Promise<ModerationResult> {
    const { model, input } = params;
    return model.doModerate({ input });
}
