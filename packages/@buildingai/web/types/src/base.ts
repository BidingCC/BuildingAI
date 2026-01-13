export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};
