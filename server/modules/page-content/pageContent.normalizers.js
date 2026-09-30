import { isAllowedPageContentCtaTarget } from '../../../shared/content-defaults/pageContentCtaTargets.js';
import {
  PAGE_CONTENT_CONTACT_TYPE_KEYS,
  PAGE_CONTENT_IMAGE_POSITION_VALUES,
  PAGE_CONTENT_LIMITS,
} from '../../../shared/domain/pageContentConstants.js';
import { createHttpError } from '../../utils/httpError.js';
import { isPlainObject } from '../../utils/object.js';

const MAX_SHORT_TEXT_LENGTH = PAGE_CONTENT_LIMITS.shortText;
const MAX_MEDIUM_TEXT_LENGTH = PAGE_CONTENT_LIMITS.mediumText;
const MAX_LONG_TEXT_LENGTH = PAGE_CONTENT_LIMITS.longText;
const MAX_URL_LENGTH = PAGE_CONTENT_LIMITS.url;
const MAX_BLOCKS = PAGE_CONTENT_LIMITS.blocks;
const MAX_CARDS = PAGE_CONTENT_LIMITS.cards;

const IMAGE_POSITIONS = new Set(PAGE_CONTENT_IMAGE_POSITION_VALUES);

function normalizePlainObject(value, fieldName, strict) {
  if (value == null) {
    return {};
  }

  if (isPlainObject(value)) {
    return value;
  }

  if (strict) {
    throw createHttpError(400, `${fieldName} трябва да бъде обект.`);
  }

  return {};
}

function assertLength(value, maxLength, fieldName, strict) {
  if (value.length <= maxLength) {
    return value;
  }

  if (strict) {
    throw createHttpError(400, `${fieldName} е твърде дълго поле.`);
  }

  return value.slice(0, maxLength);
}

function normalizeText(value, { maxLength = MAX_MEDIUM_TEXT_LENGTH, fieldName = 'Текст', strict = false } = {}) {
  const normalizedValue = String(value ?? '').trim();
  return assertLength(normalizedValue, maxLength, fieldName, strict);
}

function normalizeArray(value, maxItems, { fieldName = 'Списъкът', strict = false } = {}) {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    if (strict && value.length > maxItems) {
      throw createHttpError(400, `${fieldName} може да съдържа най-много ${maxItems} елемента.`);
    }

    return value.slice(0, maxItems);
  }

  if (strict) {
    throw createHttpError(400, `${fieldName} трябва да бъде списък.`);
  }

  return [];
}

function normalizeTextArray(
  value,
  { maxItems = MAX_BLOCKS, maxLength = MAX_LONG_TEXT_LENGTH, fieldName = 'Списъкът', strict = false } = {}
) {
  return normalizeArray(value, maxItems, { fieldName, strict })
    .map((item) => normalizeText(item, { maxLength, strict }))
    .filter(Boolean);
}

function normalizeUrl(
  value,
  { fieldName = 'URL', allowEmpty = true, allowPublicPath = false, strict = false } = {}
) {
  const normalizedValue = normalizeText(value, { maxLength: MAX_URL_LENGTH, fieldName, strict });

  if (!normalizedValue && allowEmpty) {
    return '';
  }

  const isAllowedUrl =
    normalizedValue.startsWith('/') ||
    (allowPublicPath && normalizedValue.startsWith('images/')) ||
    /^https?:\/\//i.test(normalizedValue);

  if (!isAllowedUrl && strict) {
    throw createHttpError(400, `${fieldName} трябва да бъде вътрешен или публичен път, или http(s) URL.`);
  }

  return isAllowedUrl ? normalizedValue : '';
}

function normalizeImagePath(value, strict) {
  return normalizeUrl(value, { fieldName: 'Пътят до снимката', allowPublicPath: true, strict });
}

function normalizeLegacyCtaPath(value) {
  return value === '/search' ? '/animals' : value;
}

