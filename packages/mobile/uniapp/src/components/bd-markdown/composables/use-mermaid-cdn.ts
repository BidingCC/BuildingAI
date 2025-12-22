import { STORAGE_KEYS } from "@buildingai/constants/web";
import { computed, watch } from "vue";

type Mermaid = {
    initialize: (config: any) => void;
    render: (id: string, code: string, container?: HTMLElement) => Promise<any>;
    parse: (code: string) => Promise<void>;
};

const MERMAID_CDN_BASE = "https://esm.sh/mermaid@11.12.1";

let globalMermaid: Mermaid | null = null;
let globalMermaidPromise: Promise<Mermaid> | null = null;

async function loadMermaidInstance(): Promise<Mermaid> {
    if (globalMermaid) return globalMermaid;
    if (globalMermaidPromise) return await globalMermaidPromise;

    globalMermaidPromise = (async () => {
        const mermaidModule = await import(/* @vite-ignore */ `${MERMAID_CDN_BASE}`);
        const mermaid = mermaidModule.default || mermaidModule;

        globalMermaid = mermaid;
        return mermaid;
    })();

    return await globalMermaidPromise;
}

export function useMermaidCdn() {
    const mermaidThemeCookie = useCookie<string>(STORAGE_KEYS.MERMAID_THEME);
    const selectedTheme = computed(() => mermaidThemeCookie.value || "default");

    const getMermaid = async (): Promise<Mermaid | null> => {
        if (!globalMermaid) {
            await loadMermaidInstance();
        }
        return globalMermaid;
    };

    const initializeMermaid = async (theme?: string): Promise<void> => {
        const mermaid = await getMermaid();
        if (!mermaid) return;

        try {
            const validThemes = ["default", "base", "dark", "forest", "neutral"] as const;
            type ValidTheme = (typeof validThemes)[number];
            const themeValue = theme || selectedTheme.value || "default";
            const validTheme: ValidTheme = validThemes.includes(themeValue as ValidTheme)
                ? (themeValue as ValidTheme)
                : "default";

            mermaid.initialize({
                startOnLoad: false,
                securityLevel: "loose",
                theme: validTheme,
            });
        } catch (error) {
            console.warn("Failed to initialize mermaid:", error);
        }
    };

    watch(selectedTheme, () => {
        if (globalMermaid) initializeMermaid();
    });

    return {
        getMermaid,
        initializeMermaid,
        selectedTheme,
    };
}
