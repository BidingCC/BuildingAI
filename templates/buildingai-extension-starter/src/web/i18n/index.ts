import { generateAppMessagesForLocale } from "@buildingai/i18n-config/src/generate-locales";

export default defineI18nLocale(async (locale) => {
    return await generateAppMessagesForLocale(locale);
});
