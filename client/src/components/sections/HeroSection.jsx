import { PageContentLink } from '../../pages/page-content/PageContentLink.jsx';
import { buildHeroBackgroundStyle } from '../../pages/page-content/pageContentUtils.js';

export function HeroSection({ hero }) {
  const heroStyle = buildHeroBackgroundStyle(hero?.imagePath);
  const ctaLabel = hero?.cta?.label ?? hero?.ctaLabel;
  const ctaTo = hero?.cta?.to ?? hero?.ctaTo ?? '/za-nas';

  return (
    <section id="home-top" className="hero" style={heroStyle}>
      <div className="section-container hero-content">
        {hero?.eyebrow ? <p className="hero-eyebrow">{hero.eyebrow}</p> : null}
        <h1>{hero?.title}</h1>
        <p>{hero?.description}</p>

        {ctaLabel ? (
          <PageContentLink className="about-page-contact-link home-help-link hero-about-link" to={ctaTo}>
            {ctaLabel}
          </PageContentLink>
        ) : null}
      </div>
    </section>
  );
}
