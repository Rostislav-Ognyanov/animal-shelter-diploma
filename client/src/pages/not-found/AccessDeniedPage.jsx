import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { getRoleLabel } from '../../auth/roleUi.js';

export function AccessDeniedPage() {
  const location = useLocation();
  const { role } = useAuth();
  const requestedPath = typeof location.state?.from === 'string' ? location.state.from : '';
  const requiredRoles = Array.isArray(location.state?.requiredRoles) ? location.state.requiredRoles : [];
  const currentRole = location.state?.currentRole ?? role;

  return (
    <section className="route-shell">
      <div className="route-card access-denied-card">
        <p className="route-meta">Контрол на достъпа</p>
        <h1>Нямате права за достъп</h1>
        <p>
          Тази страница е ограничена за текущата ви роля и не може да бъде отворена от този профил.
        </p>

        <div className="access-denied-summary">
          <div>
            <strong>Текуща роля</strong>
            <span>{getRoleLabel(currentRole)}</span>
          </div>
          {requestedPath ? (
            <div>
              <strong>Опитан адрес</strong>
              <span>{requestedPath}</span>
            </div>
          ) : null}
        </div>

        {requiredRoles.length > 0 ? (
          <div className="access-denied-roles">
            <strong>Разрешени роли за тази страница</strong>
            <div className="access-denied-role-list">
              {requiredRoles.map((allowedRole) => (
                <span key={allowedRole} className="access-denied-role-pill">
                  {getRoleLabel(allowedRole)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="route-actions">
          <Link className="animals-primary-action" to="/">
            Към началната страница
          </Link>
          <Link className="animals-secondary-action" to="/search">
            Към списъка с животни
          </Link>
        </div>
      </div>
    </section>
  );
}

