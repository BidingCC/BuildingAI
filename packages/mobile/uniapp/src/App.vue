<script setup lang="ts">
onLaunch((options) => {
    console.log("App Launch", options);
});
onShow(() => {
    console.log("App Show");
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
