const PUBLIC_NAVIGATION = [
  { to: '/za-nas', label: 'За нас' },
  {
    to: '/podkrepa',
    label: 'Подкрепа',
    items: [
      { to: '/donations', label: 'Дарения' },
      { to: '/search', label: 'Осиновяване' },
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
  { to: '/search', label: 'Животни' },
  { to: '/staff/adoptions', label: 'Осиновявания' },
  { to: '/staff/volunteers', label: 'Доброволци' },
  { to: '/staff/signals', label: 'Сигнали' },
  { to: '/staff/donations', label: 'Дарения' },
];

const ADMIN_NAVIGATION = [
  { to: '/admin', label: 'Табло' },
  { to: '/search', label: 'Животни' },
  { to: '/admin/adoptions', label: 'Осиновявания' },
  { to: '/admin/volunteers', label: 'Доброволци' },
  { to: '/admin/signals', label: 'Сигнали' },
  { to: '/admin/donations', label: 'Дарения' },
  { to: '/admin/users', label: 'Потребители' },
  { to: '/admin/reports', label: 'Отчети' },
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
