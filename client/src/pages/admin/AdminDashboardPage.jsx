import { Link } from 'react-router-dom';

const ADMIN_DASHBOARD_LINKS = [
  { to: '/search', label: 'Животни', description: 'Пълен достъп до животните и техния статус.' },
  { to: '/admin/adoptions', label: 'Осиновявания', description: 'Административен преглед на заявките.' },
  { to: '/admin/volunteers', label: 'Доброволци', description: 'Кандидатури и одобрения за доброволчество.' },
  { to: '/admin/signals', label: 'Сигнали', description: 'Сигнали за животни и служебна обработка.' },
  { to: '/admin/donations', label: 'Дарения', description: 'Преглед на заявените дарения.' },
  { to: '/admin/users', label: 'Потребители', description: 'Клиенти, служители, роли и активност.' },
  { to: '/admin/reports', label: 'Отчети', description: 'Dashboard, статистики и аналитични справки.' },
];

export function AdminDashboardPage() {
  return (
    <main className="route-shell staff-dashboard-shell">
      <section className="route-card staff-dashboard-hero">
        <p className="route-meta">Административно табло</p>
        <h1>Управление на системата</h1>
        <p>Бърз достъп до модулите за контрол, справки и служебна работа.</p>
      </section>

      <section className="staff-dashboard-grid">
        {ADMIN_DASHBOARD_LINKS.map((item) => (
          <Link key={item.to} className="staff-dashboard-card" to={item.to}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
