/**
 * Uploader component types
 * @description Type definitions for BdUploader component
 */

export interface UploadItem {
    /** Unique identifier */
    id: string;
    /** File name */
    name: string;
    /** File size in bytes */
    size: number;
    /** File MIME type */
    type: string;
    /** File URL (local or remote) */
    url: string;
    /** Upload progress (0-100) */
    progress: number;
    /** Upload status */
    status: number;
    /** Error message if upload failed */
    error?: string;
    /** Original File object */
    file?: File;
    /** File extension */
    extension?: string;
    /** Whether the file is an image */
    isImage?: boolean;
    /** Whether the file is a video */
    isVideo?: boolean;
}

export interface BdUploaderProps {
    /** Bound value, file URL(s) */
    modelValue?: string | string[];
    /** Upload type filter */
    type?: "image" | "video" | "file";
    /** Whether single file mode */
    single?: boolean;
    /** Maximum number of files */
    maxCount?: number;
    /** Accepted file types */
    accept?: string;
    /** Maximum file size in bytes */
    maxSize?: number;
    /** Upload area text */
    text?: string;
    /** Upload area icon */
    icon?: string;
    /** Custom CSS class */
    class?: string;
    /** Whether disabled */
    disabled?: boolean;
    /** Progress text during upload */
    progressText?: string;
    /** Text shown when upload finishes */
    finishProgressText?: string;
    /** Whether to allow multiple file selection */
    multiple?: boolean;
    /** Custom upload API function */

    uploadApi?: (params: any, options?: any) => Promise<any>;
    /** Whether to show preview button */
    showPreviewButton?: boolean;
    /** Whether to show replace button */
    showReplaceButton?: boolean;
    /** Whether to show remove button */
    showRemoveButton?: boolean;
    /** Custom add button class */
    addButtonClassName?: string;
    /** Extension ID for file storage isolation */
    extensionId?: string;
}

export interface BdUploaderEmits {
    /** Triggered when modelValue changes */
    "update:modelValue": [value: string | string[]];
    /** Triggered when upload succeeds */

    success: [file: UploadItem, response: any];
    /** Triggered when upload fails */

    error: [file: UploadItem, error: any];
    /** Triggered during upload progress */
    progress: [file: UploadItem, percent: number];
    /** Triggered when file count exceeds limit */
    exceed: [files: File[]];
    /** Triggered when file list changes */
    change: [file: UploadItem];
    /** Triggered when file is removed */
    remove: [file: UploadItem];
}
