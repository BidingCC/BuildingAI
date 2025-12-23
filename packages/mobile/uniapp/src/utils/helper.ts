export const formatDuration = (duration?: number): string => {
    if (!duration || duration < 0) return "0ms";

    if (duration < 10) {
        return `${duration}ms`;
    }

    if (duration < 1000) {
        return `${(duration / 1000).toFixed(2)}s`;
    }

    const seconds = duration / 1000;

    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (remainingSeconds === 0) {
            return `${minutes}:00`;
        }
        return `${minutes}:${remainingSeconds}`;
    }

    return `${seconds.toFixed(1)}s`;
};
