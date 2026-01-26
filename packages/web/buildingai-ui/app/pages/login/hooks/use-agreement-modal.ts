import { computed, h } from "vue";

interface AgreementModalOptions {
    width?: string;
}

export function useAgreementModal(options: AgreementModalOptions = {}, UIcon: Component) {
    const { width = "!w-[420px]" } = options;

    const appStore = useAppStore();
    const userStore = useUserStore();
    const { t } = useI18n();

    const requiresAgreement = computed(
        () => !!appStore.loginWay.loginAgreement && !!appStore.loginSettings?.showPolicyAgreement,
    );

    const agreementModalContent = computed(() => {
        const appName =
            appStore.siteConfig?.webinfo?.name ||
            t("login.messages.agreementModal.appNameFallback");
        const prefix = t("login.messages.agreementModal.prefix", { appName });
        const serviceLink = `<a href="/agreement?type=agreement&item=service" target="_blank" class="text-primary font-medium hover:underline">${t(
            "login.userAgreement",
        )}</a>`;
        const privacyLink = `<a href="/agreement?type=agreement&item=privacy" target="_blank" class="text-primary font-medium hover:underline">${t(
            "login.privacyPolicy",
        )}</a>`;
        return `<p class="text-sm leading-relaxed text-muted-foreground mb-4 ml-7">${prefix}${serviceLink}<span class="mx-1 text-muted-foreground">${t(
            "login.and",
        )}</span>${privacyLink}</p>`;
    });

    const agreementModalHeader = computed(() =>
        h("div", { class: "flex items-center gap-1" }, [
            h(UIcon, {
                name: "i-tabler-info-circle-filled",
                class: "size-6 text-primary",
            }),
            h("h2", { class: "text-lg font-medium" }, t("login.messages.agreementModal.title")),
        ]),
    );

    async function ensureAgreementAccepted() {
        if (!requiresAgreement.value || userStore.isAgreed) {
            return true;
        }
        try {
            await useModal({
                header: agreementModalHeader.value,
                description: "",
                content: agreementModalContent.value,
                confirmText: t("login.messages.agreementModal.confirm"),
                cancelText: t("login.messages.agreementModal.cancel"),
                color: "primary",
                ui: { content: width },
            });
            userStore.isAgreed = true;
            return true;
        } catch (_error) {
            return false;
        }
    }

    return {
        requiresAgreement,
        agreementModalContent,
        agreementModalHeader,
        ensureAgreementAccepted,
    };
}
