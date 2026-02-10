import type { StateCreator } from "zustand";

import { createStore } from "../create-store";

const PERSIST_KEY = "assistant";
const LEGACY_SELECTED_MODEL_KEY = "__selected_model_id__";

export interface AssistantState {
    selectedModelId: string;
}

export interface AssistantActions {
    setSelectedModelId: (id: string) => void;
}

export type AssistantSlice = AssistantState & AssistantActions;

export const createAssistantSlice: StateCreator<AssistantSlice, [], [], AssistantSlice> = (
    set,
) => ({
    selectedModelId: "",
    setSelectedModelId: (id) => set({ selectedModelId: id }),
});

export const useAssistantStore = createStore<AssistantSlice>(createAssistantSlice, {
    persist: {
        name: PERSIST_KEY,
        partialize: (state) => ({ selectedModelId: state.selectedModelId }),
        merge: (persisted, current) => {
            const p = persisted as { selectedModelId?: string } | undefined;
            if (p?.selectedModelId != null) return { selectedModelId: p.selectedModelId };
            return { selectedModelId: current.selectedModelId };
        },
        migrate: (storage) => {
            const fromLegacy = storage.getItem(LEGACY_SELECTED_MODEL_KEY);
            if (fromLegacy) return { selectedModelId: fromLegacy };
            return undefined;
        },
    },
});
