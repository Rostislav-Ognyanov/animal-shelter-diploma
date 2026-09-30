import { Link } from 'react-router-dom';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
} from '../../../../shared/domain/userConstants.js';
import { getUserDisplayName, getUserRoleLabel } from './usersUi.js';

export function ManagedUserEditForm({
  user,
  editForm,
  editState,
  managedRoles,
  isEditingSelf,
  isEditDirty,
  selfRoleNote = 'Собствените профилни данни се променят от страницата "Моят профил".',
  submitLabel = 'Запази промените',
  onFieldChange,
  onReset,
  onSubmit,
}) {
  if (isEditingSelf) {
    return (
      <div className="users-admin-empty-state">
        <h3>Това е твоят профил</h3>
        <p>{selfRoleNote}</p>
        <Link className="app-primary-action" to="/profile">
          Редактирай от Моят профил
        </Link>
      </div>
    );
  }

  return (
    <>
      {editState.feedback.message ? (
        <div
          className={`feedback-message ${
            editState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'
          }`}
        >
          {editState.feedback.message}
        </div>
      ) : null}

      <form className="profile-form-grid" onSubmit={onSubmit}>
        <label>
          <span>Име</span>
          <input
            type="text"
            value={editForm.firstName}
            onChange={(event) => onFieldChange('firstName', event.target.value)}
            disabled={editState.isSubmitting}
            maxLength={USER_FIRST_NAME_MAX_LENGTH}
            required
          />
        </label>

        <label>
          <span>Фамилия</span>
          <input
            type="text"
            value={editForm.lastName}
            onChange={(event) => onFieldChange('lastName', event.target.value)}
            disabled={editState.isSubmitting}
            maxLength={USER_LAST_NAME_MAX_LENGTH}
            required
          />
        </label>

        <label className="profile-form-grid-wide">
          <span>Имейл</span>
          <input
            type="email"
            value={editForm.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            disabled={editState.isSubmitting}
            maxLength={USER_EMAIL_MAX_LENGTH}
            required
          />
        </label>

        <label className="profile-form-grid-wide">
          <span>Роля</span>
          <select
            value={editForm.role}
            onChange={(event) => onFieldChange('role', event.target.value)}
            disabled={editState.isSubmitting}
            required
          >
            {managedRoles.map((role) => (
              <option key={role} value={role}>
                {getUserRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>

        <div className="profile-form-actions profile-form-grid-wide">
          <button
            type="submit"
            className="app-primary-action"
            disabled={editState.isSubmitting || !isEditDirty || !user}
          >
            {editState.isSubmitting ? 'Запис...' : submitLabel}
          </button>
          <button
            type="button"
            className="app-secondary-action"
            onClick={onReset}
            disabled={editState.isSubmitting || !isEditDirty || !user}
          >
            Върни стойностите
          </button>
        </div>
      </form>
    </>
  );
}

export function ManagedUserStatusPanel({
  user,
  statusState,
  isEditingSelf,
  compact = false,
  onStatusActionRequest,
}) {
  return (
    <>
      {statusState.feedback.message ? (
        <div
          className={`feedback-message ${
            statusState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'
          }`}
        >
          {statusState.feedback.message}
        </div>
      ) : null}

      {!compact ? (
        <div className="users-detail-note-list">
          <div className="users-detail-note-card">
            <strong>Текущо състояние</strong>
            <p>{user.isActive ? 'Активен достъп.' : 'Без достъп до системата.'}</p>
          </div>
        </div>
      ) : null}

      <div className="users-admin-status-panel">
        <div>
          <strong>{compact ? 'Статус на профила' : 'Промяна на активността'}</strong>
          <p>
            {compact
              ? user.isActive
                ? 'Активен достъп до системата.'
                : 'Без достъп до системата.'
              : `Чувствително действие за ${getUserDisplayName(user)}.`}
          </p>
        </div>

        <button
          type="button"
          className={user.isActive ? 'app-secondary-action app-danger-action' : 'app-primary-action'}
          disabled={statusState.isSubmitting || (isEditingSelf && user.isActive)}
          onClick={onStatusActionRequest}
        >
          {statusState.isSubmitting
            ? 'Запис...'
            : user.isActive
              ? 'Деактивирай профила'
              : 'Активирай профила'}
        </button>
      </div>
    </>
  );
}
