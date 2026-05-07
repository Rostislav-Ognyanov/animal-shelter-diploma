import { Link } from 'react-router-dom';

import {
  getRoleDescription,
  getRoleLabel,
  getRoleUiActions,
} from '../../auth/roleUi.js';

export function HeroSection({ hero, role, searchValue, onSearchChange, onSearchSubmit }) {
  const roleActions = getRoleUiActions(role);
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);

  return (
    <section id="home-top" className="hero">
      <div className="section-container hero-content">
        <p className="hero-eyebrow">{hero.eyebrow}</p>
        <span className="role-pill">Режим: {roleLabel}</span>
        <h1>{hero.title}</h1>
        <p>{hero.description}</p>
        <p className="hero-role-description">{roleDescription}</p>

        <form className="hero-search" onSubmit={onSearchSubmit}>
          <input
            type="search"
            value={searchValue}
            placeholder={hero.searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <button type="submit">{hero.searchButton}</button>
        </form>

        <div className="hero-role-actions">
          {roleActions.map((action) => (
            <Link
              key={`${action.to}-${action.label}`}
              className={action.variant === 'primary' ? 'hero-role-action-primary' : 'hero-role-action-secondary'}
              to={action.to}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
