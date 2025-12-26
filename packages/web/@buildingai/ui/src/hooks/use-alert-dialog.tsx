"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Button } from "@buildingai/ui/components/ui/button";
import * as React from "react";

type AlertDialogOptions = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    media?: React.ReactNode;
    cancelText?: React.ReactNode;
    confirmText?: React.ReactNode;
    cancelVariant?: React.ComponentProps<typeof Button>["variant"];
    confirmVariant?: React.ComponentProps<typeof Button>["variant"];
    size?: "default" | "sm";
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void | Promise<void>;
};

type AlertDialogState = AlertDialogOptions & {
    open: boolean;
    resolve?: (value: boolean) => void;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void | Promise<void>;
};

type AlertDialogContextValue = {
    confirm: (options?: AlertDialogOptions) => Promise<boolean>;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

/**
 * Provider component that enables imperative AlertDialog usage.
 * Must be placed at the root of your application.
 */
function AlertDialogProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = React.useState<AlertDialogState>({ open: false });
    const resolvedRef = React.useRef(false);

    const confirm = React.useCallback((options: AlertDialogOptions = {}) => {
        resolvedRef.current = false;
        return new Promise<boolean>((resolve) => {
            setState({
                ...options,
                open: true,
                resolve,
            });
        });
    }, []);

    const handleOpenChange = React.useCallback(
        (open: boolean) => {
            if (!open && !resolvedRef.current) {
                resolvedRef.current = true;
                state.onCancel?.();
                state.resolve?.(false);
                setState((prev) => ({ ...prev, open: false }));
            }
        },
        [state.resolve, state.onCancel],
    );

    const handleConfirm = React.useCallback(async () => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        await state.onConfirm?.();
        state.resolve?.(true);
        setState((prev) => ({ ...prev, open: false }));
    }, [state.resolve, state.onConfirm]);

    const handleCancel = React.useCallback(async () => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        await state.onCancel?.();
        state.resolve?.(false);
        setState((prev) => ({ ...prev, open: false }));
    }, [state.resolve, state.onCancel]);

    const contextValue = React.useMemo(() => ({ confirm }), [confirm]);

    return (
        <AlertDialogContext.Provider value={contextValue}>
            {children}
            <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
                <AlertDialogContent
                    size={state.size}
                    className="max-w-sm data-[size=default]:max-w-sm data-[size=default]:sm:max-w-sm"
                >
                    <AlertDialogHeader>
                        {state.media && <AlertDialogMedia>{state.media}</AlertDialogMedia>}
                        {state.title && <AlertDialogTitle>{state.title}</AlertDialogTitle>}
                        {state.description && (
                            <AlertDialogDescription>{state.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant={state.cancelVariant} onClick={handleCancel}>
                            {state.cancelText ?? "取消"}
                        </AlertDialogCancel>
                        <AlertDialogAction variant={state.confirmVariant} onClick={handleConfirm}>
                            {state.confirmText ?? "确定"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AlertDialogContext.Provider>
    );
}

/**
 * Hook for imperative AlertDialog usage.
 * Returns a confirm function that shows the dialog and returns a Promise.
 * Resolves to true on confirm, rejects on cancel/close.
 *
 * @example
 * ```tsx
 * const { confirm } = useAlertDialog();
 *
 * const handleDelete = async () => {
 *   try {
 *     await confirm({
 *       title: "确认删除？",
 *       description: "此操作不可撤销",
 *       confirmVariant: "destructive",
 *     });
 *     // User confirmed, proceed with deletion
 *   } catch {
 *     // User cancelled
 *   }
 * };
 * ```
 */
function useAlertDialog() {
    const context = React.useContext(AlertDialogContext);

    if (!context) {
        throw new Error("useAlertDialog must be used within an AlertDialogProvider");
    }

    const confirm = React.useCallback(
        async (options?: AlertDialogOptions): Promise<void> => {
            const result = await context.confirm(options);
            if (!result) {
                throw new Error("AlertDialog cancelled");
            }
        },
        [context],
    );

    return { confirm };
}

export { AlertDialogProvider, useAlertDialog };
export type { AlertDialogOptions };
