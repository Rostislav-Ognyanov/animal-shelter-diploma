import { useEffect, useRef, useState } from 'react';

export function buildEmptyPagination(defaultLimit = 10, total = 0) {
  return {
    page: 1,
    limit: defaultLimit,
    total,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

export function PaginationControls({
  pagination,
  isLoading = false,
  onPageChange,
  scrollTargetId,
}) {
  const [pendingPage, setPendingPage] = useState(null);
  const hasPendingLoadStarted = useRef(false);
  const currentPage = Number(pagination?.page ?? 1);
  const totalPages = Math.max(Number(pagination?.totalPages ?? 0), 1);

  useEffect(() => {
    if (pendingPage === null) {
      return undefined;
    }

    if (isLoading) {
      hasPendingLoadStarted.current = true;
      return undefined;
    }

    if (!hasPendingLoadStarted.current) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      if (scrollTargetId) {
        document.getElementById(scrollTargetId)?.scrollIntoView({ block: 'start' });
      }

      hasPendingLoadStarted.current = false;
      setPendingPage(null);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isLoading, pendingPage, scrollTargetId]);

  function handlePageChange(nextPage) {
    hasPendingLoadStarted.current = false;
    setPendingPage(nextPage);
    onPageChange(nextPage);
  }

  if (!pagination || isLoading || totalPages <= 1) {
    return null;
  }

  return (
    <div className="animals-pagination">
      <button
        type="button"
        className="app-secondary-action"
        disabled={isLoading || !pagination.hasPreviousPage}
        onClick={() => handlePageChange(currentPage - 1)}
      >
        Предишна
      </button>

      <div className="animals-pagination-info">
        <strong>Страница {currentPage}</strong>
        <span>от {totalPages}</span>
      </div>

      <button
        type="button"
        className="app-primary-action"
        disabled={isLoading || !pagination.hasNextPage}
        onClick={() => handlePageChange(currentPage + 1)}
      >
        Следваща
      </button>
    </div>
  );
}
