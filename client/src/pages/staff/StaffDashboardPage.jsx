import { DashboardPage } from '../../components/common/DashboardPage.jsx';

const STAFF_DASHBOARD_LINKS = [
  {
    to: '/animals',
    label: 'Животни',
    description: 'Преглед, редакция и добавяне на животни.',
  },
  {
    to: '/staff/adoptions',
    label: 'Осиновявания',
    description: 'Преглед и обработка на заявки.',
  },
  {
    to: '/staff/volunteers',
    label: 'Доброволци',
    description: 'Кандидатури и статуси за доброволчество.',
  },
  {
    to: '/staff/signals',
    label: 'Сигнали',
    description: 'Сигнали за намерени животни в нужда.',
  },
  {
    to: '/staff/inquiries',
    label: 'Запитвания',
    description: 'Въпроси от посетители за осиновяване, доброволчество, дарения и обща връзка.',
  },
  {
    to: '/staff/donations',
    label: 'Дарения',
    description: 'Преглед на заявените дарения.',
  },
  {
    to: '/staff/content',
    label: 'Управление на съдържанието',
    description:
      'Редактиране на публичните страници, информацията за видовете и спасителните истории.',
  },
];

export function StaffDashboardPage() {
  return (
    <DashboardPage
      meta="Служебно табло"
      title="Работни модули"
      description="Бърз достъп до основните служебни действия в системата."
      links={STAFF_DASHBOARD_LINKS}
    />
  );
}
