import SiteSettings from '../../models/SiteSettings.js';
import {
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_KEY,
} from '../../../shared/domain/siteSettingsConstants.js';
import { normalizeImageUrl } from '../../utils/contentUrls.js';
import { createHttpError } from '../../utils/httpError.js';
import { hasPermission } from '../shared/rolePolicies.js';
import {
  assertSiteSettingsPatch,
  createDefaultSiteSettingsFields,
  mergeSiteSettingsFields,
  normalizeSiteSettingsFields,
} from './siteSettings.normalizers.js';

function serializeSiteSettings(settings, { includeManagement = false } = {}) {
  if (!settings) {
    const defaultSettings = {
      id: null,
      ...createDefaultSiteSettingsFields(),
    };

    if (includeManagement) {
      return {
        ...defaultSettings,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      };
    }

    const { id, ...publicDefaultSettings } = defaultSettings;
    return publicDefaultSettings;
  }

  const serializedSettings = {
    id: String(settings._id),
    key: settings.key,
    siteName: settings.siteName || SITE_SETTINGS_DEFAULTS.siteName,
    logoUrl:
      normalizeImageUrl(settings.logoUrl, {
        fieldName: 'Пътят до логото',
        strict: false,
      }) || SITE_SETTINGS_DEFAULTS.logoUrl,
    copyright: settings.copyright || `© 2026 ${settings.siteName || SITE_SETTINGS_DEFAULTS.siteName}`,
    footerSecondary: settings.footerSecondary || SITE_SETTINGS_DEFAULTS.footerSecondary,
    phone: settings.phone ?? SITE_SETTINGS_DEFAULTS.phone,
    email: settings.email ?? SITE_SETTINGS_DEFAULTS.email,
    address: settings.address ?? SITE_SETTINGS_DEFAULTS.address,
    workingHours: settings.workingHours ?? SITE_SETTINGS_DEFAULTS.workingHours,
    socialLinks: Array.isArray(settings.socialLinks)
      ? settings.socialLinks.map((link) => ({ label: link.label, url: link.url }))
      : [],
    publicBanner: {
      ...SITE_SETTINGS_DEFAULTS.publicBanner,
      ...(settings.publicBanner ?? {}),
    },
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy ? String(settings.updatedBy) : null,
  };

  if (includeManagement) {
    return serializedSettings;
  }

  const { id, key, createdAt, updatedAt, updatedBy, ...publicSettings } = serializedSettings;
  return publicSettings;
}

function assertPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'content', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

export async function getSiteSettings() {
  const settings = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY }).lean();
  return serializeSiteSettings(settings);
}

export async function updateSiteSettings(payload, currentUser) {
  assertPermission(currentUser, 'manage-settings');
  assertSiteSettingsPatch(payload);

  const currentSettings = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY }).lean();
  const mergedSettings = mergeSiteSettingsFields(currentSettings, payload);
  const settingsPayload = normalizeSiteSettingsFields(mergedSettings);
  const settings = await SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    {
      $set: {
        ...settingsPayload,
        updatedBy: currentUser.id,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializeSiteSettings(settings, { includeManagement: true });
}
