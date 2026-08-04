import { Link } from 'react-router-dom';

import { useLegalContent } from './useLegalContent.js';

function LegalSection({ section }) {
  if (section.isVisible === false) {
    return null;
  }

  return (
    <section className="legal-section">
      <h2>{section.title}</h2>
      {(section.paragraphs ?? []).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.items?.length ? (
        <ul>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {(section.closing ?? []).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

export function LegalPage({ type }) {
  const { legalContent } = useLegalContent(type);

  return (
    <main className="route-shell legal-page-shell">
      <section className="legal-page-hero">
        <p>Последна актуализация: {legalContent.lastUpdatedLabel}</p>
        <h1>{legalContent.title}</h1>
      </section>

      <article className="legal-page-content">
        <div className="legal-intro">
          {(legalContent.intro ?? []).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {(legalContent.sections ?? []).map((section) => (
          <LegalSection key={section.title} section={section} />
        ))}
      </article>

      <section className="legal-contact-card">
        <h2>Имате въпрос?</h2>
        <p>
          Свържете се с екипа на приюта, ако имате нужда от уточнение относно тази информация.
        </p>
        <Link className="about-page-contact-link" to="/svurji-se-s-nas">
          Свържи се с нас
        </Link>
      </section>
    </main>
  );
}
