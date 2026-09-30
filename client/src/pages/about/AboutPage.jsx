import { Fragment, useState } from 'react';

import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';

function ContentBlock({ block }) {
  const paragraphs = splitContentText(block.text);
  const hasImage = Boolean(block.imagePath);
  const imageElement = hasImage ? (
    <figure className="about-page-split-image">
      <img src={buildPublicAssetPath(block.imagePath)} alt={block.imageAlt ?? ''} />
    </figure>
  ) : null;

  const copyElement = (
    <article className="about-page-split-copy">
      <h2>{block.title}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <PageContentLink className="page-contact-link" to={block.ctaTo}>
        {block.ctaLabel}
      </PageContentLink>
    </article>
  );

  return (
    <div
      className={`about-page-split-inner about-page-story-row ${
        block.imagePosition === 'left' ? 'about-page-story-row-reversed' : ''
      } ${hasImage ? '' : 'about-page-story-row-no-image'}`}
    >
      {block.imagePosition === 'left' ? imageElement : copyElement}
      {block.imagePosition === 'left' ? copyElement : imageElement}
    </div>
  );
}

export function AboutPage() {
  const { content, error, isLoading, reload } = usePageContent('about');
  const [openSections, setOpenSections] = useState({});
  const visibleBlocks = getVisibleContentItems(content.blocks ?? []);
  const visibleToggles = getVisibleContentItems(content.toggles ?? []);

  function toggleSection(sectionKey) {
    setOpenSections((currentValue) => ({
      ...currentValue,
      [sectionKey]: !currentValue[sectionKey],
    }));
  }

  if (isLoading) {
    return <PageLoadingState className="about-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="about-page-shell" message={error} onRetry={reload} />;
  }

  return (
    <main className="route-shell about-page-shell">
      <section className="about-page-hero" style={buildHeroBackgroundStyle(content.hero?.imagePath)}>
        <h1>{content.hero?.title}</h1>
      </section>

      {visibleBlocks.length > 0 ? (
        <section className="about-page-story-block">
          {visibleBlocks.map((block, index) => (
            <Fragment key={block.id ?? block.title}>
              {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
              <ContentBlock block={block} />
            </Fragment>
          ))}
        </section>
      ) : null}

      {visibleToggles.length > 0 ? (
        <section className="about-page-toggle-grid">
          {visibleToggles.map((section) => {
            const sectionKey = section.id ?? section.title;
            const isOpen = Boolean(openSections[sectionKey]);

            return (
              <article key={sectionKey} className={`about-page-toggle-card ${isOpen ? 'is-open' : ''}`}>
                <button type="button" onClick={() => toggleSection(sectionKey)} aria-expanded={isOpen}>
                  <span>{section.title}</span>
                  <strong>{isOpen ? '-' : '+'}</strong>
                </button>

                {isOpen ? <p>{section.text}</p> : null}
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
