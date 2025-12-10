<script setup lang="ts">
const appStore = useAppStore();

onLaunch(async () => {
    console.log("App Launch");
    await appStore.getConfig();
    await appStore.getLoginSettings();
});

onShow(async () => {
    console.log("App Show");
});

onHide(async () => {
    console.log("App Hide");
});
</script>

<style>
@import "./styles/globals.css";
@import "./styles/system.css";
@import "./styles/ui.css";
@import "./styles/variable.css";
</style>
