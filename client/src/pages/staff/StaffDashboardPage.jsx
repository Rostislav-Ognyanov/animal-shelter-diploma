import { Link } from 'react-router-dom';

const STAFF_DASHBOARD_LINKS = [
  { to: '/search', label: 'Животни', description: 'Преглед, редакция и добавяне на животни.' },
  { to: '/staff/adoptions', label: 'Осиновявания', description: 'Преглед и обработка на заявки.' },
  { to: '/staff/volunteers', label: 'Доброволци', description: 'Кандидатури и статуси за доброволчество.' },
  { to: '/staff/signals', label: 'Сигнали', description: 'Сигнали за намерени животни в нужда.' },
  { to: '/staff/donations', label: 'Дарения', description: 'Преглед на заявените дарения.' },
];

export function StaffDashboardPage() {
  return (
    <main className="route-shell staff-dashboard-shell">
      <section className="route-card staff-dashboard-hero">
        <p className="route-meta">Служебно табло</p>
        <h1>Работни модули</h1>
        <p>Бърз достъп до основните служебни действия в системата.</p>
      </section>

      <section className="staff-dashboard-grid">
        {STAFF_DASHBOARD_LINKS.map((item) => (
          <Link key={item.to} className="staff-dashboard-card" to={item.to}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
