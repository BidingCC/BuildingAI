import type { AiProvider } from "@buildingai/services/web";

import type { Model } from "../types";

export function convertProvidersToModels(providers: AiProvider[]): Model[] {
  const models: Model[] = [];
  const modelMap = new Map<string, Model>();

  providers.forEach((provider) => {
    if (!provider.models || provider.models.length === 0) {
      return;
    }

    provider.models.forEach((model) => {
      if (!model.isActive) {
        return;
      }

      const modelKey = model.model || model.id;

      if (modelMap.has(modelKey)) {
        const existingModel = modelMap.get(modelKey)!;
        if (!existingModel.providers.includes(provider.provider)) {
          existingModel.providers.push(provider.provider);
        }
      } else {
        const newModel: Model = {
          id: model.id,
          name: model.name,
          chef: provider.name,
          chefSlug: provider.provider,
          providers: [provider.provider],
          features: model.features,
          billingRule: model.billingRule,
        };
        modelMap.set(modelKey, newModel);
        models.push(newModel);
      }
    });
  });

  return models;
}
