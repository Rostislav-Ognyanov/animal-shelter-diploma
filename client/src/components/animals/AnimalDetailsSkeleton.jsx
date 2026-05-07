export function AnimalDetailsSkeleton() {
  return (
    <main className="route-shell animal-details-shell" aria-live="polite" aria-busy="true">
      <div className="animal-details-back-link-row">
        <span className="animals-secondary-action animals-skeleton-button" />
      </div>

      <section className="animal-details-hero animal-details-skeleton">
        <div className="animal-details-gallery">
          <div className="animal-details-main-image animal-details-main-image-skeleton" />
          <div className="animal-details-thumbnails">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`animal-thumb-skeleton-${index + 1}`}
                className="animal-details-thumbnail animal-details-thumbnail-skeleton"
              />
            ))}
          </div>
        </div>

        <div className="animal-details-summary">
          <div className="animal-details-summary-top">
            <span className="animal-status animal-status-skeleton" />
            <span className="animal-activity-pill animal-activity-pill-skeleton" />
          </div>
          <div className="animal-skeleton-line animal-skeleton-line-hero-title" />
          <div className="animal-skeleton-line animal-skeleton-line-facts" />
          <div className="animal-skeleton-line animal-skeleton-line-body" />
          <div className="animal-skeleton-line animal-skeleton-line-body" />
          <div className="animal-details-cta-card animal-details-cta-card-skeleton">
            <div className="animal-skeleton-line animal-skeleton-line-title" />
            <div className="animal-skeleton-line animal-skeleton-line-body" />
            <span className="animals-primary-action animals-skeleton-button animals-skeleton-button-wide" />
          </div>
        </div>
      </section>

      <section className="animal-details-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={`animal-details-card-skeleton-${index + 1}`}
            className="animal-details-card animal-details-card-skeleton"
          >
            <div className="animal-details-card-heading">
              <div className="animal-skeleton-line animal-skeleton-line-title" />
              <div className="animal-skeleton-line animal-skeleton-line-body" />
            </div>
            <div className="animal-details-info-list animal-details-info-list-skeleton">
              {Array.from({ length: 4 }, (_, infoIndex) => (
                <div key={`animal-details-info-skeleton-${index + 1}-${infoIndex + 1}`}>
                  <div className="animal-skeleton-line animal-skeleton-line-meta" />
                  <div className="animal-skeleton-line animal-skeleton-line-body" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
