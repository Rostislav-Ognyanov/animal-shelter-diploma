import { Link } from 'react-router-dom';

import { getMainNavigation } from '../../navigation/appNavigation.js';

function renderFooterLink(item) {
  if (item.href || item.to?.startsWith('/#') || item.to?.startsWith('#')) {
    return <a href={item.href ?? item.to}>{item.label}</a>;
  }

  return <Link to={item.to}>{item.label}</Link>;
}

export function Footer({ footer, siteName }) {
  const footerNavigation = getMainNavigation();

  return (
    <footer id="site-footer">
      <div className="footer-container">
        <div className="footer-brand-block">
          <Link className="footer-brand" to="/">
            <img src="/images/logo.jpg" alt="Лого на приюта" />
            <span>{siteName}</span>
          </Link>
          <div className="footer-info">
            <p>{footer.copyright}</p>
            <p>{footer.secondary}</p>
          </div>
        </div>

        <div className="footer-spacer" aria-hidden="true" />

        <nav className="footer-nav" aria-label="Навигация във футъра">
          <ul>
            {footerNavigation.map((item) => (
              <li key={item.to ?? item.href ?? item.label}>{renderFooterLink(item)}</li>
            ))}
          </ul>
        </nav>

        <div className="footer-links">
          {footer.links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
