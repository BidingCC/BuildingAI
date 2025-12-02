import { loadExtensionSubPackages } from "@buildingai/vite-plugins";
import { defineUniPages } from "@uni-helper/vite-plugin-uni-pages";

export default defineUniPages({
    pages: [],
    globalStyle: {
        backgroundColor: "@bgColor",
        backgroundColorBottom: "@bgColorBottom",
        backgroundColorTop: "@bgColorTop",
        backgroundTextStyle: "@bgTxtStyle",
        navigationBarBackgroundColor: "#000000",
        navigationBarTextStyle: "@navTxtStyle",
        navigationBarTitleText: "Vitesse-Uni",
        navigationStyle: "custom",
    },
    tabBar: {
        backgroundColor: "@tabBgColor",
        borderStyle: "@tabBorderStyle",
        color: "@tabFontColor",
        selectedColor: "@tabSelectedColor",
        list: [
            {
                pagePath: "/pages/chat/index",
                text: "对话",
            },
            {
                pagePath: "/pages/apps/index",
                text: "应用",
            },
            {
                pagePath: "/pages/profile/index",
                text: "我的",
            },
        ],
    },
    // 动态加载扩展分包
    subPackages: await loadExtensionSubPackages("../../../extensions"),
});
