import { useState } from "react";
import { toast } from "sonner";

/**
 * Copy text to clipboard hook
 *
 * @returns Object with copy function and loading state
 *
 * @example
 * ```tsx
 * const { copy, isCopying } = useCopy();
 *
 * const handleCopy = async () => {
 *   await copy("text to copy");
 * };
 * ```
 */
export function useCopy() {
    const [isCopying, setIsCopying] = useState(false);

    const copy = async (text: string) => {
        if (!text) {
            toast.error("No content to copy");
            return false;
        }

        setIsCopying(true);

        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
            return true;
        } catch (error) {
            // Fallback for older browsers
            console.error(
                "Failed to copy to clipboard using navigator.clipboard.writeText:",
                error,
                "Fallback to execCommand",
            );
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const result = document.execCommand("copy");
                document.body.removeChild(textArea);

                if (result) {
                    toast.success("Copied to clipboard");
                    return true;
                } else {
                    toast.error("Failed to copy");
                    return false;
                }
            } catch (fallbackError) {
                toast.error(`Failed to copy: ${fallbackError}`);
                return false;
            }
        } finally {
            setIsCopying(false);
        }
    };

    return { copy, isCopying };
}
