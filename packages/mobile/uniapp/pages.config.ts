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
        blurEffect: "extralight",
        // backgroundColor: "@tabBgColor",
        borderStyle: "@tabBorderStyle",
        color: "@tabFontColor",
        selectedColor: "@tabSelectedColor",
        list: [
            {
                pagePath: "pages/chat/index",
                iconPath: "static/icons/tabbar/home.png",
                selectedIconPath: "static/icons/tabbar/home-active.png",
                text: "对话",
            },
            {
                pagePath: "pages/apps/index",
                iconPath: "static/icons/tabbar/apps.png",
                selectedIconPath: "static/icons/tabbar/apps-active.png",
                text: "应用",
            },
            {
                pagePath: "pages/user/index",
                iconPath: "static/icons/tabbar/user.png",
                selectedIconPath: "static/icons/tabbar/user-active.png",
                text: "我的",
            },
        ],
    },
    // 动态加载扩展分包
    subPackages: await loadExtensionSubPackages("../../../extensions"),
});
