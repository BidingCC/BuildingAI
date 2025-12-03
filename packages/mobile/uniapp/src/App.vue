<script setup lang="ts">
onLaunch((options) => {
    uni.setTabBarItem({
        index: 0,
        text: "Chat",
    });
    console.log("App Launch", options);
});
onShow(() => {
    console.log("App Show");
    uni.setTabBarItem({
        index: 0,
        text: "Chat",
    });
});
onHide(() => {
    console.log("App Hide");
});
</script>

<style>
@import "./styles/globals.css";
@import "./styles/system.css";
@import "./styles/ui.css";
@import "./styles/variable.css";
</style>
