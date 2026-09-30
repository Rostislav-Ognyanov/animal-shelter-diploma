export const SITE_SETTINGS_UPDATED_EVENT = 'app:site-settings-updated';

export function emitSiteSettingsUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(SITE_SETTINGS_UPDATED_EVENT));
}
