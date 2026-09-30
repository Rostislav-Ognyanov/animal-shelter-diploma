import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthProvider.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { Header } from './components/layout/Header.jsx';
import { ScrollToTop } from './components/layout/ScrollToTop.jsx';
import { FavoritesProvider } from './favorites/FavoritesProvider.jsx';
import { fetchJson } from './lib/api.js';
import { SITE_SETTINGS_UPDATED_EVENT } from './lib/appEvents.js';
import { AppRoutes } from './routes/AppRoutes.jsx';

function AppLayout() {
  const {
    currentUser,
    errorMessage: authError,
    isLoading: isAuthLoading,
    logout,
    refreshAuth,
    role,
  } = useAuth();
  const [layoutData, setLayoutData] = useState(null);
  const [pageError, setPageError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    let isMounted = true;
    setPageError('');

    async function loadLayoutData() {
      try {
        const payload = await fetchJson('/api/home');

        if (!isMounted) {
          return;
        }

        setLayoutData(payload);
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
  }, [isAuthLoading, role, reloadToken]);

  useEffect(() => {
    function reloadLayoutData() {
      setReloadToken((currentValue) => currentValue + 1);
    }

    window.addEventListener(SITE_SETTINGS_UPDATED_EVENT, reloadLayoutData);

    return () => {
      window.removeEventListener(SITE_SETTINGS_UPDATED_EVENT, reloadLayoutData);
    };
  }, []);

  if (authError) {
    return (
      <div className="app-status-screen">
        <div className="app-status-card">
          <h1>Профилът не може да се зареди</h1>
          <p>{authError}</p>
          <button type="button" className="app-primary-action" onClick={() => refreshAuth().catch(() => {})}>
            Опитай отново
          </button>
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
          <button
            type="button"
            className="app-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  if (isAuthLoading || !layoutData) {
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
        logoUrl={layoutData.logoUrl}
        siteName={layoutData.siteName}
        profileMenu={layoutData.profileMenu}
        currentUser={currentUser}
        onLogout={logout}
        role={role}
        publicBanner={layoutData.publicBanner}
      />
      <div className="app-content">
        <AppRoutes layoutData={layoutData} role={role} />
      </div>
      <Footer footer={layoutData.footer} siteName={layoutData.siteName} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <FavoritesProvider>
          <AppLayout />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
