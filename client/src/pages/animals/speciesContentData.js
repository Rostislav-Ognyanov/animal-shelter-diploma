import { SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';
import { SPECIES_DETAILED_CONTENT } from './speciesDetailedContent.js';
import { SPECIES_FACTS } from './speciesFactsData.js';

function normalizeDetailedSection(section, index) {
  return {
    title: section.title,
    paragraphs: section.paragraphs ?? [],
    items: section.items ?? [],
    imageUrl: section.imageUrl ?? section.imageSrc ?? '',
    imageAlt: section.imageAlt ?? '',
    imagePosition: index % 2 === 1 ? 'left' : 'right',
    order: index,
    isVisible: section.isVisible !== false,
    centered: Boolean(section.centered),
  };
}

function normalizeFactsChapter(chapter, index) {
  return {
    title: chapter.title,
    paragraphs: chapter.paragraphs ?? [],
    items: chapter.items ?? [],
    imageUrl: '',
    imageAlt: '',
    imagePosition: index % 2 === 1 ? 'left' : 'right',
    order: index,
    isVisible: true,
    centered: false,
  };
}

export const DEFAULT_SPECIES_CONTENT = SPECIES_SHOWCASE_ITEMS.map((speciesItem) => {
  const species = speciesItem.value;
  const facts = SPECIES_FACTS[species];
  const detailedContent = SPECIES_DETAILED_CONTENT[species];
  const sections = detailedContent?.sections?.length
    ? detailedContent.sections.map(normalizeDetailedSection)
    : (facts?.chapters ?? []).map(normalizeFactsChapter);

  return {
    species,
    displayName: speciesItem.tabLabel,
    title: facts?.title ?? speciesItem.tabLabel,
    subtitle: facts?.subtitle ?? '',
    cardImageUrl: speciesItem.imageSrc,
    cardImageAlt: speciesItem.imageAlt,
    heroImageUrl: detailedContent?.heroImageSrc ?? speciesItem.imageSrc,
    introduction: speciesItem.description ?? '',
    issues: speciesItem.issues ?? [],
    sections,
    isPublished: true,
  };
});

export function getDefaultSpeciesContent(species) {
  return DEFAULT_SPECIES_CONTENT.find((item) => item.species === species) ?? null;
}

export function mergeSpeciesContentWithDefault(defaultContent, savedContent) {
  if (!savedContent) {
    return defaultContent;
  }

  return {
    ...defaultContent,
    ...savedContent,
    sections: savedContent.sections?.length ? savedContent.sections : defaultContent?.sections ?? [],
    issues: savedContent.issues?.length ? savedContent.issues : defaultContent?.issues ?? [],
  };
}
