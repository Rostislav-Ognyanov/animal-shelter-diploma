import { Fragment } from 'react';

import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';

function SplitInfoBlock({ block }) {
  const paragraphs = splitContentText(block.text);
  const imageElement = block.imagePath ? (
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
      }`}
    >
      {block.imagePosition === 'left' ? imageElement : copyElement}
      {block.imagePosition === 'left' ? copyElement : imageElement}
    </div>
  );
}

export function SupportPage() {
  const { content, error, isLoading, reload } = usePageContent('support');
  const infoBlocks = getVisibleContentItems(content.infoBlocks ?? []);
  const actionCards = getVisibleContentItems(content.actionCards ?? []);

  if (isLoading) {
    return <PageLoadingState className="support-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="support-page-shell" message={error} onRetry={reload} />;
  }

  return (
    <main className="route-shell support-page-shell">
      <section className="support-page-hero" style={buildHeroBackgroundStyle(content.hero?.imagePath)}>
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about-page-story-block">
        {infoBlocks.map((block, index) => (
          <Fragment key={block.id ?? block.title}>
            {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
            <SplitInfoBlock block={block} />
          </Fragment>
        ))}

        {actionCards.map((option, index) => (
          <Fragment key={option.id ?? option.title}>
            {infoBlocks.length > 0 || index > 0 ? (
              <div className="about-page-story-divider" aria-hidden="true" />
            ) : null}
            <div className="about-page-split-inner about-page-story-row support-page-action-row">
              <article className="about-page-split-copy support-page-action-copy">
                <h2>{option.title}</h2>
                <p>{option.description}</p>
                <PageContentLink className="page-contact-link" to={option.ctaTo}>
                  {option.ctaLabel}
                </PageContentLink>
              </article>

              {option.imagePath ? (
                <figure className="about-page-split-image support-page-action-image">
                  <img src={buildPublicAssetPath(option.imagePath)} alt={option.imageAlt ?? ''} />
                </figure>
              ) : null}
            </div>
          </Fragment>
        ))}
      </section>
    </main>
  );
}
