/**
 * Parameter processor
 * Responsible for processing and transforming request parameters
 */
export class ParamsProcessor {
    /** Custom parameter processing function */
    private processor: (params: Record<string, unknown>) => Record<string, unknown> = (params) =>
        params;

    /**
     * Set parameter processor
     * @param processor Parameter processing function
     */
    setProcessor(processor: (params: Record<string, unknown>) => Record<string, unknown>): void {
        this.processor = processor;
    }

    /**
     * Process parameters
     * @param params Original parameters
     * @returns Processed parameters
     */
    process(params: Record<string, unknown>): Record<string, unknown> {
        return this.processor(params);
    }
}
