import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '../../../../shared/domain/userConstants.js';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  formatUserDate,
  getUserDisplayName,
  getUserRoleLabel,
} from './usersUi.js';

const EMPTY_PROFILE_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  currentPassword: '',
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function buildProfileForm(user) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    currentPassword: '',
  };
}

function normalizeEmailForCompare(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function MyProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [profileState, setProfileState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [passwordState, setPasswordState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson('/api/users/me');

        if (!isMounted) {
          return;
        }

        setPageState({
          item: payload,
          isLoading: false,
          error: '',
        });
        setProfileForm(buildProfileForm(payload));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          item: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  const profileUser = pageState.item ?? currentUser;
  const showClientShortcuts = profileUser?.role === 'client';
  const isProfileEmailChanged = useMemo(() => {
    if (!pageState.item) {
      return false;
    }

    return (
      normalizeEmailForCompare(profileForm.email) !==
      normalizeEmailForCompare(pageState.item.email)
    );
  }, [pageState.item, profileForm.email]);
  const isProfileDirty = useMemo(() => {
    if (!pageState.item) {
      return false;
    }

    return (
      profileForm.firstName !== (pageState.item.firstName ?? '') ||
      profileForm.lastName !== (pageState.item.lastName ?? '') ||
      profileForm.email !== (pageState.item.email ?? '')
    );
  }, [pageState.item, profileForm.email, profileForm.firstName, profileForm.lastName]);

  function handleProfileFieldChange(fieldName, value) {
    setProfileForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handlePasswordFieldChange(fieldName, value) {
    setPasswordForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleProfileReset() {
    setProfileForm(buildProfileForm(pageState.item));
    setProfileState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    try {
      setProfileState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      if (isProfileEmailChanged && !profileForm.currentPassword) {
        setProfileState({
          isSubmitting: false,
          feedback: createErrorFeedback('Въведи текущата си парола, за да смениш имейла.'),
        });
        return;
      }

      const profilePayload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        ...(isProfileEmailChanged ? { currentPassword: profileForm.currentPassword } : {}),
      };

      const updatedProfile = await patchJson('/api/users/me', profilePayload);

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedProfile,
      }));
      setProfileForm(buildProfileForm(updatedProfile));
      updateCurrentUser(updatedProfile);
      setProfileState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Личните данни са обновени успешно.'),
      });
    } catch (error) {
      setProfileState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState({
        isSubmitting: false,
        feedback: createErrorFeedback('Новата парола и потвърждението не съвпадат.'),
      });
      return;
    }

    try {
      setPasswordState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedProfile = await patchJson('/api/users/me/password', passwordForm);

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedProfile,
      }));
      updateCurrentUser(updatedProfile);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Паролата е сменена успешно.'),
      });
    } catch (error) {
      setPasswordState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell profile-shell">
        <section className="route-card profile-loading-card">
          <h1>Зареждане на профила</h1>
          <p>Моля, изчакай.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell profile-shell">
        <section className="route-card profile-loading-card">
          <h1>Профилът не може да се зареди</h1>
          <p>{pageState.error}</p>
          <button
            type="button"
            className="app-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="route-shell profile-shell">
      <section className="profile-hero">
        <div>
          <h1>Моят профил</h1>
        </div>

        <div className="profile-hero-badges">
          <span className="profile-role-pill">{getUserRoleLabel(profileUser?.role)}</span>
        </div>
      </section>

      {showClientShortcuts ? (
        <div className="route-actions profile-shortcuts">
          <Link className="app-secondary-action" to="/adoptions/my">
            Моите заявки
          </Link>
          <Link className="app-primary-action" to="/favorites">
            Любими животни
          </Link>
        </div>
      ) : null}

      <section className="profile-grid">
        <article className="route-card profile-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Преглед на профила</p>
              <h2>{getUserDisplayName(profileUser)}</h2>
              <p>{profileUser?.email}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Потребителско име</dt>
              <dd>{profileUser?.username || 'Няма данни'}</dd>
            </div>
            <div>
              <dt>Създаден профил</dt>
              <dd>{formatUserDate(profileUser?.createdAt)}</dd>
            </div>
            <div>
              <dt>Последно влизане</dt>
              <dd>{formatUserDate(profileUser?.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatUserDate(profileUser?.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card">
          <div className="profile-panel-heading">
            <div>
              <h2>Лични данни</h2>
            </div>
          </div>

          {profileState.feedback.message ? (
            <div
              className={`feedback-message ${profileState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'}`}
            >
              {profileState.feedback.message}
            </div>
          ) : null}

          <form className="profile-form-grid" onSubmit={handleProfileSubmit}>
            <label>
              <span>Име</span>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(event) => handleProfileFieldChange('firstName', event.target.value)}
                disabled={profileState.isSubmitting}
                autoComplete="given-name"
                maxLength={USER_FIRST_NAME_MAX_LENGTH}
                required
              />
            </label>

            <label>
              <span>Фамилия</span>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(event) => handleProfileFieldChange('lastName', event.target.value)}
                disabled={profileState.isSubmitting}
                autoComplete="family-name"
                maxLength={USER_LAST_NAME_MAX_LENGTH}
                required
              />
            </label>

            <label className="profile-form-grid-wide">
              <span>Имейл</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => handleProfileFieldChange('email', event.target.value)}
                disabled={profileState.isSubmitting}
                autoComplete="email"
                maxLength={USER_EMAIL_MAX_LENGTH}
                required
              />
            </label>

            {isProfileEmailChanged ? (
              <label className="profile-form-grid-wide">
                <span>Текуща парола за промяна на имейл</span>
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(event) => handleProfileFieldChange('currentPassword', event.target.value)}
                  disabled={profileState.isSubmitting}
                  autoComplete="current-password"
                  maxLength={USER_PASSWORD_MAX_LENGTH}
                  required
                />
              </label>
            ) : null}

            <div className="profile-form-actions profile-form-grid-wide">
              <button
                type="submit"
                className="app-primary-action"
                disabled={profileState.isSubmitting || !isProfileDirty}
              >
                {profileState.isSubmitting ? 'Запис...' : 'Запази промените'}
              </button>
              <button
                type="button"
                className="app-secondary-action"
                onClick={handleProfileReset}
                disabled={profileState.isSubmitting || !isProfileDirty}
              >
                Върни текущите стойности
              </button>
            </div>
          </form>
        </article>

        <article className="route-card profile-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Сигурност</p>
              <h2>Смяна на парола</h2>
            </div>
            <p>Мин. 8 символа, буква и цифра.</p>
          </div>

          {passwordState.feedback.message ? (
            <div
              className={`feedback-message ${passwordState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'}`}
            >
              {passwordState.feedback.message}
            </div>
          ) : null}

          <form className="profile-form-grid" onSubmit={handlePasswordSubmit}>
            <label className="profile-form-grid-wide">
              <span>Текуща парола</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => handlePasswordFieldChange('currentPassword', event.target.value)}
                disabled={passwordState.isSubmitting}
                autoComplete="current-password"
                maxLength={USER_PASSWORD_MAX_LENGTH}
                required
              />
            </label>

            <label>
              <span>Нова парола</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => handlePasswordFieldChange('newPassword', event.target.value)}
                disabled={passwordState.isSubmitting}
                autoComplete="new-password"
                minLength={USER_PASSWORD_MIN_LENGTH}
                maxLength={USER_PASSWORD_MAX_LENGTH}
                required
              />
            </label>

            <label>
              <span>Потвърди новата парола</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => handlePasswordFieldChange('confirmPassword', event.target.value)}
                disabled={passwordState.isSubmitting}
                autoComplete="new-password"
                minLength={USER_PASSWORD_MIN_LENGTH}
                maxLength={USER_PASSWORD_MAX_LENGTH}
                required
              />
            </label>

            <div className="profile-form-actions profile-form-grid-wide">
              <button
                type="submit"
                className="app-primary-action"
                disabled={passwordState.isSubmitting}
              >
                {passwordState.isSubmitting ? 'Запис...' : 'Смени паролата'}
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
