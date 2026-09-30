import { ROLE_LABELS, normalizeRole } from './rolePolicies.js';

function freezeMenuLinks(links) {
  return Object.freeze(links.map((link) => Object.freeze({ ...link })));
}

const PROFILE_MENUS = Object.freeze({
  guest: freezeMenuLinks([
    { href: '/login', label: 'Вход' },
    { href: '/register', label: 'Регистрация' },
  ]),
  client: freezeMenuLinks([
    { href: '/profile', label: 'Профил' },
    { href: '/adoptions/my', label: 'Моите заявки' },
    { href: '/favorites', label: 'Любими животни' },
    { href: '/logout', label: 'Изход' },
  ]),
  employee: freezeMenuLinks([
    { href: '/profile', label: 'Профил' },
    { href: '/logout', label: 'Изход' },
  ]),
  admin: freezeMenuLinks([
    { href: '/profile', label: 'Профил' },
    { href: '/logout', label: 'Изход' },
  ]),
});

export function getProfileMenu(roleCandidate) {
  const role = normalizeRole(roleCandidate);

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    links: (PROFILE_MENUS[role] ?? PROFILE_MENUS.guest).map((link) => ({ ...link })),
  };
}
