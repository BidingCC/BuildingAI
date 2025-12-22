import { STORAGE_KEYS } from "@buildingai/constants/web";
import { computed, watch } from "vue";

type Highlighter = any;

const SHIKI_CDN_BASE = "https://esm.sh/shiki@3.14.0";

let globalHighlighter: Highlighter | null = null;
let globalHighlighterPromise: Promise<Highlighter> | null = null;
const loadedLanguages = new Set<string>();
const loadingLanguages = new Set<string>();

async function loadShikiInstance(theme: string): Promise<Highlighter> {
    if (globalHighlighter) return globalHighlighter;
    if (globalHighlighterPromise) return await globalHighlighterPromise;

    globalHighlighterPromise = (async () => {
        const shikiModule = await import(/* @vite-ignore */ SHIKI_CDN_BASE);
        const createHighlighter = shikiModule.createHighlighter;

        if (typeof createHighlighter !== "function") {
            throw new Error("createHighlighter is not a function");
        }

        const themeModule = await import(
            /* @vite-ignore */ `${SHIKI_CDN_BASE}/themes/${theme}.mjs`
        );
        const themeData = themeModule.default || themeModule;

        const instance = await createHighlighter({
            themes: [themeData],
            langs: [],
        });

        globalHighlighter = instance;
        return instance;
    })();

    return await globalHighlighterPromise;
}

async function loadLanguage(language: string): Promise<boolean> {
    if (!language || language === "text") return true;
    if (!globalHighlighter) return false;
    if (loadedLanguages.has(language)) return true;

    if (loadingLanguages.has(language)) {
        while (loadingLanguages.has(language)) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return loadedLanguages.has(language);
    }

    try {
        loadingLanguages.add(language);
        const langModule = await import(
            /* @vite-ignore */ `${SHIKI_CDN_BASE}/langs/${language}.mjs`
        );
        await globalHighlighter.loadLanguage(langModule.default || langModule);
        loadedLanguages.add(language);
        return true;
    } catch (error) {
        console.warn(`Failed to load language "${language}":`, error);
        return false;
    } finally {
        loadingLanguages.delete(language);
    }
}

async function loadTheme(theme: string): Promise<void> {
    if (!globalHighlighter) return;

    try {
        const themeModule = await import(
            /* @vite-ignore */ `${SHIKI_CDN_BASE}/themes/${theme}.mjs`
        );
        await globalHighlighter.loadTheme(themeModule.default || themeModule);
    } catch (error) {
        console.warn(`Failed to load theme "${theme}":`, error);
    }
}

export function useShikiCdn() {
    const highlightThemeCookie = useCookie<string>(STORAGE_KEYS.CODE_HIGHLIGHT_THEME);
    const selectedTheme = computed(() => highlightThemeCookie.value || "snazzy-light");

    const highlightCode = async (code: string, language: string): Promise<string | null> => {
        if (!globalHighlighter) {
            await loadShikiInstance(selectedTheme.value);
            if (!globalHighlighter) return null;
        }

        if (language !== "text") {
            const loaded = await loadLanguage(language);
            if (!loaded) return null;
        }

        try {
            return globalHighlighter.codeToHtml(code, {
                lang: language,
                theme: selectedTheme.value,
            });
        } catch (error) {
            console.warn("Failed to highlight code:", error);
            return null;
        }
    };

    watch(selectedTheme, (newTheme) => {
        if (globalHighlighter) loadTheme(newTheme);
    });

    return { highlightCode };
}
