import { Link } from 'react-router-dom';

export function DashboardPage({ meta, title, description, links }) {
  return (
    <main className="route-shell dashboard-shell">
      <section className="route-card dashboard-hero">
        <p className="route-meta">{meta}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="dashboard-grid">
        {links.map((item) => (
          <Link key={item.to} className="dashboard-card" to={item.to}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
