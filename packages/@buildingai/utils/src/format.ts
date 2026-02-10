const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function bytesToReadable(bytes: number): string {
    if (bytes <= 0) return "0 B";
    const k = 1024;
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1);
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${BYTE_UNITS[i]}`;
}
