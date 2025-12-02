import { defineConfig } from "@uni-helper/unh";

/**
 * unh 配置文件
 * 更多配置请参考：https://uni-helper.js.org/unh/
 */
export default defineConfig({
    platform: {
        // 默认平台
        default: "h5",
        // 平台别名
        alias: {
            h5: ["w", "h"],
            "mp-weixin": "wx",
            "mp-alipay": "alipay",
            "mp-baidu": "baidu",
            "mp-toutiao": "toutiao",
            "mp-jd": "jd",
            "mp-kuaishou": "kuaishou",
            "mp-lark": "lark",
            "mp-qq": "qq",
            "mp-xhs": "xhs",
        },
    },
    autoGenerate: {
        pages: true,
        manifest: true,
    },
});
