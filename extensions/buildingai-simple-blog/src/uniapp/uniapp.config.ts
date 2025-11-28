import { defineExtension } from "@buildingai/vite-plugins";

export default defineExtension({
    root: "simple-blog",
    pages: [
        {
            path: "pages/list/index",
            style: {
                navigationBarTitleText: "123121231233",
                navigationBarBackgroundColor: "#ffffff",
                navigationBarTextStyle: "black",
                enablePullDownRefresh: true,
                backgroundColor: "#f5f5f5",
            },
        },
        {
            path: "pages/detail/index",
            style: {
                navigationBarTitleText: "博客详情 2312321322",
                navigationBarBackgroundColor: "#ffffff",
                navigationBarTextStyle: "black",
            },
        },
        {
            path: "pages/cate",
            style: {
                navigationBarTitleText: "博客栏目",
                navigationBarBackgroundColor: "#ffffff",
                navigationBarTextStyle: "black",
            },
        },
    ],
});
