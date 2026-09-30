import { DashboardPage } from '../../components/common/DashboardPage.jsx';

const ADMIN_DASHBOARD_LINKS = [
  {
    to: '/animals',
    label: 'Животни',
    description: 'Пълен достъп до животните и техния статус.',
  },
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
  {
    to: '/admin/signals',
    label: 'Сигнали',
    description: 'Сигнали за животни и служебна обработка.',
  },
  {
    to: '/admin/inquiries',
    label: 'Запитвания',
    description: 'Преглед на входящите въпроси от контактната страница.',
  },
  {
    to: '/admin/donations',
    label: 'Дарения',
    description: 'Преглед на заявените дарения.',
  },
  {
    to: '/admin/users',
    label: 'Потребители',
    description: 'Клиенти, служители, роли и активност.',
  },
  {
    to: '/admin/reports',
    label: 'Отчети',
    description: 'Обзор, статистики и аналитични справки.',
  },
  {
    to: '/admin/content',
    label: 'Управление на съдържанието',
    description:
      'Публични страници, видове, истории, юридически текстове и общи настройки.',
  },
];

export function AdminDashboardPage() {
  return (
    <DashboardPage
      meta="Административно табло"
      title="Управление на системата"
      description="Бърз достъп до модулите за контрол, справки и служебна работа."
      links={ADMIN_DASHBOARD_LINKS}
    />
  );
}
