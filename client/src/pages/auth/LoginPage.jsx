import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';

const INITIAL_FORM = {
  username: '',
  password: '',
  rememberMe: false,
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authNotice, clearAuthNotice } = useAuth();
  const redirectTarget = location.state?.from;
  const redirectPath = redirectTarget
    ? `${redirectTarget.pathname ?? '/'}${redirectTarget.search ?? ''}${redirectTarget.hash ?? ''}`
    : '/';

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

    const username = formState.username.trim();
    const password = formState.password.trim();

    if (!username || !password) {
      setErrorMessage('Попълни потребителско име и парола.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    clearAuthNotice();

    try {
      await login({
        username,
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
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-form-panel auth-form-panel-left">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Вход</p>
            <h1>Добре дошъл отново</h1>
            <p>Въведи потребителско име и парола, за да продължиш.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Потребителско име
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={formState.username}
                onChange={(event) => updateField('username', event.target.value)}
                placeholder="Въведи потребителско име"
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
              <div className="auth-status auth-status-error" aria-live="polite">
                {errorMessage}
              </div>
            ) : null}

            {!errorMessage && authNotice ? (
              <div className="auth-status auth-status-error" aria-live="polite">
                {authNotice}
              </div>
            ) : null}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Изпращане...' : 'Вход'}
            </button>
          </form>

          <div className="auth-support-links">
            <p>
              Нямаш профил?{' '}
              <Link to="/register" className="auth-text-link">
                Регистрация
              </Link>
            </p>
            <p>
              Назад към{' '}
              <Link to="/" className="auth-text-link">
                началната страница
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-side-panel">
          <div className="auth-side-panel-inner auth-shelter-note">
            <h2>Спасените животни получават нов шанс</h2>
            <p>
              Приютът осигурява временен дом, медицинска грижа и спокойна среда за спасени
              животни, докато намерят своите осиновители.
            </p>
            <p>
              Всяко постъпило животно преминава през наблюдение, възстановяване и подготовка
              за ново начало.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
