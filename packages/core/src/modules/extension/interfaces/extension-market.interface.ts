export type TerminalDescType = {
    label: string;
    value: number;
};

export type VersionListItemType = {
    version: string;
    explain: string;
    createdAt: string;
};

export interface ExtensionDetailType {
    appsStatus?: number;
    isCompatible: boolean;
    id: string;
    name: string;
    identifier: string;
    version: string;
    description: string;
    icon: string;
    type: number;
    supportTerminal: number[];
    isLocal: boolean;
    status: number;
    author: {
        avatar: string;
        name: string;
        homepage: string;
    };
    content: string;
    createdAt: string;
    updatedAt: string;
    purchasedAt: string;
    typeDesc: string;
    terminalDesc: TerminalDescType[];
    sellPrice: string;
    salesNum: number;
    categoryName: string[];
    versionLists: VersionListItemType[];
}
