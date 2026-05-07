import {
  ANIMAL_STATUS_TRANSITIONS,
  getAnimalStatusLabel,
} from '../pages/animals/animalUi.js';

export const ROLE_LABELS = {
  guest: 'Гост',
  client: 'Клиент',
  employee: 'Служител',
  admin: 'Администратор',
};

export const ROLE_DESCRIPTIONS = {
  guest: 'Разглеждаш публичната част на платформата и можеш да търсиш животни преди вход.',
  client: 'Имаш достъп до клиентските действия и можеш да подаваш и следиш своите заявки за осиновяване.',
  employee: 'В служебен режим можеш да управляваш животни, доброволчески кандидатури, сигнали, дарения и заявки за осиновяване.',
  admin: 'Административният режим включва пълен контрол върху животните, доброволците, сигналите, даренията, заявките и потребителите.',
};

export const ROLE_UI_ACTIONS = {
  guest: [
    { label: 'Разгледай животните', to: '/search', variant: 'primary' },
    { label: 'Дарения', to: '/donations', variant: 'secondary' },
  ],
  client: [
    { label: 'Разгледай животните', to: '/search', variant: 'primary' },
    { label: 'Моите заявки', to: '/adoptions/my', variant: 'secondary' },
    { label: 'Свържи се с нас', to: '/svurji-se-s-nas', variant: 'secondary' },
  ],
  employee: [
    { label: 'Заявки', to: '/staff/adoptions', variant: 'primary' },
    { label: 'Сигнали', to: '/staff/signals', variant: 'secondary' },
    { label: 'Доброволци', to: '/staff/volunteers', variant: 'secondary' },
  ],
  admin: [
    { label: 'Потребители', to: '/admin/users', variant: 'primary' },
    { label: 'Отчети', to: '/admin/reports', variant: 'secondary' },
    { label: 'Сигнали', to: '/admin/signals', variant: 'secondary' },
    { label: 'Заявки', to: '/admin/adoptions', variant: 'secondary' },
  ],
};

export { getAnimalStatusLabel };

export function isEmployeeLike(role) {
  return role === 'employee' || role === 'admin';
}

export function isAdmin(role) {
  return role === 'admin';
}

export function canManageAnimals(role) {
  return isEmployeeLike(role);
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? ROLE_LABELS.guest;
}

export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.guest;
}

export function getRoleUiActions(role) {
  return ROLE_UI_ACTIONS[role] ?? ROLE_UI_ACTIONS.guest;
}

export function getAvailableStatusTransitions(status, role) {
  const transitions = ANIMAL_STATUS_TRANSITIONS[status] ?? [];

  if (role === 'employee') {
    return transitions.filter((nextStatus) => nextStatus !== 'inactive' && nextStatus !== 'archived');
  }

  return transitions;
}

