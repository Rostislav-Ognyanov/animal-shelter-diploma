import { buildPublicAssetPath } from '../../../lib/publicAssetPath.js';
import { PageContentLink } from '../../page-content/PageContentLink.jsx';

function getParagraphs(about) {
  if (Array.isArray(about?.paragraphs)) {
    return about.paragraphs;
  }

  if (about?.text) {
    return [about.text];
  }

  return [];
}

export function AboutSection({ about }) {
  const paragraphs = getParagraphs(about);
  const imagePath = about?.imagePath;
  const ctaLabel = about?.cta?.label ?? about?.ctaLabel;
  const ctaTo = about?.cta?.to ?? about?.ctaTo;

  return (
    <section className="about" id="about-section">
      <div className="section-container about-content">
        <div className="about-layout">
          {imagePath ? (
            <figure className="about-image-wrap">
              <img src={buildPublicAssetPath(imagePath)} alt={about?.imageAlt ?? ''} />
            </figure>
          ) : null}

          <div className="about-text">
            <h2>{about?.title}</h2>
            <div className="about-copy">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <PageContentLink className="page-contact-link about-section-action" to={ctaTo}>
              {ctaLabel}
            </PageContentLink>
          </div>
        </div>
      </div>
    </section>
  );
}
