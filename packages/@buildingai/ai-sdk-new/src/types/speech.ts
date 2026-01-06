export interface SpeechModelV1 {
    readonly modelId: string;
    readonly provider: string;
    doGenerate(params: SpeechGenerateParams): Promise<SpeechGenerateResult>;
}

export interface SpeechGenerateParams {
    text: string;
    voice?: string;
    speed?: number;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export interface SpeechGenerateResult {
    audio: ArrayBuffer;
    format: string;
}

export interface TranscriptionModelV1 {
    readonly modelId: string;
    readonly provider: string;
    doTranscribe(params: TranscriptionParams): Promise<TranscriptionResult>;
}

export interface TranscriptionParams {
    audio: ArrayBuffer | Blob | File;
    language?: string;
    prompt?: string;
    responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
    temperature?: number;
}

export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
}
