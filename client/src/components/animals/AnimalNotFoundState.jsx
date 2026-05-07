import { Link } from 'react-router-dom';

export function AnimalNotFoundState({
  code = '404',
  title = 'Животното не беше намерено',
  description = 'Записът не съществува, вече е премахнат от текущия изглед или адресът е невалиден.',
  showCreateAction = false,
}) {
  return (
    <main className="route-shell animal-details-shell">
      <section className="route-card animals-not-found-card">
                <span className="animals-not-found-code">{code}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="animals-feedback-actions">
          <Link className="animals-primary-action" to="/search">
            Към списъка с животни
          </Link>
          {showCreateAction ? (
            <Link className="animals-secondary-action" to="/animals/new">
              Създай нов запис
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}


