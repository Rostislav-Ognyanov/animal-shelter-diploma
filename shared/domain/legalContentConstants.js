export const LEGAL_CONTENT_KEY_VALUES = Object.freeze(['privacy', 'terms']);

export const LEGAL_CONTENT_LABELS = Object.freeze({
  privacy: 'Политика за поверителност',
  terms: 'Общи условия',
});

export const LEGAL_CONTENT_STATUS_VALUES = Object.freeze(['draft', 'published']);

export const LEGAL_CONTENT_LIMITS = Object.freeze({
  title: 180,
  lastUpdatedLabel: 120,
  introParagraph: 3000,
  introParagraphs: 12,
  sections: 20,
  sectionTitle: 200,
  paragraph: 3000,
  paragraphsPerSection: 20,
  item: 1500,
  itemsPerSection: 30,
  closingParagraphsPerSection: 10,
});

export const LEGAL_CONTENT_EDITABLE_FIELDS = Object.freeze([
  'title',
  'lastUpdatedLabel',
  'intro',
  'sections',
]);

export const LEGAL_CONTENT_SECTION_FIELDS = Object.freeze([
  'title',
  'paragraphs',
  'items',
  'closing',
  'order',
  'isVisible',
]);
