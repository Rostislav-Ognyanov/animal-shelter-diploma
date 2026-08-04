import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchJson, patchJson } from '../../lib/api.js';
import { DEFAULT_SITE_SETTINGS } from './useSiteSettings.js';

function Field({ label, children }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function splitSocialLinks(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...urlParts] = line.split('|');
      return {
        label: String(label ?? '').trim(),
        url: urlParts.join('|').trim(),
      };
    })
    .filter((link) => link.label && link.url);
}

function joinSocialLinks(value) {
  return Array.isArray(value) ? value.map((link) => `${link.label} | ${link.url}`).join('\n') : '';
}

export function SiteSettingsManagementPage() {
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [socialLinksText, setSocialLinksText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/site-settings')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const nextSettings = {
          ...DEFAULT_SITE_SETTINGS,
          ...payload,
          publicBanner: {
            ...DEFAULT_SITE_SETTINGS.publicBanner,
            ...(payload?.publicBanner ?? {}),
          },
        };
        setSettings(nextSettings);
        setSocialLinksText(joinSocialLinks(nextSettings.socialLinks));
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateSettings(patch) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      ...patch,
    }));
  }

  function updatePublicBanner(patch) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      publicBanner: {
        ...DEFAULT_SITE_SETTINGS.publicBanner,
        ...(currentSettings.publicBanner ?? {}),
        ...patch,
      },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedSettings = await patchJson('/api/site-settings', {
        ...settings,
        socialLinks: splitSocialLinks(socialLinksText),
      });
      const nextSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...savedSettings,
        publicBanner: {
          ...DEFAULT_SITE_SETTINGS.publicBanner,
          ...(savedSettings.publicBanner ?? {}),
        },
      };
      setSettings(nextSettings);
      setSocialLinksText(joinSocialLinks(nextSettings.socialLinks));
      setStatusMessage('Настройките са запазени успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero">
        <div>
          <p className="route-meta">Администраторски настройки</p>
          <h1>Контакти и идентичност</h1>
          <p>
            Тези данни се използват във footer-а, header-а, контактната страница и други публични
            блокове. Служебната навигация и route адресите остават фиксирани в кода.
          </p>
        </div>
        <Link className="animals-secondary-action" to="/admin">
          Назад
        </Link>
      </section>

      <form className="page-content-admin-card" onSubmit={saveSettings}>
        <h2>Настройки на сайта</h2>
        <div className="page-content-admin-form-grid">
          <TextInput
            label="Име на приюта"
            value={settings.siteName}
            onChange={(value) => updateSettings({ siteName: value })}
          />
          <TextInput
            label="Лого"
            value={settings.logoUrl}
            onChange={(value) => updateSettings({ logoUrl: value })}
          />
          <TextInput
            label="Copyright"
            value={settings.copyright}
            onChange={(value) => updateSettings({ copyright: value })}
          />
          <TextInput
            label="Вторичен footer текст"
            value={settings.footerSecondary}
            onChange={(value) => updateSettings({ footerSecondary: value })}
          />
          <TextInput
            label="Телефон"
            value={settings.phone}
            onChange={(value) => updateSettings({ phone: value })}
          />
          <TextInput
            label="Email"
            value={settings.email}
            onChange={(value) => updateSettings({ email: value })}
          />
          <TextInput
            label="Работно време"
            value={settings.workingHours}
            onChange={(value) => updateSettings({ workingHours: value })}
          />
          <TextInput
            label="Адрес"
            value={settings.address}
            onChange={(value) => updateSettings({ address: value })}
          />
          <label className="page-content-admin-field page-content-admin-field-wide">
            <span>Социални профили, формат: Label | URL</span>
            <textarea rows={4} value={socialLinksText} onChange={(event) => setSocialLinksText(event.target.value)} />
          </label>
        </div>

        <div className="page-content-admin-subsection">
          <h3>Публичен банер</h3>
          <label className="page-content-admin-check">
            <input
              type="checkbox"
              checked={Boolean(settings.publicBanner?.isVisible)}
              onChange={(event) => updatePublicBanner({ isVisible: event.target.checked })}
            />
            <span>Показвай банер над header-а</span>
          </label>
          <label className="page-content-admin-field">
            <span>Текст на банера</span>
            <textarea
              rows={3}
              value={settings.publicBanner?.text ?? ''}
              onChange={(event) => updatePublicBanner({ text: event.target.value })}
            />
          </label>
        </div>

        <div className="profile-form-actions">
          <button type="submit" className="animals-primary-action" disabled={isSaving}>
            {isSaving ? 'Запазване...' : 'Запази настройките'}
          </button>
        </div>
        {statusMessage ? <p className="form-success-message">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-error-message">{errorMessage}</p> : null}
      </form>
    </main>
  );
}
