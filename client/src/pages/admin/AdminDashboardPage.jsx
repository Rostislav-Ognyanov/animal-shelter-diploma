import { Link } from 'react-router-dom';

const ADMIN_DASHBOARD_LINKS = [
  { to: '/search', label: 'Животни', description: 'Пълен достъп до животните и техния статус.' },
  {
    to: '/admin/adoptions',
    label: 'Осиновявания',
    description: 'Административен преглед на заявките.',
  },
  {
    to: '/admin/volunteers',
    label: 'Доброволци',
    description: 'Кандидатури и одобрения за доброволчество.',
  },
  { to: '/admin/signals', label: 'Сигнали', description: 'Сигнали за животни и служебна обработка.' },
  { to: '/admin/donations', label: 'Дарения', description: 'Преглед на заявените дарения.' },
  { to: '/admin/users', label: 'Потребители', description: 'Клиенти, служители, роли и активност.' },
  { to: '/admin/reports', label: 'Отчети', description: 'Dashboard, статистики и аналитични справки.' },
  {
    to: '/admin/page-content',
    label: 'Съдържание',
    description: 'Редакция на публичните блокове, снимки и CTA надписи.',
  },
  {
    to: '/admin/legal-content',
    label: 'Юридически',
    description: 'Чернови, публикуване и история на юридическите страници.',
  },
  {
    to: '/admin/species-content',
    label: 'Видове',
    description: 'Чернови и публикуване на информацията по видове животни.',
  },
  {
    to: '/admin/rescue-stories-content',
    label: 'Истории',
    description: 'Добавяне, редакция, featured ред и архивиране на истории.',
  },
  {
    to: '/admin/site-settings',
    label: 'Настройки',
    description: 'Контакти, име на приюта, лого и общи публични данни.',
  },
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
