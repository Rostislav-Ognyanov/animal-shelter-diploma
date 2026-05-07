function SkeletonCard() {
  return (
    <article className="animal-card animal-card-skeleton" aria-hidden="true">
      <div className="animal-card-skeleton-media" />
      <div className="animal-card-body">
        <span className="animal-status animal-status-skeleton" />
        <div className="animal-skeleton-line animal-skeleton-line-title" />
        <div className="animal-skeleton-line animal-skeleton-line-facts" />
        <div className="animal-card-meta">
          <div>
            <dt>Статус</dt>
            <dd>
              <div className="animal-skeleton-line animal-skeleton-line-meta" />
            </dd>
          </div>
          <div>
            <dt>Приет</dt>
            <dd>
              <div className="animal-skeleton-line animal-skeleton-line-meta" />
            </dd>
          </div>
        </div>
        <div className="animal-card-actions">
          <span className="animal-card-link animal-card-link-skeleton" />
        </div>
      </div>
    </article>
  );
}

export function AnimalsListSkeleton({ count = 6 }) {
  return (
    <div className="animals-list-grid animals-list-grid-loading" aria-live="polite" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={`animal-skeleton-${index + 1}`} />
      ))}
    </div>
  );
}
