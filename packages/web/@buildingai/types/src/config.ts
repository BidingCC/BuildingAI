export interface WebsiteConfig {
    webinfo: {
        name: string;
        description: string;
        icon: string;
        logo: string;
        spaLoadingIcon: string;
        version: string;
        isDemo: boolean;
    };
    agreement: {
        serviceTitle: string;
        serviceContent: string;
        privacyTitle: string;
        privacyContent: string;
        paymentTitle: string;
        paymentContent: string;
        updateAt: string;
    };
    copyright: {
        displayName: string;
        iconUrl: string;
        url: string;
    }[];
    statistics: {
        appid: string;
    };
}
