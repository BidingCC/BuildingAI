import type { Component } from "vue";

/**
 * Modal use component types
 * @description Type definitions for BdModalUse component
 */

export interface BdModalUseProps {
    /** Modal color theme */
    color?: "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral";
    /** Modal title */
    title: string;
    /** Modal description */
    description: string;
    /** Modal content - can be a string or component */
    content: string | Component;
    /** Whether to show confirm button */
    showConfirm?: boolean;
    /** Whether to show cancel button */
    showCancel?: boolean;
    /** Confirm button text */
    confirmText?: string;
    /** Cancel button text */
    cancelText?: string;
    /** Whether modal can be dismissed by clicking outside */
    dismissible?: boolean;
    /** Content area ID for accessibility */
    contentId?: string;
    /** Custom UI classes */
    ui?: Record<string, string>;
    /** Custom header content */
    header?: string | Component;
    /** Confirm callback function */
    confirm: () => void;
    /** Cancel callback function */
    cancel: () => void;
}
