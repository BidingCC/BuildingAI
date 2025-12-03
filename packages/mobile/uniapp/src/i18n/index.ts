import { createI18n } from "vue-i18n";

export type Locale = "zh" | "en" | "jp";

type Messages = Record<string, Record<string, Record<string, string>>>;

const SUPPORTED_LOCALES: Locale[] = ["zh", "en", "jp"];

export const LOCALES: { label: string; value: Locale }[] = [
    { label: "简体中文", value: "zh" },
    { label: "English", value: "en" },
    { label: "日本語", value: "jp" },
];

// #ifdef MP-WEIXIN
// 不要删除这个注释，否则会导致预加载失败
/* __EXTENSION_I18N_PRELOAD__ */
// #endif

const messages: Messages = {};

function loadMainAppMessages(): void {
    const languageModules = import.meta.glob<{ default: Record<string, string> }>("./*/**/*.json", {
        eager: true,
    });

    for (const [path, module] of Object.entries(languageModules)) {
        const match = path.match(/\.\/([^/]+)\/([^/]+)\.json$/);
        if (match) {
            const [, locale, namespace] = match;
            if (!messages[locale]) messages[locale] = {};
            messages[locale][namespace] = module.default;
        }
    }
}

// #ifndef MP-WEIXIN
function loadExtensionMessages(): void {
    const extensionLanguageModules = import.meta.glob<{ default: Record<string, string> }>(
        "../extensions/*/i18n/**/*.json",
        { eager: true },
    );

    for (const [path, module] of Object.entries(extensionLanguageModules)) {
        const match = path.match(/\.\.\/extensions\/([^/]+)\/i18n\/([^/]+)\/([^/]+)\.json$/);
        if (match) {
            const [, , locale, namespace] = match;
            if (!messages[locale]) messages[locale] = {};
            messages[locale][namespace] = module.default;
        }
    }
}
// #endif

loadMainAppMessages();
// #ifndef MP-WEIXIN
loadExtensionMessages();
// #endif

function extractContent(mod: unknown): Record<string, string> {
    if (!mod || typeof mod !== "object") return {};
    const obj = mod as Record<string, unknown>;
    return (obj.default as Record<string, string>) || (mod as Record<string, string>);
}

async function loadExtensionLocale(
    extensionRoot: string,
    locale: Locale,
    namespace: string,
): Promise<Record<string, string>> {
    const modulePath = `../extensions/${extensionRoot}/i18n/${locale}/${namespace}.json.js`;

    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({}), 5000);

        // #ifdef MP-WEIXIN
        (require as { async: (path: string) => Promise<unknown> })
            .async(modulePath)
            .then((mod) => {
                clearTimeout(timer);
                resolve(extractContent(mod));
            })
            .catch(() => {
                clearTimeout(timer);
                resolve({});
            });
        // #endif

        // #ifndef MP-WEIXIN
        import(/* @vite-ignore */ modulePath)
            .then((mod) => {
                clearTimeout(timer);
                resolve(extractContent(mod));
            })
            .catch(() => {
                clearTimeout(timer);
                resolve({});
            });
        // #endif
    });
}

async function loadExtensionLocales(): Promise<void> {
    const extensionNamespaces: Record<string, string[]> = {
        // 不要删除这个注释，否则会导致预加载失败
        /* __EXTENSION_NAMESPACES__ */
    };

    if (Object.keys(extensionNamespaces).length === 0) return;

    // #ifndef MP-WEIXIN
    return;
    // #endif

    // #ifdef MP-WEIXIN
    const loadTasks = Object.entries(extensionNamespaces).flatMap(([extensionRoot, namespaces]) =>
        SUPPORTED_LOCALES.flatMap((locale) =>
            namespaces.map((namespace) => ({
                extensionRoot,
                locale,
                namespace,
                promise: loadExtensionLocale(extensionRoot, locale, namespace),
            })),
        ),
    );

    const results = await Promise.all(
        loadTasks.map((task) => task.promise.then((content) => ({ ...task, content }))),
    );

    for (const { locale, namespace, content } of results) {
        if (Object.keys(content).length > 0) {
            if (!messages[locale]) messages[locale] = {};
            messages[locale][namespace] = content;
        }
    }
    // #endif
}

const loadExtensionLocalesPromise = loadExtensionLocales();

function getDefaultLocale(): Locale {
    try {
        const cached = uni.getStorageSync("locale") as Locale;
        if (cached && SUPPORTED_LOCALES.includes(cached)) return cached;
    } catch {
        // ignore
    }

    try {
        let lang = "zh";

        // #ifdef MP-WEIXIN
        lang = wx.getAppBaseInfo?.()?.language?.toLowerCase() || "zh";
        // #endif

        // #ifndef MP-WEIXIN
        lang = uni.getSystemInfoSync()?.language?.toLowerCase() || "zh";
        // #endif

        if (lang.startsWith("en")) return "en";
        if (lang.startsWith("ja") || lang.startsWith("jp")) return "jp";
    } catch {
        // ignore
    }

    return "zh";
}

export const i18n = createI18n({
    legacy: false,
    locale: getDefaultLocale(),
    fallbackLocale: "zh",
    messages,
    missingWarn: false,
    fallbackWarn: false,
});

// #ifdef MP-WEIXIN
loadExtensionLocalesPromise.then(() => {
    for (const locale of SUPPORTED_LOCALES) {
        if (messages[locale]) {
            i18n.global.setLocaleMessage(locale, messages[locale]);
        }
    }
});
// #endif

export default i18n;
