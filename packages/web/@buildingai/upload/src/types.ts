export interface FileUploadParams {
    file: File;
    description?: string;
    extensionId?: string;
}

export interface FilesUploadParams {
    files: File[];
    description?: string;
    extensionId?: string;
}

export interface OssFileUploadParams {
    file: File | Blob;
    name: string;
    size: number;
    extensionId?: string;
}

export interface OssFilesUploadParams {
    files: Array<File>;
    extensionId?: string;
}

export interface OssWrappedFileUploadOptions {
    onProgress?: (percent: number, bytes: number) => void;
}
