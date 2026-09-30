import { useEffect, useState } from 'react';

import { SITE_SETTINGS_DEFAULTS } from '../../../../shared/domain/siteSettingsConstants.js';
import { fetchJson } from '../../lib/api.js';

function mergeSiteSettings(defaultSettings, payload = {}) {
  return {
    ...defaultSettings,
    ...payload,
    socialLinks: Array.isArray(payload.socialLinks)
      ? payload.socialLinks.map((link) => ({ ...link }))
      : [...defaultSettings.socialLinks],
    publicBanner: {
      ...defaultSettings.publicBanner,
      ...(payload.publicBanner ?? {}),
    },
  };
}

export function useSiteSettings(defaultSettings = SITE_SETTINGS_DEFAULTS) {
  const [settings, setSettings] = useState(() => mergeSiteSettings(defaultSettings));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError('');

    fetchJson('/api/site-settings')
      .then((payload) => {
        if (isMounted) {
          setSettings(mergeSiteSettings(defaultSettings, payload));
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.message);
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
  }, [defaultSettings, reloadToken]);

  return {
    settings,
    isLoading,
    error,
    reload: () => setReloadToken((currentValue) => currentValue + 1),
    setSettings,
  };
}
