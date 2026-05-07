import { MANAGED_USER_ROLE_VALUES } from '../shared/rolePolicies.js';

export { MANAGED_USER_ROLE_VALUES };

export const USER_STATUS_VALUES = ['active', 'inactive'];
export const ADMIN_CREATABLE_USER_ROLE_VALUES = ['employee'];
export const USER_SELF_EDITABLE_FIELDS = ['firstName', 'lastName', 'email'];
export const USER_ADMIN_EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'role', 'isActive'];
export const USER_ADMIN_PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'role'];
export const USER_STATUS_EDITABLE_FIELDS = ['isActive', 'status'];
export const USER_EMPLOYEE_CREATE_FIELDS = [
  'firstName',
  'lastName',
  'username',
  'email',
  'password',
  'confirmPassword',
  'role',
  'isActive',
];
