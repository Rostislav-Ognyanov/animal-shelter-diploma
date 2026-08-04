import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'Animal Shelter',
  logoUrl: 'images/logo.jpg',
  copyright: '© 2026 Animal Shelter',
  footerSecondary: 'Всички права запазени.',
  phone: '+359 888 123 456',
  email: 'contact@animal-shelter.bg',
  address: 'гр. София, ул. Зелена грижа 12',
  workingHours: 'Понеделник - събота, 09:00 - 18:00',
  socialLinks: [],
  publicBanner: {
    isVisible: false,
    text: '',
  },
};

export function useSiteSettings(defaultSettings = DEFAULT_SITE_SETTINGS) {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    fetchJson('/api/site-settings')
      .then((payload) => {
        if (isMounted) {
          setSettings({ ...defaultSettings, ...payload });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSettings(defaultSettings);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [defaultSettings]);

  return { settings, isLoading, setSettings };
}
