/**
 * Vectorization module exports
 *
 * This module provides a complete solution for document and dataset vectorization:
 * - VectorizationService: Main coordinator for vectorization workflows
 * - GeneratorService: Batch embedding generation
 * - StateService: State and progress management
 * - ModelAdapterService: AI model integration
 */

// Main service (entry point)
export { VectorizationService } from "./vectorization.service";

// Sub-services
export { GeneratorService } from "./generator.service";
export { ModelAdapterService } from "./model-adapter.service";
export { StateService } from "./state.service";
