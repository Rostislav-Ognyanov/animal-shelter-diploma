import { HandCoins, HeartHandshake } from 'lucide-react';

import { PageContentLink } from '../../page-content/PageContentLink.jsx';
import { getVisibleContentItems } from '../../page-content/pageContentUtils.js';

function getIcon(cardId) {
  const Icon = cardId === 'donation' ? HandCoins : HeartHandshake;

  return (
    <Icon
      className="home-help-icon"
      size={76}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}

export function HelpSection({ cards = [] }) {
  const visibleCards = getVisibleContentItems(cards);

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <section className="home-help-section" aria-label="Начини за помощ">
      <div className="section-container">
        <div className="home-help-grid">
          {visibleCards.map((card) => (
            <article
              key={card.id ?? card.title}
              className={`home-help-panel home-help-panel-${card.id === 'donation' ? 'donation' : 'volunteer'}`}
            >
              {getIcon(card.id)}
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <PageContentLink className="page-contact-link home-help-link" to={card.ctaTo}>
                {card.ctaLabel}
              </PageContentLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
