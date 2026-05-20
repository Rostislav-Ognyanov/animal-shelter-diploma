import { ROLE_LABELS, normalizeRole } from './rolePolicies.js';

const PROFILE_MENUS = {
  guest: [
    { href: '/login', label: 'Вход' },
    { href: '/register', label: 'Регистрация' },
  ],
  client: [
    { href: '/profile', label: 'Профил' },
    { href: '/adoptions/my', label: 'Моите заявки' },
    { href: '/favorites', label: 'Любими животни' },
    { href: '/logout', label: 'Изход' },
  ],
  employee: [
    { href: '/profile', label: 'Профил' },
    { href: '/logout', label: 'Изход' },
  ],
  admin: [
    { href: '/profile', label: 'Профил' },
    { href: '/logout', label: 'Изход' },
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
