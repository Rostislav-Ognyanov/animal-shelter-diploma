import { ROLE_LABELS, normalizeRole } from './rolePolicies.js';

const PROFILE_MENUS = {
  guest: [
    { href: '/login', label: 'Вход' },
    { href: '/register', label: 'Регистрация' },
  ],
  client: [
    { href: '/profile', label: 'Профил' },
    { href: '/favorites', label: 'Любими животни' },
    { href: '/adoptions/my', label: 'Моите заявки' },
    { href: '/logout', label: 'Изход от профил' },
  ],
  employee: [
    { href: '/profile', label: 'Профил', title: 'Моят профил' },
    { href: '/staff/adoptions', label: 'Заявки', title: 'Заявки за осиновяване' },
    { href: '/staff/volunteers', label: 'Доброволци', title: 'Кандидатури за доброволчество' },
    { href: '/staff/signals', label: 'Сигнали', title: 'Сигнали за животни в нужда' },
    { href: '/staff/donations', label: 'Дарения', title: 'Демонстрационни дарения' },
    { href: '/animals/new', label: 'Ново животно', title: 'Създаване на нов запис за животно' },
    { href: '/search', label: 'Животни', title: 'Списък с животни' },
    { href: '/logout', label: 'Изход', title: 'Изход от профил' },
  ],
  admin: [
    { href: '/profile', label: 'Профил', title: 'Моят профил' },
    { href: '/admin/users', label: 'Потребители', title: 'Административен списък с потребители' },
    { href: '/admin/reports', label: 'Отчети', title: 'Административни справки и отчети' },
    { href: '/admin/adoptions', label: 'Заявки', title: 'Заявки за осиновяване' },
    { href: '/admin/volunteers', label: 'Доброволци', title: 'Кандидатури за доброволчество' },
    { href: '/admin/signals', label: 'Сигнали', title: 'Сигнали за животни в нужда' },
    { href: '/admin/donations', label: 'Дарения', title: 'Демонстрационни дарения' },
    { href: '/animals/new', label: 'Ново животно', title: 'Създаване на нов запис за животно' },
    { href: '/search', label: 'Животни', title: 'Списък с животни' },
    { href: '/logout', label: 'Изход', title: 'Изход от профил' },
  ],
};

export function getProfileMenu(roleCandidate) {
  const role = normalizeRole(roleCandidate);

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    links: PROFILE_MENUS[role] ?? PROFILE_MENUS.guest,
  };
}
