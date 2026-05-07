import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
  const { register } = useAuth();

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

      navigate('/', { replace: true });
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
      description="Попълни основните данни и ще активираме нов клиентски достъп в платформата."
      supportLinks={
        <>
          <p>
            Вече имаш профил?{' '}
            <Link to="/login" className="auth-text-link">
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
            />
            <span>Приемам условията за ползване</span>
          </label>
        </div>

        {errorMessage ? (
          <div className="auth-status auth-status-error" aria-live="polite">
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
