export const isDark = useDark();
export const toggleDark = () => (isDark.value = !isDark.value);

function useDark() {
    const darkMode = shallowRef(false);

    // #ifdef MP-WEIXIN
    const appBaseInfo = wx.getAppBaseInfo?.();
    if (appBaseInfo?.theme) {
        darkMode.value = appBaseInfo.theme === "dark";
    }
    console.log("appBaseInfo:", appBaseInfo);

    // #endif

    // #ifndef MP-WEIXIN
    const systemInfo = uni.getSystemInfoSync();
    darkMode.value = systemInfo?.theme === "dark";
    // #endif

    // #ifdef H5 || MP-WEIXIN
    uni.onThemeChange((res) => (darkMode.value = res.theme === "dark"));
    // #endif

    return darkMode;
}
