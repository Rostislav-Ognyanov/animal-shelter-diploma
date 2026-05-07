import { Link } from 'react-router-dom';

const SUPPORT_OPTIONS = [
  {
    title: 'Дарения',
    description: 'Подкрепи приюта с дарение и кратко послание.',
    actionLabel: 'Към даренията',
    to: '/donations',
  },
  {
    title: 'Осиновяване',
    description: 'Разгледай животните и намери своя нов приятел.',
    actionLabel: 'Към животните',
    to: '/search',
  },
];

export function SupportPage() {
  return (
    <main className="route-shell support-page-shell">
      <section className="route-card support-page-hero">
        <h1>Подкрепа</h1>
      </section>

      <section className="support-page-grid">
        {SUPPORT_OPTIONS.map((option) => (
          <article key={option.title} className="route-card support-page-card">
            <h2>{option.title}</h2>
            <p>{option.description}</p>
            <Link className="animals-primary-action" to={option.to}>
              {option.actionLabel}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
