import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@buildingai/ui/components/ui/pagination";
import { useCallback, useMemo } from "react";

export type UsePaginationOptions = {
  /** Total number of items */
  total: number;
  /** Number of items per page */
  pageSize?: number;
  /** Current page number (1-indexed) - controlled mode */
  page: number;
  /** Number of sibling pages to show on each side of current page */
  siblingCount?: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
};

export type UsePaginationReturn = {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Whether there is a previous page */
  hasPrevious: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Reset to the first page */
  reset: () => void;
  /** The pagination component ready to render */
  PaginationComponent: React.FC<{ className?: string }>;
};

/**
 * Generate page numbers array with ellipsis
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "ellipsis-start" | "ellipsis-end")[] {
  const totalPageNumbers = siblingCount * 2 + 5; // siblings + first + last + current + 2 ellipsis

  // If total pages is less than the page numbers we want to show, return all pages
  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    // Show more pages on the left
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis-end", totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    // Show more pages on the right
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1,
    );
    return [1, "ellipsis-start", ...rightRange];
  }

  // Show ellipsis on both sides
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [1, "ellipsis-start", ...middleRange, "ellipsis-end", totalPages];
}

/**
 * A generic pagination hook that provides pagination state and a ready-to-use component.
 * This hook is fully controlled - the parent component manages the current page state.
 */
export function usePagination({
  total,
  pageSize = 10,
  page,
  siblingCount = 1,
  onPageChange,
}: UsePaginationOptions): UsePaginationReturn {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const goToPage = useCallback(
    (targetPage: number) => {
      const newPage = Math.min(Math.max(1, targetPage), totalPages);
      if (newPage !== currentPage) {
        onPageChange(newPage);
      }
    },
    [totalPages, currentPage, onPageChange],
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, hasNext, onPageChange]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, hasPrevious, onPageChange]);

  const reset = useCallback(() => {
    onPageChange(1);
  }, [onPageChange]);

  const pageNumbers = useMemo(
    () => generatePageNumbers(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount],
  );

  const PaginationComponent: React.FC<{ className?: string }> = useCallback(
    ({ className }) => {
      if (totalPages <= 1) {
        return null;
      }

      return (
        <Pagination className={className}>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  previousPage();
                }}
                aria-disabled={!hasPrevious}
                className={!hasPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {pageNumbers.map((pageNumber, index) => {
              if (pageNumber === "ellipsis-start" || pageNumber === "ellipsis-end") {
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={index}>
                  <PaginationLink
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(pageNumber);
                    }}
                    isActive={pageNumber === currentPage}
                    className="cursor-pointer"
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  nextPage();
                }}
                aria-disabled={!hasNext}
                className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
    },
    [currentPage, totalPages, pageNumbers, hasPrevious, hasNext, goToPage, previousPage, nextPage],
  );

  return {
    currentPage,
    totalPages,
    pageSize,
    total,
    hasPrevious,
    hasNext,
    goToPage,
    nextPage,
    previousPage,
    reset,
    PaginationComponent,
  };
}
