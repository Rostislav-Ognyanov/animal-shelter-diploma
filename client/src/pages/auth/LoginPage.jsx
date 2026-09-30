import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
} from '../../../../shared/domain/userConstants.js';
import { getAuthRedirectPath } from '../../auth/authNavigation.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { AuthPageLayout } from '../../components/layout/AuthPageLayout.jsx';

const INITIAL_FORM = {
  identifier: '',
  password: '',
  rememberMe: false,
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authNotice, clearAuthNotice } = useAuth();
  const redirectTarget = location.state?.from;
  const redirectPath = getAuthRedirectPath(redirectTarget);

  const [formState, setFormState] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function updateField(field, value) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const identifier = formState.identifier.trim();
    const password = formState.password;

    if (!identifier || !password) {
      setErrorMessage('Попълни потребителско име или имейл и парола.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    clearAuthNotice();

    try {
      await login({
        identifier,
        password,
        rememberMe: formState.rememberMe,
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      kicker="Вход"
      title="Добре дошъл отново"
      description="Въведи потребителско име или имейл и парола, за да продължиш."
      supportLinks={
        <>
          <p>
            Нямаш профил?{' '}
            <Link
              to="/register"
              state={redirectTarget ? { from: redirectTarget } : undefined}
              className="auth-text-link"
            >
              Регистрация
            </Link>
          </p>
          <p>
            Назад към{' '}
            <Link to="/" className="auth-text-link">
              началната страница
            </Link>
          </p>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Потребителско име или имейл
          <input
            type="text"
            name="identifier"
            autoComplete="username"
            value={formState.identifier}
            onChange={(event) => updateField('identifier', event.target.value)}
            placeholder="Въведи потребителско име или имейл"
            maxLength={USER_EMAIL_MAX_LENGTH}
            required
          />
        </label>

        <label>
          Парола
          <div className="auth-password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={formState.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Въведи парола"
              maxLength={USER_PASSWORD_MAX_LENGTH}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
            >
              {showPassword ? 'Скрий' : 'Покажи'}
            </button>
          </div>
        </label>

        <div className="auth-form-meta">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={formState.rememberMe}
              onChange={(event) => updateField('rememberMe', event.target.checked)}
            />
            <span>Запомни ме</span>
          </label>
        </div>

        {errorMessage ? (
          <div className="feedback-message feedback-message-error" aria-live="polite">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && authNotice ? (
          <div className="feedback-message feedback-message-error" aria-live="polite">
            {authNotice}
          </div>
        ) : null}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Изпращане...' : 'Вход'}
        </button>
      </form>
    </AuthPageLayout>
  );
}
