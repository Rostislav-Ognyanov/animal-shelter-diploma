import { Link } from 'react-router-dom';

export function HeroSection({ hero }) {
  return (
    <section id="home-top" className="hero">
      <div className="section-container hero-content">
        {hero.eyebrow ? <p className="hero-eyebrow">{hero.eyebrow}</p> : null}
        <h1>{hero.title}</h1>
        <p>{hero.description}</p>

        <Link className="about-page-contact-link home-help-link hero-about-link" to="/za-nas">
          За нас
        </Link>
      </div>
    </section>
  );
}
