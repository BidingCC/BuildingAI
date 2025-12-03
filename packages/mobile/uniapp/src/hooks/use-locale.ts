import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { type Locale, LOCALES } from "../i18n";

export function useLocale() {
    const { t, locale } = useI18n();

    const currentLocale = computed(() => locale.value as Locale);
    const currentLocaleLabel = computed(() => {
        const localeItem = LOCALES.find((l) => l.value === currentLocale.value);
        return localeItem?.label || currentLocale.value;
    });

    const setLocale = (newLocale: Locale) => {
        locale.value = newLocale;
        try {
            uni.setStorageSync("locale", newLocale);
        } catch {
            // ignore
        }
    };

    return {
        t,
        locale,
        currentLocale,
        currentLocaleLabel,
        locales: LOCALES,
        setLocale,
    };
}
