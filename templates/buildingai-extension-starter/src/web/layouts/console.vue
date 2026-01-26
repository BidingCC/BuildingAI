<script setup lang="ts">
import { PluginLayout } from "@buildingai/layouts/console";

import { consoleMenu } from "~/router.options";

import manifest from "../../../manifest.json";
</script>

<template>
    <PluginLayout :menu="consoleMenu" :manifest="manifest" />
</template>
