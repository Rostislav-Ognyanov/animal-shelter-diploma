import { Link } from 'react-router-dom';

const EDITORIAL_CONTENT_LINKS = [
  {
    key: 'page-content',
    label: 'Публични страници',
    description:
      'Редактиране на текстовите блокове, изображенията, заглавията и бутоните в публичните страници.',
  },
  {
    key: 'species-content',
    label: 'Информация за видовете',
    description:
      'Редактиране на заглавията, описанията, секциите и изображенията за различните видове животни.',
  },
  {
    key: 'rescue-stories-content',
    label: 'Спасителни истории',
    description: 'Създаване, редактиране и архивиране на истории за спасени животни.',
  },
];

const ADMIN_CONTENT_LINKS = [
  {
    key: 'legal-content',
    label: 'Юридически страници',
    description: 'Редактиране на чернови, публикуване и управление на версиите на юридическите текстове.',
  },
  {
    key: 'site-settings',
    label: 'Общи настройки',
    description: 'Управление на името на приюта, логото, контактите, footer-а и социалните профили.',
  },
];

function ContentDashboardSection({ title, links, routePrefix }) {
  return (
    <section className="content-dashboard-section">
      {title ? <h2>{title}</h2> : null}
      <div className="dashboard-grid">
        {links.map((item) => (
          <Link key={item.key} className="dashboard-card" to={`${routePrefix}/${item.key}`}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ContentDashboardPage({ role }) {
  const isAdmin = role === 'admin';
  const routePrefix = isAdmin ? '/admin' : '/staff';
  const mainDashboardPath = isAdmin ? '/admin' : '/staff';

  return (
    <main className="route-shell dashboard-shell">
      <section className="route-card page-content-admin-hero">
        <div>
          <p className="route-meta">Управление на съдържанието</p>
          <h1>{isAdmin ? 'Съдържание и настройки' : 'Публично съдържание'}</h1>
          <p>Избери категорията, която искаш да редактираш.</p>
        </div>
        <Link className="app-secondary-action" to={mainDashboardPath}>
          Към основното табло
        </Link>
      </section>

      <ContentDashboardSection
        title={isAdmin ? 'Редакционно съдържание' : ''}
        links={EDITORIAL_CONTENT_LINKS}
        routePrefix={routePrefix}
      />

      {isAdmin ? (
        <ContentDashboardSection
          title="Административни настройки"
          links={ADMIN_CONTENT_LINKS}
          routePrefix={routePrefix}
        />
      ) : null}
    </main>
  );
}
