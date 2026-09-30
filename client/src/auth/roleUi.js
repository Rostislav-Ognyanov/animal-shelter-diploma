import { ROLE_LABELS } from '../../../shared/domain/roleConstants.js';

export { ROLE_LABELS };

function isEmployeeLike(role) {
  return role === 'employee' || role === 'admin';
}

export function canManageAnimals(role) {
  return isEmployeeLike(role);
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? ROLE_LABELS.guest;
}
