export interface LoginSettingsConfig {
    allowedLoginMethods: number[];
    allowedRegisterMethods: number[];
    defaultLoginMethod: number;
    allowMultipleLogin: boolean;
    showPolicyAgreement: boolean;
}

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
    loginSettings?: LoginSettingsConfig;
}

export interface InitializeStatus {
    isInitialized: boolean;
    version: string;
}
