export const SPECIES_CONTENT_LIMITS = Object.freeze({
  displayName: 120,
  title: 180,
  subtitle: 500,
  introduction: 3000,
  issue: 1000,
  issues: 8,
  sections: 12,
  sectionTitle: 180,
  paragraph: 3000,
  paragraphsPerSection: 12,
  item: 1500,
  itemsPerSection: 20,
  imageUrl: 512,
  imageAlt: 300,
});

export const SPECIES_CONTENT_IMAGE_POSITION_VALUES = Object.freeze(['left', 'right']);

export const SPECIES_CONTENT_EDITABLE_FIELDS = Object.freeze([
  'displayName',
  'title',
  'subtitle',
  'cardImageUrl',
  'cardImageAlt',
  'heroImageUrl',
  'introduction',
  'issues',
  'sections',
]);
