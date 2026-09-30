import {
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_EDITABLE_FIELDS,
  SITE_SETTINGS_LIMITS,
  SITE_SETTINGS_PUBLIC_BANNER_FIELDS,
  SITE_SETTINGS_SOCIAL_LINK_FIELDS,
  isValidSiteSettingsExternalUrl,
  isValidSiteSettingsPhone,
} from '../../../shared/domain/siteSettingsConstants.js';
import { EMAIL_PATTERN } from '../../../shared/domain/userConstants.js';
import { normalizeExternalUrl, normalizeImageUrl } from '../../utils/contentUrls.js';
import { createHttpError } from '../../utils/httpError.js';
import { isPlainObject } from '../../utils/object.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';

function normalizeText(value, { fieldName, maxLength, allowEmpty = true }) {
  if (typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} трябва да бъде текст.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue && !allowEmpty) {
    throw createHttpError(400, `${fieldName} е задължително поле.`);
  }

  if (normalizedValue.length > maxLength) {
    throw createHttpError(400, `${fieldName} не може да надвишава ${maxLength} символа.`);
  }

  return normalizedValue;
}

function normalizeSocialLinks(value) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, 'Социалните профили трябва да бъдат списък.');
  }

  if (value.length > SITE_SETTINGS_LIMITS.socialLinks) {
    throw createHttpError(
      400,
      `Могат да бъдат добавени най-много ${SITE_SETTINGS_LIMITS.socialLinks} социални профила.`
    );
  }

  return value.map((link, index) => {
    if (!isPlainObject(link)) {
      throw createHttpError(400, `Социален профил ${index + 1} трябва да бъде JSON обект.`);
    }

    assertAllowedFields(
      link,
      SITE_SETTINGS_SOCIAL_LINK_FIELDS,
      `Социален профил ${index + 1} съдържа неподдържани полета.`
    );

    const label = normalizeText(link.label, {
      fieldName: `Етикетът на социален профил ${index + 1}`,
      maxLength: SITE_SETTINGS_LIMITS.socialLinkLabel,
      allowEmpty: false,
    });
    const rawUrl = normalizeText(link.url, {
      fieldName: `URL адресът на социален профил ${index + 1}`,
      maxLength: SITE_SETTINGS_LIMITS.socialLinkUrl,
      allowEmpty: false,
    });

    if (!isValidSiteSettingsExternalUrl(rawUrl)) {
      throw createHttpError(400, `URL адресът на социален профил ${index + 1} не е валиден.`);
    }

    const url = normalizeExternalUrl(rawUrl, {
      fieldName: `URL адресът на социален профил ${index + 1}`,
    });

    return { label, url };
  });
}

function normalizePublicBanner(value) {
  if (!isPlainObject(value)) {
    throw createHttpError(400, 'Публичният банер трябва да бъде JSON обект.');
  }

  assertAllowedFields(
    value,
    SITE_SETTINGS_PUBLIC_BANNER_FIELDS,
    'Публичният банер съдържа неподдържани полета.'
  );

  if (typeof value.isVisible !== 'boolean') {
    throw createHttpError(400, 'Видимостта на публичния банер трябва да бъде true или false.');
  }

  const text = normalizeText(value.text, {
    fieldName: 'Текстът на публичния банер',
    maxLength: SITE_SETTINGS_LIMITS.bannerText,
  });

  if (value.isVisible && !text) {
    throw createHttpError(400, 'Видимият публичен банер трябва да има текст.');
  }

  return {
    isVisible: value.isVisible,
    text,
  };
}

export function createDefaultSiteSettingsFields() {
  return {
    ...SITE_SETTINGS_DEFAULTS,
    socialLinks: SITE_SETTINGS_DEFAULTS.socialLinks.map((link) => ({ ...link })),
    publicBanner: { ...SITE_SETTINGS_DEFAULTS.publicBanner },
  };
}

export function assertSiteSettingsPatch(payload) {
  assertBodyObject(payload);
  assertAllowedFields(
    payload,
    SITE_SETTINGS_EDITABLE_FIELDS,
    'Настройките съдържат неподдържани полета.'
  );

  if (
    Object.prototype.hasOwnProperty.call(payload, 'publicBanner') &&
    !isPlainObject(payload.publicBanner)
  ) {
    throw createHttpError(400, 'Публичният банер трябва да бъде JSON обект.');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'publicBanner')) {
    assertAllowedFields(
      payload.publicBanner,
      SITE_SETTINGS_PUBLIC_BANNER_FIELDS,
      'Публичният банер съдържа неподдържани полета.'
    );
  }
}

export function mergeSiteSettingsFields(currentSettings, patch) {
  const mergedSettings = {
    ...createDefaultSiteSettingsFields(),
    ...currentSettings,
    socialLinks: Array.isArray(currentSettings?.socialLinks)
      ? currentSettings.socialLinks.map((link) => ({ ...link }))
      : [],
    publicBanner: {
      ...SITE_SETTINGS_DEFAULTS.publicBanner,
      ...(currentSettings?.publicBanner ?? {}),
    },
  };

  SITE_SETTINGS_EDITABLE_FIELDS.forEach((fieldName) => {
    if (
      fieldName !== 'publicBanner' &&
      Object.prototype.hasOwnProperty.call(patch, fieldName)
    ) {
      mergedSettings[fieldName] = patch[fieldName];
    }
  });

  if (Object.prototype.hasOwnProperty.call(patch, 'publicBanner')) {
    mergedSettings.publicBanner = {
      ...mergedSettings.publicBanner,
      ...patch.publicBanner,
    };
  }

  return mergedSettings;
}

export function normalizeSiteSettingsFields(settings) {
  const siteName = normalizeText(settings.siteName, {
    fieldName: 'Името на приюта',
    maxLength: SITE_SETTINGS_LIMITS.siteName,
    allowEmpty: false,
  });
  const rawLogoUrl = normalizeText(settings.logoUrl, {
    fieldName: 'Пътят до логото',
    maxLength: SITE_SETTINGS_LIMITS.logoUrl,
  });
  const email = normalizeText(settings.email, {
    fieldName: 'Имейлът',
    maxLength: SITE_SETTINGS_LIMITS.email,
  }).toLowerCase();
  const phone = normalizeText(settings.phone, {
    fieldName: 'Телефонът',
    maxLength: SITE_SETTINGS_LIMITS.phone,
  });

  if (email && !EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!isValidSiteSettingsPhone(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  return {
    siteName,
    logoUrl:
      normalizeImageUrl(rawLogoUrl, {
        fieldName: 'Пътят до логото',
      }) || SITE_SETTINGS_DEFAULTS.logoUrl,
    copyright:
      normalizeText(settings.copyright, {
        fieldName: 'Copyright текстът',
        maxLength: SITE_SETTINGS_LIMITS.copyright,
      }) || `© 2026 ${siteName}`,
    footerSecondary:
      normalizeText(settings.footerSecondary, {
        fieldName: 'Вторичният footer текст',
        maxLength: SITE_SETTINGS_LIMITS.footerSecondary,
      }) || SITE_SETTINGS_DEFAULTS.footerSecondary,
    phone,
    email,
    address: normalizeText(settings.address, {
      fieldName: 'Адресът',
      maxLength: SITE_SETTINGS_LIMITS.address,
    }),
    workingHours: normalizeText(settings.workingHours, {
      fieldName: 'Работното време',
      maxLength: SITE_SETTINGS_LIMITS.workingHours,
    }),
    socialLinks: normalizeSocialLinks(settings.socialLinks),
    publicBanner: normalizePublicBanner(settings.publicBanner),
  };
}
