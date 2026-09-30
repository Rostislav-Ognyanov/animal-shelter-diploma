import { Link } from 'react-router-dom';

import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
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
  const { legalContent, isLoading, errorMessage, reload } = useLegalContent(type);

  if (isLoading) {
    return (
      <PageLoadingState
        className="legal-page-shell"
        message="Зареждане на актуалното юридическо съдържание..."
      />
    );
  }

  if (errorMessage || !legalContent) {
    return (
      <PageErrorState
        className="legal-page-shell"
        message={errorMessage || 'Публикуваното юридическо съдържание не може да бъде заредено.'}
        onRetry={reload}
      />
    );
  }

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
        <h2>Имаш въпрос?</h2>
        <p>
          Свържи се с екипа на приюта, ако имаш нужда от уточнение относно тази информация.
        </p>
        <Link className="page-contact-link" to="/svurji-se-s-nas">
          Свържи се с нас
        </Link>
      </section>
    </main>
  );
}
