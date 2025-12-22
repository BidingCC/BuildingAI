<script setup lang="ts">
const appStore = useAppStore();
const userStore = useUserStore();

onLaunch(async () => {
    console.log("App Launch");
    await appStore.getConfig();
    await appStore.getLoginSettings();
    await userStore.getUser();
});

onShow(async () => {
    console.log("App Show");
});

onHide(async () => {
    console.log("App Hide");
});
</script>

<style lang="scss">
@import "./styles/globals.css";
@import "./styles/system.css";
@import "./styles/ui.css";
@import "./styles/variable.css";
// #ifdef H5
@import "./styles/markdown.css";
// #endif
</style>