function normalizeCtaPath(value, strict, pageKey) {
  const normalizedValue = normalizeLegacyCtaPath(normalizeText(value, {
    maxLength: MAX_URL_LENGTH,
    fieldName: 'Дестинацията на бутона',
    strict,
  }));

  if (!normalizedValue) {
    return '';
  }

  if (isAllowedPageContentCtaTarget(pageKey, normalizedValue)) {
    return normalizedValue;
  }

  if (strict) {
    throw createHttpError(
      400,
      'Дестинацията на бутона трябва да бъде избрана от позволените публични страници или секции.'
    );
  }

  return '';
}

function assertCompleteCta(ctaLabel, ctaTo, strict) {
  if (!strict) {
    return;
  }

  if (Boolean(ctaLabel) !== Boolean(ctaTo)) {
    throw createHttpError(400, 'За бутона трябва да бъдат попълнени едновременно текст и дестинация.');
  }
}

function normalizeImageAlt(value, imagePath, strict) {
  const imageAlt = normalizeText(value, {
    maxLength: MAX_SHORT_TEXT_LENGTH,
    fieldName: 'Alt текстът',
    strict,
  });

  if (imagePath && !imageAlt && strict) {
    throw createHttpError(400, 'Alt текстът е задължителен, когато има снимка.');
  }

  return imageAlt;
}

function normalizeImagePosition(value, strict) {
  if (value == null || value === '') {
    return 'right';
  }

  if (IMAGE_POSITIONS.has(value)) {
    return value;
  }

  if (strict) {
    throw createHttpError(400, 'Позицията на снимката трябва да бъде "left" или "right".');
  }

  return 'right';
}

function normalizeVisibility(value, strict) {
  if (value === undefined) {
    return true;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (strict) {
    throw createHttpError(400, 'Видимостта на блока трябва да бъде boolean стойност.');
  }

  return value !== false;
}

function normalizeSectionCount(value, strict) {
  if (value == null || value === '') {
    return 3;
  }

  if (strict) {
    if (
      !Number.isInteger(value) ||
      value < PAGE_CONTENT_LIMITS.sectionCountMin ||
      value > PAGE_CONTENT_LIMITS.sectionCountMax
    ) {
      throw createHttpError(
        400,
        `Броят елементи трябва да бъде цяло число между ${PAGE_CONTENT_LIMITS.sectionCountMin} и ${PAGE_CONTENT_LIMITS.sectionCountMax}.`
      );
    }

    return value;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 3;
  }

  return Math.max(
    PAGE_CONTENT_LIMITS.sectionCountMin,
    Math.min(PAGE_CONTENT_LIMITS.sectionCountMax, Math.floor(numericValue))
  );
}

function normalizeHero(value = {}, { includeDescription = false, includeCta = false, strict = false, ctaPageKey = '' } = {}) {
  const hero = normalizePlainObject(value, 'Първият блок', strict);
  const normalizedHero = {
    title: normalizeText(hero.title, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавието',
      strict,
    }),
    imagePath: normalizeImagePath(hero.imagePath, strict),
  };

  if (includeDescription) {
    normalizedHero.description = normalizeText(hero.description, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Подзаглавието',
      strict,
    });
  }

  if (includeCta) {
    normalizedHero.ctaLabel = normalizeText(hero.ctaLabel, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Текстът на бутона',
      strict,
    });
    normalizedHero.ctaTo = normalizeCtaPath(hero.ctaTo, strict, ctaPageKey);
    assertCompleteCta(normalizedHero.ctaLabel, normalizedHero.ctaTo, strict);
  }

  return normalizedHero;
}

function normalizeCta(value, normalizedItem, strict, ctaPageKey) {
  normalizedItem.ctaLabel = normalizeText(value?.ctaLabel, {
    maxLength: MAX_SHORT_TEXT_LENGTH,
    fieldName: 'Текстът на бутона',
    strict,
  });
  normalizedItem.ctaTo = normalizeCtaPath(value?.ctaTo, strict, ctaPageKey);
  assertCompleteCta(normalizedItem.ctaLabel, normalizedItem.ctaTo, strict);
  return normalizedItem;
}

