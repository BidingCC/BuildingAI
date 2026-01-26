/**
 * Application configuration presets
 * Note: theme properties (radius, blackAsPrimary) need to be mutable for runtime updates
 */
export const appConfigPresets = {
    toaster: {
        position: "top-center" as const,
        expand: false,
        duration: 5000,
        progress: false,
    },
    theme: {
        radius: 0.25,
        blackAsPrimary: false,
    },
    ui: {
        colors: {
            primary: "indigo",
            secondary: "blue",
            success: "green",
            info: "blue",
            warning: "yellow",
            error: "red",
            neutral: "neutral",
        },
        tooltip: {
            slots: {
                content: "bg-foreground text-background",
                arrow: "fill-foreground",
            },
        },
        card: {
            slots: {
                header: "p-4 sm:px-4 border-none !pb-0",
                body: "ring-0 sm:p-4",
                footer: "p-4 sm:px-4",
            },
            variants: {
                variant: {
                    outline: {
                        root: "bg-default border ring-0 border-border divide-y divide-default",
                    },
                    subtle: {
                        root: "bg-elevated/50 border ring-0 border-border divide-y divide-default",
                    },
                },
            },
        },
        accordion: {
            slots: {
                header: "flex px-3",
                content: "px-2",
            },
        },
        modal: {
            slots: {
                overlay:
                    "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            },
        },
    },
};
