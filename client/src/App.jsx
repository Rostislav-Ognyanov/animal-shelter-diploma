import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthProvider.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { Header } from './components/layout/Header.jsx';
import { FavoritesProvider } from './favorites/FavoritesProvider.jsx';
import { fetchJson } from './lib/api.js';
import { AppRoutes } from './routes/AppRoutes.jsx';

function AppLayout() {
  const { currentUser, errorMessage: authError, isLoading: isAuthLoading, logout, role } = useAuth();
  const [homeData, setHomeData] = useState(null);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    let isMounted = true;
    setHomeData(null);
    setPageError('');

    async function loadLayoutData() {
      try {
        const payload = await fetchJson(`/api/home?role=${role}`);

        if (!isMounted) {
          return;
        }

        setHomeData(payload);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message);
      }
    }

    loadLayoutData();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, role]);

  if (authError) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <h1>Профилът не може да се зареди</h1>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <h1>Интерфейсът не може да се зареди</h1>
          <p>{pageError}</p>
        </div>
      </div>
    );
  }

  if (isAuthLoading || !homeData) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <h1>Зареждане</h1>
          <p>Моля, изчакай.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        siteName={homeData.siteName}
        profileMenu={homeData.profileMenu}
        currentUser={currentUser}
        onLogout={logout}
        role={role}
      />
      <AppRoutes homeData={homeData} role={role} />
      <Footer footer={homeData.footer} siteName={homeData.siteName} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <AppLayout />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