function normalizeContentBlock(
  block = {},
  {
    index = 0,
    bodyField = 'text',
    bodyMaxLength = MAX_LONG_TEXT_LENGTH,
    includeImage = true,
    includeImagePosition = true,
    includeCta = true,
    useParagraphs = false,
    strict = false,
    ctaPageKey = '',
  } = {}
) {
  const source = normalizePlainObject(block, 'Блокът със съдържание', strict);
  const normalizedBlock = {
    id: normalizeText(source.id || `block-${index + 1}`, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'ID на блока',
      strict,
    }),
    isVisible: normalizeVisibility(source.isVisible, strict),
    title: normalizeText(source.title, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавието на блока',
      strict,
    }),
  };

  if (useParagraphs) {
    normalizedBlock.paragraphs = normalizeTextArray(source.paragraphs, {
      maxItems: MAX_BLOCKS,
      maxLength: bodyMaxLength,
      strict,
    });
  } else {
    normalizedBlock[bodyField] = normalizeText(source[bodyField], {
      maxLength: bodyMaxLength,
      fieldName: 'Текстът на блока',
      strict,
    });
  }

  if (includeImage) {
    normalizedBlock.imagePath = normalizeImagePath(source.imagePath, strict);
    normalizedBlock.imageAlt = normalizeImageAlt(source.imageAlt, normalizedBlock.imagePath, strict);

    if (includeImagePosition) {
      normalizedBlock.imagePosition = normalizeImagePosition(source.imagePosition, strict);
    }
  }

  if (includeCta) {
    normalizeCta(source, normalizedBlock, strict, ctaPageKey);
  }

  return normalizedBlock;
}

function normalizeBlocks(value, options) {
  const strict = options?.strict ?? false;
  const fieldName = options?.fieldName ?? 'Списъкът с блокове';
  const normalizedBlocks = normalizeArray(value, options?.maxItems ?? MAX_BLOCKS, {
    fieldName,
    strict,
  }).map((block, index) =>
    normalizeContentBlock(block, { ...options, index })
  );

  if (strict) {
    const blockIds = new Set();

    normalizedBlocks.forEach((block) => {
      if (blockIds.has(block.id)) {
        throw createHttpError(400, `${fieldName} съдържа повторено ID: "${block.id}".`);
      }

      blockIds.add(block.id);
    });
  }

  return normalizedBlocks;
}

function normalizeSectionMeta(value = {}, { includeDescription = true, includeCount = false, strict = false, ctaPageKey = '' } = {}) {
  const source = normalizePlainObject(value, 'Секцията', strict);
  const normalizedSection = {
    title: normalizeText(source.title, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавието на секцията',
      strict,
    }),
  };

  if (includeDescription) {
    normalizedSection.description = normalizeText(source.description, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Описанието на секцията',
      strict,
    });
  }

  normalizedSection.ctaLabel = normalizeText(source.ctaLabel, {
    maxLength: MAX_SHORT_TEXT_LENGTH,
    fieldName: 'Текстът на бутона',
    strict,
  });
  normalizedSection.ctaTo = normalizeCtaPath(source.ctaTo, strict, ctaPageKey);
  assertCompleteCta(normalizedSection.ctaLabel, normalizedSection.ctaTo, strict);

  if (includeCount) {
    normalizedSection.count = normalizeSectionCount(source.count, strict);
  }

  return normalizedSection;
}

function normalizeHomePageContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'home';

  return {
    hero: normalizeHero(source.hero, {
      includeDescription: true,
      includeCta: true,
      strict,
      ctaPageKey,
    }),
    about: normalizeContentBlock(source.about, {
      useParagraphs: true,
      includeImage: true,
      includeImagePosition: false,
      includeCta: true,
      strict,
      ctaPageKey,
    }),
    helpCards: normalizeBlocks(source.helpCards, {
      bodyField: 'description',
      includeImage: false,
      includeCta: true,
      maxItems: MAX_CARDS,
      fieldName: 'Картите за помощ',
      strict,
      ctaPageKey,
    }),
    rescueStoriesSection: normalizeSectionMeta(source.rescueStoriesSection, {
      includeCount: true,
      strict,
      ctaPageKey,
    }),
  };
}

function normalizeAboutPageContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'about';

  return {
    hero: normalizeHero(source.hero, { strict }),
    blocks: normalizeBlocks(source.blocks, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: true,
      includeCta: true,
      fieldName: 'Блоковете',
      strict,
      ctaPageKey,
    }),
    toggles: normalizeBlocks(source.toggles, {
      bodyField: 'text',
      includeImage: false,
      includeCta: false,
      maxItems: MAX_CARDS,
      fieldName: 'Блоковете за мисия и цел',
      strict,
    }),
  };
}

function normalizeSupportLikeContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'support';

  return {
    hero: normalizeHero(source.hero, { strict }),
    infoBlocks: normalizeBlocks(source.infoBlocks, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: true,
      includeCta: true,
      fieldName: 'Информационните блокове',
      strict,
      ctaPageKey,
    }),
    actionCards: normalizeBlocks(source.actionCards, {
      bodyField: 'description',
      includeImage: true,
      includeImagePosition: false,
      includeCta: true,
      maxItems: MAX_CARDS,
      fieldName: 'Картите с действия',
      strict,
      ctaPageKey,
    }),
  };
}

function normalizeAnimalsOverviewContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'animals-overview';

  return {
    hero: normalizeHero(source.hero, { strict }),
    infoBlocks: normalizeBlocks(source.infoBlocks, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: true,
      includeCta: true,
      fieldName: 'Информационните блокове',
      strict,
      ctaPageKey,
    }),
    speciesSection: normalizeSectionMeta(source.speciesSection, {
      includeCount: true,
      strict,
      ctaPageKey,
    }),
    storiesSection: normalizeSectionMeta(source.storiesSection, {
      includeCount: true,
      strict,
      ctaPageKey,
    }),
  };
}

function normalizeAnimalsInfoContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const intro = normalizePlainObject(source.intro, 'Въвеждащият блок', strict);

  return {
    hero: normalizeHero(source.hero, { strict }),
    intro: {
      title: normalizeText(intro.title, {
        maxLength: MAX_SHORT_TEXT_LENGTH,
        fieldName: 'Заглавието',
        strict,
      }),
      description: normalizeText(intro.description, {
        maxLength: MAX_LONG_TEXT_LENGTH,
        fieldName: 'Описанието',
        strict,
      }),
      note: normalizeText(intro.note, {
        maxLength: MAX_MEDIUM_TEXT_LENGTH,
        fieldName: 'Бележката',
        strict,
      }),
    },
  };
}

function normalizeRescueStoriesContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const listSection = normalizePlainObject(source.listSection, 'Секцията със списъка', strict);
  const ctaPageKey = 'rescue-stories';
  const normalizedListSection = {
    title: normalizeText(listSection.title, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавието',
      strict,
    }),
    emptyState: normalizeText(listSection.emptyState, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Празното състояние',
      strict,
    }),
    ctaTitle: normalizeText(listSection.ctaTitle, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавие над бутонато',
      strict,
    }),
    ctaLabel: normalizeText(listSection.ctaLabel, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Текстът на бутона',
      strict,
    }),
    ctaTo: normalizeCtaPath(listSection.ctaTo, strict, ctaPageKey),
  };

  assertCompleteCta(normalizedListSection.ctaLabel, normalizedListSection.ctaTo, strict);

  return {
    hero: normalizeHero(source.hero, { strict }),
    introBlock: normalizeContentBlock(source.introBlock, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: true,
      includeCta: false,
      strict,
    }),
    listSection: normalizedListSection,
  };
}

function normalizeVolunteeringContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'volunteering';

  return {
    hero: normalizeHero(source.hero, { strict }),
    reasonBlock: normalizeContentBlock(source.reasonBlock, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: false,
      includeCta: true,
      strict,
      ctaPageKey,
    }),
    formIntro: normalizeText(source.formIntro, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Въвеждащият текст',
      strict,
    }),
    instructions: normalizeText(source.instructions, {
      maxLength: MAX_LONG_TEXT_LENGTH,
      fieldName: 'Инструкциите',
      strict,
    }),
  };
}

function normalizeDonationsContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const ctaPageKey = 'donations';

  return {
    hero: normalizeHero(source.hero, { strict }),
    reasonBlock: normalizeContentBlock(source.reasonBlock, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: false,
      includeCta: true,
      strict,
      ctaPageKey,
    }),
    useOfDonations: normalizeText(source.useOfDonations, {
      maxLength: MAX_LONG_TEXT_LENGTH,
      fieldName: 'Описанието за даренията',
      strict,
    }),
    campaignNote: normalizeText(source.campaignNote, {
      maxLength: MAX_LONG_TEXT_LENGTH,
      fieldName: 'Кампанията',
      strict,
    }),
  };
}
function normalizeContactContent(content, strict) {
  const source = normalizePlainObject(content, 'Съдържанието на страницата', strict);
  const contactTypeLabels = normalizePlainObject(source.contactTypeLabels, 'Етикетите за типове запитвания', strict);

  return {
    hero: normalizeHero(source.hero, { strict }),
    infoBlocks: normalizeBlocks(source.infoBlocks, {
      bodyField: 'text',
      includeImage: true,
      includeImagePosition: true,
      includeCta: false,
      strict,
    }),
    typeSelectorIntro: normalizeText(source.typeSelectorIntro, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Въвеждащият текст',
      strict,
    }),
    typeSelectorTitle: normalizeText(source.typeSelectorTitle, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
      fieldName: 'Заглавието',
      strict,
    }),
    formIntro: normalizeText(source.formIntro, {
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
      fieldName: 'Въвеждащият текст на формата',
      strict,
    }),
    contactTypeLabels: PAGE_CONTENT_CONTACT_TYPE_KEYS.reduce((result, contactTypeKey) => {
      const contactType = isPlainObject(contactTypeLabels[contactTypeKey])
        ? contactTypeLabels[contactTypeKey]
        : normalizePlainObject(contactTypeLabels[contactTypeKey], 'Етикетът за тип запитване', strict);

      result[contactTypeKey] = {
        label: normalizeText(contactType.label, {
          maxLength: MAX_SHORT_TEXT_LENGTH,
          fieldName: 'Етикетът',
          strict,
        }),
        description: normalizeText(contactType.description, {
          maxLength: MAX_MEDIUM_TEXT_LENGTH,
          fieldName: 'Описанието',
          strict,
        }),
      };

      return result;
    }, {}),
  };
}

const PAGE_CONTENT_NORMALIZERS = {
  home: normalizeHomePageContent,
  about: normalizeAboutPageContent,
  support: normalizeSupportLikeContent,
  'animals-overview': normalizeAnimalsOverviewContent,
  'animals-info': normalizeAnimalsInfoContent,
  'rescue-stories': normalizeRescueStoriesContent,
  volunteering: normalizeVolunteeringContent,
  donations: normalizeDonationsContent,
  contact: normalizeContactContent,
};

// Writes use strict normalization to reject malformed CMS content.
// Reads use tolerant normalization so stored Mixed content cannot break public pages.
export function normalizePageContentByKey(pageKey, content, { strict = false } = {}) {
  const normalizer = PAGE_CONTENT_NORMALIZERS[pageKey];

  if (!normalizer) {
    return isPlainObject(content) ? content : {};
  }

  return normalizer(content, strict);
}
