import 'dotenv/config';

import mongoose from 'mongoose';

import PageContent from '../models/PageContent.js';
import LegalContent from '../models/LegalContent.js';
import RescueStory from '../models/RescueStory.js';
import SiteSettings from '../models/SiteSettings.js';
import SpeciesContent from '../models/SpeciesContent.js';
import { connectToDatabase } from '../config/db.js';
import { DEFAULT_RESCUE_STORIES } from '../../client/src/pages/animals/rescueStoriesData.js';
import { DEFAULT_SPECIES_CONTENT } from '../../client/src/pages/animals/speciesContentData.js';
import { DEFAULT_PAGE_CONTENT } from '../../client/src/pages/page-content/pageContentDefaults.js';
import { DEFAULT_LEGAL_CONTENT } from '../../client/src/pages/legal/legalContentDefaults.js';
import { DEFAULT_SITE_SETTINGS } from '../modules/site-settings/siteSettings.service.js';

function toPublishedSpeciesSnapshot(speciesContent) {
  return {
    displayName: speciesContent.displayName,
    title: speciesContent.title,
    subtitle: speciesContent.subtitle,
    cardImageUrl: speciesContent.cardImageUrl,
    cardImageAlt: speciesContent.cardImageAlt,
    heroImageUrl: speciesContent.heroImageUrl,
    introduction: speciesContent.introduction,
    issues: speciesContent.issues,
    sections: speciesContent.sections,
  };
}

function toPublishedLegalSnapshot(legalContent) {
  return {
    title: legalContent.title,
    lastUpdatedLabel: legalContent.lastUpdatedLabel,
    intro: legalContent.intro,
    sections: legalContent.sections.map((section, index) => ({
      title: section.title,
      paragraphs: section.paragraphs ?? [],
      items: section.items ?? [],
      closing: section.closing ?? [],
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
      isVisible: section.isVisible !== false,
    })),
  };
}

async function seedPageContent() {
  await Promise.all(
    Object.entries(DEFAULT_PAGE_CONTENT).map(([pageKey, content]) =>
      PageContent.findOneAndUpdate(
        { pageKey },
        { $setOnInsert: { pageKey, content } },
        { upsert: true, runValidators: true }
      )
    )
  );
}

async function seedLegalContent() {
  const now = new Date();

  await Promise.all(
    Object.values(DEFAULT_LEGAL_CONTENT).map((legalContent) => {
      const snapshot = toPublishedLegalSnapshot(legalContent);

      return LegalContent.findOneAndUpdate(
        { legalKey: legalContent.legalKey },
        {
          $setOnInsert: {
            ...snapshot,
            legalKey: legalContent.legalKey,
            status: 'published',
            version: 1,
            publishedSnapshot: snapshot,
            publishedAt: now,
          },
        },
        { upsert: true, runValidators: true }
      );
    })
  );
}

async function seedSpeciesContent() {
  const now = new Date();

  await Promise.all(
    DEFAULT_SPECIES_CONTENT.map((speciesContent) =>
      SpeciesContent.findOneAndUpdate(
        { species: speciesContent.species },
        {
          $setOnInsert: {
            ...toPublishedSpeciesSnapshot(speciesContent),
            species: speciesContent.species,
            isPublished: true,
            publishedSnapshot: toPublishedSpeciesSnapshot(speciesContent),
            publishedAt: now,
          },
        },
        { upsert: true, runValidators: true }
      )
    )
  );
}

async function seedRescueStories() {
  const now = new Date();

  await Promise.all(
    DEFAULT_RESCUE_STORIES.map((story) =>
      RescueStory.findOneAndUpdate(
        { slug: story.slug },
        {
          $setOnInsert: {
            ...story,
            publishedAt: story.isPublished ? now : null,
          },
        },
        { upsert: true, runValidators: true }
      )
    )
  );
}

async function seedSiteSettings() {
  await SiteSettings.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: DEFAULT_SITE_SETTINGS },
    { upsert: true, runValidators: true }
  );
}

async function seedContent() {
  await connectToDatabase();
  await seedSiteSettings();
  await seedPageContent();
  await seedLegalContent();
  await seedSpeciesContent();
  await seedRescueStories();
  console.log('Content seed completed.');
}

seedContent()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
