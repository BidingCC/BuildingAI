import { ModelFeatureType, ModelType } from "../interfaces";

export interface ModelProperties {
    context_size?: number;
    mode?: string;
    [key: string]: any;
}

export interface ModelConfig {
    model: string;
    label: string;
    model_type: ModelType;
    features: ModelFeatureType[];
    model_properties: ModelProperties;
    deprecated: boolean;
    icon_url?: string;
}

export interface ProviderConfig {
    provider: string;
    label: string;
    icon_url?: string;
    supported_model_types: ModelType[];
    models: ModelConfig[];
}
