import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

export function AboutSection({ about }) {
  return (
    <section className="about" id="about-section">
      <div className="section-container about-content">
        <div className="about-layout">
          <figure className="about-image-wrap">
            <img src={buildPublicAssetPath('images/page_images/hero2.jpg')} alt="Животно в грижа в приюта" />
          </figure>

          <div className="about-text">
            <h2>{about.title}</h2>
            <div className="about-copy">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {about.cta ? (
              <Link className="about-page-contact-link about-section-action" to={about.cta.to}>
                {about.cta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
