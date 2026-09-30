import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider.jsx';
import { getAuthRedirectPath } from './authNavigation.js';

function AuthRouteFallback({ title, description }) {
  return (
    <div className="app-status-screen">
      <div className="app-status-card">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <AuthRouteFallback
        title="Зареждане"
        description="Проверяваме текущата сесия, за да покажем правилната auth страница."
      />
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getAuthRedirectPath(location.state?.from)} replace />;
  }

  return <Outlet />;
}

export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <AuthRouteFallback
        title="Зареждане"
        description="Проверяваме правата за достъп до избраната страница."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          from: requestedPath,
          requiredRoles: allowedRoles,
          currentRole: role,
        }}
      />
    );
  }

  return <Outlet />;
}
