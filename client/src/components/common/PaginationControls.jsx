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

export function PaginationControls({ pagination, isLoading = false, onPageChange }) {
  const currentPage = Number(pagination?.page ?? 1);
  const totalPages = Math.max(Number(pagination?.totalPages ?? 0), 1);

  if (!pagination || totalPages <= 1) {
    return null;
  }

  return (
    <div className="animals-pagination">
      <button
        type="button"
        className="animals-secondary-action"
        disabled={isLoading || !pagination.hasPreviousPage}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Предишна
      </button>

      <div className="animals-pagination-info">
        <strong>Страница {currentPage}</strong>
        <span>от {totalPages}</span>
      </div>

      <button
        type="button"
        className="animals-primary-action"
        disabled={isLoading || !pagination.hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Следваща
      </button>
    </div>
  );
}
