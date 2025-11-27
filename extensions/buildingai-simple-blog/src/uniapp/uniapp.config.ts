import { defineExtension } from "@buildingai/vite-plugins";

export default defineExtension({
    root: "simple-blog",
    pages: [
        {
            path: "pages/list/index",
            style: {
                navigationBarTitleText: "博客列表",
                navigationBarBackgroundColor: "#ffffff",
                navigationBarTextStyle: "black",
                enablePullDownRefresh: true,
                backgroundColor: "#f5f5f5",
            },
        },
        {
            path: "pages/detail/index",
            style: {
                navigationBarTitleText: "博客详情",
                navigationBarBackgroundColor: "#ffffff",
                navigationBarTextStyle: "black",
            },
        },
    ],
});
