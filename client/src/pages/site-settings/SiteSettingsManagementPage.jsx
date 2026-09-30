import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_LIMITS,
  isValidSiteSettingsExternalUrl,
  isValidSiteSettingsPhone,
} from '../../../../shared/domain/siteSettingsConstants.js';
import { EMAIL_PATTERN } from '../../../../shared/domain/userConstants.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useErrorFeedbackFocus } from '../../hooks/useErrorFeedbackFocus.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import { emitSiteSettingsUpdated } from '../../lib/appEvents.js';

function Field({ label, children }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  disabled = false,
  maxLength,
  required = false,
  type = 'text',
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value ?? ''}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function cloneSiteSettings(settings = SITE_SETTINGS_DEFAULTS) {
  return {
    ...SITE_SETTINGS_DEFAULTS,
    ...settings,
    socialLinks: Array.isArray(settings.socialLinks)
      ? settings.socialLinks.map((link) => ({ ...link }))
      : [],
    publicBanner: {
      ...SITE_SETTINGS_DEFAULTS.publicBanner,
      ...(settings.publicBanner ?? {}),
    },
  };
}

function parseSocialLinks(value) {
  const lines = String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > SITE_SETTINGS_LIMITS.socialLinks) {
    throw new Error(
      `Можеш да добавиш най-много ${SITE_SETTINGS_LIMITS.socialLinks} социални профила.`
    );
  }

  return lines.map((line, index) => {
    const [label, ...urlParts] = line.split('|');
    const normalizedLabel = String(label ?? '').trim();
    const url = urlParts.join('|').trim();

    if (!normalizedLabel || !url) {
      throw new Error(
        `Ред ${index + 1} за социален профил трябва да бъде във формат „Име | https://адрес“.`
      );
    }

    if (normalizedLabel.length > SITE_SETTINGS_LIMITS.socialLinkLabel) {
      throw new Error(
        `Името на социален профил на ред ${index + 1} не може да надвишава ${SITE_SETTINGS_LIMITS.socialLinkLabel} символа.`
      );
    }

    if (url.length > SITE_SETTINGS_LIMITS.socialLinkUrl) {
      throw new Error(`URL адресът на ред ${index + 1} е твърде дълъг.`);
    }

    if (!isValidSiteSettingsExternalUrl(url)) {
      throw new Error(`URL адресът на социален профил на ред ${index + 1} не е валиден.`);
    }

    return { label: normalizedLabel, url };
  });
}

function joinSocialLinks(value) {
  return Array.isArray(value) ? value.map((link) => `${link.label} | ${link.url}`).join('\n') : '';
}

function buildSiteSettingsPayload(settings, socialLinksText) {
  const siteName = String(settings.siteName ?? '').trim();
  const email = String(settings.email ?? '').trim();
  const phone = String(settings.phone ?? '').trim();
  const bannerText = String(settings.publicBanner?.text ?? '').trim();

  if (!siteName) {
    throw new Error('Името на приюта е задължително.');
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    throw new Error('Въведи валиден имейл адрес.');
  }

  if (!isValidSiteSettingsPhone(phone)) {
    throw new Error('Въведи валиден телефонен номер.');
  }

  if (settings.publicBanner?.isVisible && !bannerText) {
    throw new Error('Видимият публичен банер трябва да има текст.');
  }

  return {
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    copyright: settings.copyright,
    footerSecondary: settings.footerSecondary,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    workingHours: settings.workingHours,
    socialLinks: parseSocialLinks(socialLinksText),
    publicBanner: {
      isVisible: settings.publicBanner?.isVisible === true,
      text: settings.publicBanner?.text ?? '',
    },
  };
}

function getSettingsDraftSignature(settings, socialLinksText) {
  return JSON.stringify({
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    copyright: settings.copyright,
    footerSecondary: settings.footerSecondary,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    workingHours: settings.workingHours,
    publicBanner: settings.publicBanner,
    socialLinksText,
  });
}

