import {
  LEGAL_CONTENT_EDITABLE_FIELDS,
  LEGAL_CONTENT_LIMITS,
  LEGAL_CONTENT_SECTION_FIELDS,
} from '../../../shared/domain/legalContentConstants.js';
import { createHttpError } from '../../utils/httpError.js';
import { isPlainObject } from '../../utils/object.js';
import { assertAllowedFields } from '../../utils/requestValidation.js';

function normalizeText(value, { fieldName, maxLength }) {
  if (typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} трябва да бъде текст.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw createHttpError(400, `${fieldName} не може да надвишава ${maxLength} символа.`);
  }

  return normalizedValue;
}

function normalizeTextList(value, { fieldName, itemFieldName, maxItems, maxItemLength }) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, `${fieldName} трябва да бъде списък.`);
  }

  if (value.length > maxItems) {
    throw createHttpError(400, `${fieldName} може да съдържа най-много ${maxItems} елемента.`);
  }

  return value.map((item) => {
    const normalizedItem = normalizeText(item, {
      fieldName: itemFieldName,
      maxLength: maxItemLength,
    });

    if (!normalizedItem) {
      throw createHttpError(400, `${fieldName} не може да съдържа празни елементи.`);
    }

    return normalizedItem;
  });
}

function normalizeOrder(value, index) {
  if (value === undefined) {
    return index;
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw createHttpError(400, 'Редът на секцията трябва да бъде неотрицателно цяло число.');
  }

  return value;
}

function normalizeVisibility(value) {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== 'boolean') {
    throw createHttpError(400, 'Видимостта на секцията трябва да бъде true или false.');
  }

  return value;
}

function normalizeSection(section, index) {
  if (!isPlainObject(section)) {
    throw createHttpError(400, 'Всяка юридическа секция трябва да бъде JSON обект.');
  }

  assertAllowedFields(
    section,
    LEGAL_CONTENT_SECTION_FIELDS,
    'Юридическата секция съдържа неподдържани полета.'
  );

  return {
    title: normalizeText(section.title === undefined ? '' : section.title, {
      fieldName: 'Заглавието на секцията',
      maxLength: LEGAL_CONTENT_LIMITS.sectionTitle,
    }),
    paragraphs: normalizeTextList(section.paragraphs === undefined ? [] : section.paragraphs, {
      fieldName: 'Параграфите в секцията',
      itemFieldName: 'Параграфът',
      maxItems: LEGAL_CONTENT_LIMITS.paragraphsPerSection,
      maxItemLength: LEGAL_CONTENT_LIMITS.paragraph,
    }),
    items: normalizeTextList(section.items === undefined ? [] : section.items, {
      fieldName: 'Елементите в секцията',
      itemFieldName: 'Елементът от списъка',
      maxItems: LEGAL_CONTENT_LIMITS.itemsPerSection,
      maxItemLength: LEGAL_CONTENT_LIMITS.item,
    }),
    closing: normalizeTextList(section.closing === undefined ? [] : section.closing, {
      fieldName: 'Заключителните параграфи в секцията',
      itemFieldName: 'Заключителният параграф',
      maxItems: LEGAL_CONTENT_LIMITS.closingParagraphsPerSection,
      maxItemLength: LEGAL_CONTENT_LIMITS.paragraph,
    }),
    order: normalizeOrder(section.order, index),
    isVisible: normalizeVisibility(section.isVisible),
  };
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, 'Секциите трябва да бъдат списък.');
  }

  if (value.length > LEGAL_CONTENT_LIMITS.sections) {
    throw createHttpError(
      400,
      `Юридическото съдържание може да има най-много ${LEGAL_CONTENT_LIMITS.sections} секции.`
    );
  }

  return value
    .map(normalizeSection)
    .sort((firstSection, secondSection) => firstSection.order - secondSection.order);
}

export function createEmptyLegalContentFields() {
  return {
    title: '',
    lastUpdatedLabel: '',
    intro: [],
    sections: [],
  };
}

export function mergeLegalContentFields(currentContent, patch) {
  const mergedContent = {
    ...createEmptyLegalContentFields(),
    ...currentContent,
  };

  LEGAL_CONTENT_EDITABLE_FIELDS.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(patch, fieldName)) {
      mergedContent[fieldName] = patch[fieldName];
    }
  });

  return mergedContent;
}

export function normalizeLegalContentFields(content = {}) {
  return {
    title: normalizeText(content.title === undefined ? '' : content.title, {
      fieldName: 'Заглавието',
      maxLength: LEGAL_CONTENT_LIMITS.title,
    }),
    lastUpdatedLabel: normalizeText(
      content.lastUpdatedLabel === undefined ? '' : content.lastUpdatedLabel,
      {
        fieldName: 'Етикетът за последна актуализация',
        maxLength: LEGAL_CONTENT_LIMITS.lastUpdatedLabel,
      }
    ),
    intro: normalizeTextList(content.intro === undefined ? [] : content.intro, {
      fieldName: 'Въвеждащите параграфи',
      itemFieldName: 'Въвеждащият параграф',
      maxItems: LEGAL_CONTENT_LIMITS.introParagraphs,
      maxItemLength: LEGAL_CONTENT_LIMITS.introParagraph,
    }),
    sections: normalizeSections(content.sections === undefined ? [] : content.sections),
  };
}

export function assertLegalContentPublishable(content) {
  if (!content.title) {
    throw createHttpError(400, 'Заглавието е задължително преди публикуване.');
  }

  if (content.intro.length === 0) {
    throw createHttpError(400, 'Преди публикуване е необходим поне един въвеждащ параграф.');
  }

  const hasVisibleContentSection = content.sections.some(
    (section) =>
      section.isVisible &&
      Boolean(section.title) &&
      (section.paragraphs.length > 0 || section.items.length > 0 || section.closing.length > 0)
  );

  if (!hasVisibleContentSection) {
    throw createHttpError(400, 'Преди публикуване е необходима поне една видима непразна секция.');
  }
}

export function areLegalSnapshotsEqual(firstSnapshot, secondSnapshot) {
  if (!firstSnapshot || !secondSnapshot) {
    return false;
  }

  return JSON.stringify(normalizeLegalContentFields(firstSnapshot)) ===
    JSON.stringify(normalizeLegalContentFields(secondSnapshot));
}
