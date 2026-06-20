import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { getMainNavigation } from '../../navigation/appNavigation.js';

function renderFooterLink(item) {
  const target = item.href ?? item.to;

  if (target?.startsWith('/') && !target.startsWith('/#')) {
    return <Link to={target}>{item.label}</Link>;
  }

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
            <img src={buildPublicAssetPath('images/logo.jpg')} alt="Лого на приюта" />
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
            <span key={link.href ?? link.to ?? link.label}>{renderFooterLink(link)}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