export function SiteSettingsManagementPage() {
  const [settings, setSettings] = useState(() => cloneSiteSettings());
  const [lastSavedSettings, setLastSavedSettings] = useState(() => cloneSiteSettings());
  const [socialLinksText, setSocialLinksText] = useState('');
  const [lastSavedSocialLinksText, setLastSavedSocialLinksText] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [loadState, setLoadState] = useState({
    isLoading: true,
    error: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorFeedbackRef = useErrorFeedbackFocus(errorMessage);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = !loadState.isLoading && !loadState.error;
  const hasUnsavedChanges = useMemo(
    () =>
      getSettingsDraftSignature(settings, socialLinksText) !==
      getSettingsDraftSignature(lastSavedSettings, lastSavedSocialLinksText),
    [lastSavedSettings, lastSavedSocialLinksText, settings, socialLinksText]
  );
  const { pendingNavigationPath, confirmNavigation, cancelNavigation } =
    useUnsavedChangesGuard(hasUnsavedChanges);

  useEffect(() => {
    let isMounted = true;

    setLoadState({
      isLoading: true,
      error: '',
    });
    setStatusMessage('');
    setErrorMessage('');

    fetchJson('/api/site-settings')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const nextSettings = cloneSiteSettings(payload);
        const nextSocialLinksText = joinSocialLinks(nextSettings.socialLinks);
        setSettings(nextSettings);
        setLastSavedSettings(cloneSiteSettings(nextSettings));
        setSocialLinksText(nextSocialLinksText);
        setLastSavedSocialLinksText(nextSocialLinksText);
        setLoadState({
          isLoading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (isMounted) {
          setLoadState({
            isLoading: false,
            error: error.message,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

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
        ...SITE_SETTINGS_DEFAULTS.publicBanner,
        ...(currentSettings.publicBanner ?? {}),
        ...patch,
      },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const payload = buildSiteSettingsPayload(settings, socialLinksText);
      const savedSettings = await patchJson('/api/site-settings', payload);
      const nextSettings = cloneSiteSettings(savedSettings);
      const nextSocialLinksText = joinSocialLinks(nextSettings.socialLinks);
      setSettings(nextSettings);
      setLastSavedSettings(cloneSiteSettings(nextSettings));
      setSocialLinksText(nextSocialLinksText);
      setLastSavedSocialLinksText(nextSocialLinksText);
      setStatusMessage('Настройките са запазени успешно.');
      emitSiteSettingsUpdated();
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
        <Link className="app-secondary-action" to="/admin/content">
          Към управление на съдържанието
        </Link>
      </section>

      {loadState.isLoading ? (
        <section className="page-content-admin-card">
          <p className="content-state-message" role="status">
            Зареждане на настройките...
          </p>
        </section>
      ) : null}

      {loadState.error ? (
        <section className="page-content-admin-card">
          <div className="adoptions-empty-state">
            <p>{loadState.error}</p>
            <button
              type="button"
              className="app-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        </section>
      ) : null}

      {canEdit ? (
        <form className="page-content-admin-card" onSubmit={saveSettings}>
          <h2>Настройки на сайта</h2>
          <div className="page-content-admin-form-grid">
            <TextInput
              label="Име на приюта"
              value={settings.siteName}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.siteName}
              required
              onChange={(value) => updateSettings({ siteName: value })}
            />
            <TextInput
              label="Лого"
              value={settings.logoUrl}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.logoUrl}
              onChange={(value) => updateSettings({ logoUrl: value })}
            />
            <TextInput
              label="Copyright"
              value={settings.copyright}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.copyright}
              onChange={(value) => updateSettings({ copyright: value })}
            />
            <TextInput
              label="Вторичен footer текст"
              value={settings.footerSecondary}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.footerSecondary}
              onChange={(value) => updateSettings({ footerSecondary: value })}
            />
            <TextInput
              label="Телефон"
              value={settings.phone}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.phone}
              type="tel"
              onChange={(value) => updateSettings({ phone: value })}
            />
            <TextInput
              label="Email"
              value={settings.email}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.email}
              type="email"
              onChange={(value) => updateSettings({ email: value })}
            />
            <TextInput
              label="Работно време"
              value={settings.workingHours}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.workingHours}
              onChange={(value) => updateSettings({ workingHours: value })}
            />
            <TextInput
              label="Адрес"
              value={settings.address}
              disabled={isSaving}
              maxLength={SITE_SETTINGS_LIMITS.address}
              onChange={(value) => updateSettings({ address: value })}
            />
            <label className="page-content-admin-field page-content-admin-field-wide">
              <span>Социални профили, формат: Label | URL</span>
              <textarea
                rows={4}
                value={socialLinksText}
                disabled={isSaving}
                onChange={(event) => setSocialLinksText(event.target.value)}
              />
            </label>
          </div>

          <div className="page-content-admin-subsection">
            <h3>Публичен банер</h3>
            <label className="page-content-admin-check">
              <input
                type="checkbox"
                checked={Boolean(settings.publicBanner?.isVisible)}
                disabled={isSaving}
                onChange={(event) => updatePublicBanner({ isVisible: event.target.checked })}
              />
              <span>Показвай банер над header-а</span>
            </label>
            <label className="page-content-admin-field">
              <span>Текст на банера</span>
              <textarea
                rows={3}
                value={settings.publicBanner?.text ?? ''}
                disabled={isSaving}
                maxLength={SITE_SETTINGS_LIMITS.bannerText}
                required={settings.publicBanner?.isVisible === true}
                onChange={(event) => updatePublicBanner({ text: event.target.value })}
              />
            </label>
          </div>

          <div className="profile-form-actions">
            <button type="submit" className="app-primary-action" disabled={isSaving || !canEdit}>
              {isSaving ? 'Запазване...' : 'Запази настройките'}
            </button>
          </div>
          {statusMessage ? <p className="feedback-message feedback-message-info">{statusMessage}</p> : null}
          {errorMessage ? (
            <p
              ref={errorFeedbackRef}
              className="feedback-message feedback-message-error"
              role="alert"
              tabIndex={-1}
            >
              {errorMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingNavigationPath)}
        title="Незапазени промени"
        description="Промените в настройките не са запазени. Сигурен ли си, че искаш да напуснеш страницата?"
        confirmLabel="Продължи без запазване"
        tone="default"
        onConfirm={confirmNavigation}
        onClose={cancelNavigation}
      />
    </main>
  );
}
