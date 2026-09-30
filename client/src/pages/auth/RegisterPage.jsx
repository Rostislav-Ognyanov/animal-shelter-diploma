import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
  USERNAME_HTML_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../../../../shared/domain/userConstants.js';

import { getAuthRedirectPath } from '../../auth/authNavigation.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { AuthPageLayout } from '../../components/layout/AuthPageLayout.jsx';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const redirectTarget = location.state?.from;
  const redirectPath = getAuthRedirectPath(redirectTarget);

  const [formState, setFormState] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function updateField(field, value) {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formState.acceptTerms) {
      setErrorMessage('Необходимо е да приемеш условията за ползване.');
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setErrorMessage('Полетата за парола не съвпадат.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await register({
        firstName: formState.firstName,
        lastName: formState.lastName,
        username: formState.username,
        email: formState.email,
        password: formState.password,
        confirmPassword: formState.confirmPassword,
        acceptTerms: formState.acceptTerms,
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
      kicker="Регистрация"
      title="Създай клиентски профил"
      description="Попълни основните данни, за да създадеш клиентски профил и да използваш всички възможности на платформата."
      supportLinks={
        <>
          <p>
            Вече имаш профил?{' '}
            <Link
              to="/login"
              state={redirectTarget ? { from: redirectTarget } : undefined}
              className="auth-text-link"
            >
              Вход
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
        <div className="auth-field-row">
          <label>
            Име
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              value={formState.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              placeholder="Въведи име"
              maxLength={USER_FIRST_NAME_MAX_LENGTH}
              required
            />
          </label>

          <label>
            Фамилия
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              value={formState.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              placeholder="Въведи фамилия"
              maxLength={USER_LAST_NAME_MAX_LENGTH}
              required
            />
          </label>
        </div>

        <label>
          Потребителско име
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={formState.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="Избери потребителско име"
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern={USERNAME_HTML_PATTERN}
            required
          />
        </label>

        <label>
          Имейл адрес
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={formState.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="Въведи имейл адрес"
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
              autoComplete="new-password"
              value={formState.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Създай парола"
              minLength={USER_PASSWORD_MIN_LENGTH}
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
          <small className="auth-field-helper">
            Мин. {USER_PASSWORD_MIN_LENGTH} символа, буква и цифра.
          </small>
        </label>

        <label>
          Потвърди паролата
          <div className="auth-password-row">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              value={formState.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              placeholder="Повтори паролата"
              minLength={USER_PASSWORD_MIN_LENGTH}
              maxLength={USER_PASSWORD_MAX_LENGTH}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
            >
              {showConfirmPassword ? 'Скрий' : 'Покажи'}
            </button>
          </div>
        </label>

        <div className="auth-form-meta">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={formState.acceptTerms}
              onChange={(event) => updateField('acceptTerms', event.target.checked)}
              required
            />
            <span>
              Приемам{' '}
              <Link to="/obshti-uslovia" target="_blank" rel="noreferrer">
                условията за ползване
              </Link>
            </span>
          </label>
        </div>

        {errorMessage ? (
          <div className="feedback-message feedback-message-error" aria-live="polite">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Създаване...' : 'Създай профил'}
        </button>
      </form>
    </AuthPageLayout>
  );
}
