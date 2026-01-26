import { reactive, toRaw } from "vue";

// 分页钩子函数
interface Options {
    page?: number;
    pageSize?: number;
    fetchFun: (_arg: any) => Promise<any>;
    params?: Record<any, any>;
    firstLoading?: boolean;
}

export function usePaging<T = any>(options: Options) {
    const { page = 1, pageSize = 15, fetchFun, params = {}, firstLoading = false } = options;
    // 记录分页初始参数
    const paramsInit: Record<any, any> = Object.assign({}, toRaw(params));
    // 分页数据
    const paging = reactive({
        page,
        pageSize,
        loading: firstLoading,
        total: 0,
        items: [] as T[],
        extend: {} as Record<string, any>,
        needPolling: false,
    });
    // 请求分页接口
    const getLists = (...args: any[]) => {
        paging.loading = true;
        const options = args[0];
        const isAppend =
            options && typeof options === "object" && "append" in options && options.append;

        return fetchFun({
            page: paging.page,
            pageSize: paging.pageSize,
            ...params,
        })
            .then((res: any) => {
                paging.total = res?.total;
                if (isAppend) {
                    // eslint-disable-next-line no-unsafe-optional-chaining
                    paging.items = [...paging.items, ...res?.items];
                } else {
                    paging.items = res?.items;
                }
                paging.extend = res?.extend;
                paging.needPolling = res?.needPolling || false;
                return Promise.resolve(res);
            })
            .catch((err: any) => {
                return Promise.reject(err);
            })
            .finally(() => {
                paging.loading = false;
            });
    };
    // 重置为第一页
    const resetPage = () => {
        paging.page = 1;
        getLists();
    };
    // 重置参数
    const resetParams = () => {
        Object.keys(paramsInit).forEach((item) => {
            params[item] = paramsInit[item];
        });
        getLists();
    };
    return {
        paging,
        getLists,
        resetParams,
        resetPage,
    };
}
