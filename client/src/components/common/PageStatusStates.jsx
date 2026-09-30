export function PageLoadingState({
  className = '',
  message = 'Зареждане на съдържанието...',
  title = 'Зареждане',
}) {
  return (
    <main className={`route-shell page-status-shell ${className}`.trim()}>
      <section className="page-status-card" role="status" aria-live="polite">
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

export function PageErrorState({
  className = '',
  message = 'Съдържанието не може да се зареди.',
  onRetry,
  title = 'Възникна проблем',
}) {
  return (
    <main className={`route-shell page-status-shell ${className}`.trim()}>
      <section className="page-status-card page-status-card-error" role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        {onRetry ? (
          <button type="button" className="app-primary-action" onClick={onRetry}>
            Опитай отново
          </button>
        ) : null}
      </section>
    </main>
  );
}
