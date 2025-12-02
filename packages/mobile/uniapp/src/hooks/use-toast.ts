export function useToast(message?: string, options?: Omit<UniApp.ShowToastOptions, "title">) {
    if (typeof message !== "string") {
        message = String(message);
    }

    const _toast = (
        msg: string,
        icon: "success" | "loading" | "error" | "fail" | "none" | "exception",
        opts?: Omit<UniApp.ShowToastOptions, "title" | "icon">,
    ) => {
        uni.showToast({
            title: msg,
            duration: opts?.duration || 1500,
            icon,
            image: opts?.image || "",
            position: opts?.position || "center",
            mask: opts?.mask || false,
        });
    };

    if (message) {
        _toast(message, options?.icon || "none", options);
    }

    const success = (msg: string, opts?: Omit<UniApp.ShowToastOptions, "title" | "icon">) => {
        _toast(msg, "success", opts);
    };
    const error = (msg: string, opts?: Omit<UniApp.ShowToastOptions, "title" | "icon">) => {
        _toast(msg, "error", opts);
    };
    const exception = (msg: string, opts?: Omit<UniApp.ShowToastOptions, "title" | "icon">) => {
        _toast(msg, "exception", opts);
    };

    const loading = (msg: string, opts?: Omit<UniApp.ShowToastOptions, "title" | "icon">) => {
        _toast(msg, "loading", opts);
    };

    return {
        success,
        error,
        exception,
        loading,
    };
}
