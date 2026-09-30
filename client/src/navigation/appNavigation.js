const PUBLIC_NAVIGATION = [
  { to: '/za-nas', label: 'За нас' },
  {
    to: '/podkrepa',
    label: 'Подкрепа',
    items: [
      { to: '/donations', label: 'Дарения' },
      { to: '/animals', label: 'Осиновяване' },
    ],
  },
  { to: '/volunteers', label: 'Доброволец' },
  {
    to: '/za-zhivotnite',
    label: 'За животните',
    items: [
      { to: '/informacia-za-zhivotnite', label: 'Информация за животните ни' },
      { to: '/istorii-za-spasyavaniya', label: 'Истории за спасявания' },
    ],
  },
  { to: '/svurji-se-s-nas', label: 'Свържи се с нас' },
];

const EMPLOYEE_NAVIGATION = [
  { to: '/staff', label: 'Табло' },
  { to: '/animals', label: 'Животни' },
  {
    id: 'employee-requests',
    label: 'Заявки',
    items: [
      { to: '/staff/adoptions', label: 'Осиновявания' },
      { to: '/staff/volunteers', label: 'Доброволчество' },
      { to: '/staff/inquiries', label: 'Запитвания' },
      { to: '/staff/donations', label: 'Дарения' },
    ],
  },
  { to: '/staff/signals', label: 'Сигнали' },
  { to: '/staff/content', label: 'Съдържание' },
];

const ADMIN_NAVIGATION = [
  { to: '/admin', label: 'Табло' },
  { to: '/animals', label: 'Животни' },
  {
    id: 'admin-requests',
    label: 'Заявки',
    items: [
      { to: '/admin/adoptions', label: 'Осиновявания' },
      { to: '/admin/volunteers', label: 'Доброволчество' },
      { to: '/admin/inquiries', label: 'Запитвания' },
      { to: '/admin/donations', label: 'Дарения' },
    ],
  },
  { to: '/admin/signals', label: 'Сигнали' },
  { to: '/admin/reports', label: 'Отчети' },
  {
    id: 'admin-management',
    label: 'Управление',
    items: [
      { to: '/admin/users', label: 'Потребители' },
      { to: '/admin/content', label: 'Съдържание' },
    ],
  },
];

export function getMainNavigation(role = 'guest') {
  if (role === 'admin') {
    return ADMIN_NAVIGATION;
  }

  if (role === 'employee') {
    return EMPLOYEE_NAVIGATION;
  }

  return PUBLIC_NAVIGATION;
}
