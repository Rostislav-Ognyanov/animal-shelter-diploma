import {
  SPECIES_CONTENT_EDITABLE_FIELDS,
  SPECIES_CONTENT_IMAGE_POSITION_VALUES,
  SPECIES_CONTENT_LIMITS,
} from '../../../shared/domain/speciesContentConstants.js';
import { assertImageAltText, normalizeImageUrl } from '../../utils/contentUrls.js';
import { createHttpError } from '../../utils/httpError.js';
import { isPlainObject } from '../../utils/object.js';

function normalizeText(
  value,
  { fieldName = 'Текстът', maxLength, strict = false } = {}
) {
  if (strict && value !== undefined && value !== null && typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} трябва да бъде текст.`);
  }

  const normalizedValue = String(value ?? '').trim();

  if (strict && normalizedValue.length > maxLength) {
    throw createHttpError(400, `${fieldName} не може да надвишава ${maxLength} символа.`);
  }

  return normalizedValue.slice(0, maxLength);
}

function normalizeTextArray(
  value,
  { fieldName, itemFieldName, maxItems, maxItemLength, strict = false }
) {
  if (!Array.isArray(value)) {
    if (strict) {
      throw createHttpError(400, `${fieldName} трябва да бъде списък.`);
    }

    return [];
  }

  if (strict && value.length > maxItems) {
    throw createHttpError(400, `${fieldName} може да съдържа най-много ${maxItems} елемента.`);
  }

  return value
    .slice(0, maxItems)
    .map((item) =>
      normalizeText(item, {
        fieldName: itemFieldName,
        maxLength: maxItemLength,
        strict,
      })
    )
    .filter(Boolean);
}

function normalizeBoolean(value, { defaultValue, fieldName, strict }) {
  if (value === undefined) {
    return defaultValue;
  }

  if (strict && typeof value !== 'boolean') {
    throw createHttpError(400, `${fieldName} трябва да бъде true или false.`);
  }

  return typeof value === 'boolean' ? value : defaultValue;
}

function normalizeImagePosition(value, strict) {
  if (value === undefined || value === null || value === '') {
    return 'right';
  }

  if (!SPECIES_CONTENT_IMAGE_POSITION_VALUES.includes(value)) {
    if (strict) {
      throw createHttpError(400, 'Позицията на снимката трябва да бъде "left" или "right".');
    }

    return 'right';
  }

  return value;
}

function normalizeOrder(value, index, strict) {
  if (value === undefined || value === null || value === '') {
    return index;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    if (strict) {
      throw createHttpError(400, 'Редът на секцията трябва да бъде цяло число.');
    }

    return index;
  }

  return value;
}

function normalizeSection(section, index, strict) {
  if (!isPlainObject(section)) {
    if (strict) {
      throw createHttpError(400, 'Всяка секция трябва да бъде JSON обект.');
    }

    return null;
  }

  const imageUrl = normalizeImageUrl(section.imageUrl, {
    fieldName: 'Пътят до снимката в секцията',
    strict,
  });
  const imageAlt = normalizeText(section.imageAlt, {
    fieldName: 'Alt текстът на снимката в секцията',
    maxLength: SPECIES_CONTENT_LIMITS.imageAlt,
    strict,
  });

  return {
    title: normalizeText(section.title, {
      fieldName: 'Заглавието на секцията',
      maxLength: SPECIES_CONTENT_LIMITS.sectionTitle,
      strict,
    }),
    paragraphs: normalizeTextArray(section.paragraphs, {
      fieldName: 'Параграфите в секцията',
      itemFieldName: 'Параграфът',
      maxItems: SPECIES_CONTENT_LIMITS.paragraphsPerSection,
      maxItemLength: SPECIES_CONTENT_LIMITS.paragraph,
      strict,
    }),
    items: normalizeTextArray(section.items, {
      fieldName: 'Елементите в секцията',
      itemFieldName: 'Елементът от списъка',
      maxItems: SPECIES_CONTENT_LIMITS.itemsPerSection,
      maxItemLength: SPECIES_CONTENT_LIMITS.item,
      strict,
    }),
    imageUrl,
    imageAlt: assertImageAltText(imageAlt, imageUrl, {
      fieldName: 'Alt текстът на снимката в секцията',
      strict,
    }),
    imagePosition: normalizeImagePosition(section.imagePosition, strict),
    order: normalizeOrder(section.order, index, strict),
    isVisible: normalizeBoolean(section.isVisible, {
      defaultValue: true,
      fieldName: 'Видимостта на секцията',
      strict,
    }),
    centered: normalizeBoolean(section.centered, {
      defaultValue: false,
      fieldName: 'Центрирането на секцията',
      strict,
    }),
  };
}

function normalizeSections(value, { strict = false } = {}) {
  if (!Array.isArray(value)) {
    if (strict) {
      throw createHttpError(400, 'Секциите трябва да бъдат списък.');
    }

    return [];
  }

  if (strict && value.length > SPECIES_CONTENT_LIMITS.sections) {
    throw createHttpError(
      400,
      `Съдържанието може да има най-много ${SPECIES_CONTENT_LIMITS.sections} секции.`
    );
  }

  return value
    .slice(0, SPECIES_CONTENT_LIMITS.sections)
    .map((section, index) => normalizeSection(section, index, strict))
    .filter(Boolean);
}

export function createEmptySpeciesContentFields() {
  return {
    displayName: '',
    title: '',
    subtitle: '',
    cardImageUrl: '',
    cardImageAlt: '',
    heroImageUrl: '',
    introduction: '',
    issues: [],
    sections: [],
  };
}

export function mergeSpeciesContentFields(currentContent, patch) {
  const mergedContent = {
    ...createEmptySpeciesContentFields(),
    ...currentContent,
  };

  SPECIES_CONTENT_EDITABLE_FIELDS.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(patch, fieldName)) {
      mergedContent[fieldName] = patch[fieldName];
    }
  });

  return mergedContent;
}

export function normalizeSpeciesContentFields(payload = {}, { strict = false } = {}) {
  if (!isPlainObject(payload)) {
    if (strict) {
      throw createHttpError(400, 'Съдържанието за вида трябва да бъде JSON обект.');
    }

    payload = {};
  }

  const cardImageUrl = normalizeImageUrl(payload.cardImageUrl, {
    fieldName: 'Пътят до снимката на картата',
    strict,
  });
  const cardImageAlt = normalizeText(payload.cardImageAlt, {
    fieldName: 'Alt текстът на снимката на картата',
    maxLength: SPECIES_CONTENT_LIMITS.imageAlt,
    strict,
  });

  return {
    displayName: normalizeText(payload.displayName, {
      fieldName: 'Името на вида',
      maxLength: SPECIES_CONTENT_LIMITS.displayName,
      strict,
    }),
    title: normalizeText(payload.title, {
      fieldName: 'Заглавието',
      maxLength: SPECIES_CONTENT_LIMITS.title,
      strict,
    }),
    subtitle: normalizeText(payload.subtitle, {
      fieldName: 'Подзаглавието',
      maxLength: SPECIES_CONTENT_LIMITS.subtitle,
      strict,
    }),
    cardImageUrl,
    cardImageAlt: assertImageAltText(cardImageAlt, cardImageUrl, {
      fieldName: 'Alt текстът на снимката на картата',
      strict,
    }),
    heroImageUrl: normalizeImageUrl(payload.heroImageUrl, {
      fieldName: 'Пътят до hero снимката',
      strict,
    }),
    introduction: normalizeText(payload.introduction, {
      fieldName: 'Въведението',
      maxLength: SPECIES_CONTENT_LIMITS.introduction,
      strict,
    }),
    issues: normalizeTextArray(payload.issues, {
      fieldName: 'Основните проблеми и акценти',
      itemFieldName: 'Проблемът или акцентът',
      maxItems: SPECIES_CONTENT_LIMITS.issues,
      maxItemLength: SPECIES_CONTENT_LIMITS.issue,
      strict,
    }),
    sections: normalizeSections(payload.sections, { strict }),
  };
}

export function assertSpeciesContentPublishable(content) {
  const requiredFields = [
    ['displayName', 'Името на вида'],
    ['title', 'Заглавието'],
    ['introduction', 'Въведението'],
    ['cardImageUrl', 'Снимката на картата'],
    ['cardImageAlt', 'Alt текстът на снимката на картата'],
  ];
  const missingField = requiredFields.find(([fieldName]) => !content[fieldName]);

  if (missingField) {
    throw createHttpError(400, `${missingField[1]} е задължително преди публикуване.`);
  }

  const hasVisibleContentSection = content.sections.some(
    (section) =>
      section.isVisible &&
      (section.title || section.paragraphs.length > 0 || section.items.length > 0)
  );

  if (!hasVisibleContentSection) {
    throw createHttpError(400, 'Преди публикуване е необходима поне една видима съдържателна секция.');
  }
}
