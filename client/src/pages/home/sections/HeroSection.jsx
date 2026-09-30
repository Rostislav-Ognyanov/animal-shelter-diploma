import { PageContentLink } from '../../page-content/PageContentLink.jsx';
import { buildHeroBackgroundStyle } from '../../page-content/pageContentUtils.js';

export function HeroSection({ hero }) {
  const heroStyle = buildHeroBackgroundStyle(hero?.imagePath);
  const ctaLabel = hero?.cta?.label ?? hero?.ctaLabel;
  const ctaTo = hero?.cta?.to ?? hero?.ctaTo ?? '';

  return (
    <section id="home-top" className="hero" style={heroStyle}>
      <div className="section-container hero-content">
        {hero?.eyebrow ? <p className="hero-eyebrow">{hero.eyebrow}</p> : null}
        <h1>{hero?.title}</h1>
        <p>{hero?.description}</p>

        {ctaLabel ? (
          <PageContentLink className="page-contact-link home-help-link hero-about-link" to={ctaTo}>
            {ctaLabel}
          </PageContentLink>
        ) : null}
      </div>
    </section>
  );
}
