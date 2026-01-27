/**
 * 智能体第三方平台集成插件
 * 注册 Dify、Coze 等第三方平台的配置组件到 agent:config:third-party 插槽
 */

import { definePlugin } from "@//utils/plugins.utils";

export default defineNuxtPlugin(() => {
    definePlugin({
        id: "agent-third-party-integration",
        contributions: [
            {
                id: "dify-config",
                slot: "agent:config:third-party",
                component: () =>
                    import("@//pages/console/ai/agent/components/configuration/_third_party/dify-config.vue"),
                meta: {
                    platform: "dify",
                    label: "Dify",
                },
                order: 1,
            },
            {
                id: "coze-config",
                slot: "agent:config:third-party",
                component: () =>
                    import("@//pages/console/ai/agent/components/configuration/_third_party/coze-config.vue"),
                meta: {
                    platform: "coze",
                    label: "Coze",
                },
                order: 2,
            },
        ],
    });
});
