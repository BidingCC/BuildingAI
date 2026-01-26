import type { WebsiteInfo } from "@buildingai/service/common";
import type { SystemInitializeRequest } from "@buildingai/service/consoleapi/system";
import { apiInitializeSystem } from "@buildingai/service/consoleapi/system";

export function useInstall() {
    const { t } = useI18n();
    const appStore = useAppStore();
    const userStore = useUserStore();
    const router = useRouter();
    const toast = useToast();

    const adminForm = reactive<SystemInitializeRequest>({
        username: "",
        password: "",
        confirmPassword: "",
        nickname: "",
        email: "",
        phone: "",
        avatar: "",
    });

    const websiteForm = reactive<WebsiteInfo>({
        name: "",
        description: "",
        icon: "",
        logo: "",
        spaLoadingIcon: "",
    });

    const isSubmittingAdmin = ref(false);
    const isSubmittingWebsite = ref(false);

    async function submitAdminInfo() {
        isSubmittingAdmin.value = true;
        await new Promise((resolve) => setTimeout(resolve, 300));
        isSubmittingAdmin.value = false;
        return true;
    }

    async function submitWebsiteConfig() {
        try {
            isSubmittingWebsite.value = true;

            adminForm.confirmPassword = adminForm.password;

            const initializeData = {
                username: adminForm.username,
                password: adminForm.password,
                confirmPassword: adminForm.confirmPassword,
                nickname: adminForm.nickname || undefined,
                email: adminForm.email || undefined,
                phone: adminForm.phone || undefined,
                avatar: adminForm.avatar || undefined,
                websiteName: websiteForm.name || undefined,
                websiteDescription: websiteForm.description || undefined,
                websiteLogo: websiteForm.logo || undefined,
                websiteIcon: websiteForm.icon || undefined,
            };

            const result = await apiInitializeSystem(initializeData);

            if (result.isInitialized) {
                toast.add({
                    title: t("install.successTitle"),
                    description: t("install.steps.complete.successMessage"),
                    color: "success",
                });

                if (result.token) {
                    userStore.setToken(result.token);
                    // Fetch user info after setting token
                    await userStore.getUser();
                }

                await appStore.getConfig();
                await appStore.getSystemInfo();

                return true;
            }

            return false;
        } catch (error: unknown) {
            const err = error as Error;
            toast.add({
                title: t("install.failureTitle"),
                description: err.message || t("install.failureDescription"),
                color: "error",
            });

            return false;
        } finally {
            isSubmittingWebsite.value = false;
            // Report installation statistics
            const version = appStore.siteConfig?.webinfo?.version;
            if (version) {
                fetch(
                    `${useRuntimeConfig().public.EXTENSION_API_URL || "https://cloud.buildingai.cc/api"}/building-ai/${version}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ version, installedAt: Date.now() }),
                    },
                );
            }
        }
    }

    function goToHome() {
        router.push("/");
    }

    function goToConsole() {
        router.push("/console");
    }

    return {
        adminForm,
        websiteForm,
        isSubmittingAdmin,
        isSubmittingWebsite,
        submitAdminInfo,
        submitWebsiteConfig,
        goToHome,
        goToConsole,
    };
}
