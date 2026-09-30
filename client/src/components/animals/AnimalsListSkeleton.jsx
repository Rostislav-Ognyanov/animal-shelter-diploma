function SkeletonCard() {
  return (
    <article className="animal-card animal-card-skeleton" aria-hidden="true">
      <div className="animal-card-skeleton-media" />
      <div className="animal-card-body">
        <span className="animal-status animal-status-skeleton" />
        <div className="animal-skeleton-line animal-skeleton-line-title" />
        <div className="animal-skeleton-line animal-skeleton-line-facts" />
        <div className="animal-skeleton-line animal-skeleton-line-body" />
        <div className="animal-skeleton-line animal-skeleton-line-body animal-skeleton-line-body-short" />
        <div className="animal-card-actions">
          <span className="animal-card-link animal-card-link-skeleton" />
        </div>
      </div>
    </article>
  );
}

export function AnimalsListSkeleton({
  count = 6,
  gridClassName = 'animals-list-grid',
  statusText = 'Зареждане на животните...',
}) {
  return (
    <div className={gridClassName} aria-busy="true">
      <p className="sr-only" role="status">
        {statusText}
      </p>

      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={`animal-skeleton-${index + 1}`} />
      ))}
    </div>
  );
}
