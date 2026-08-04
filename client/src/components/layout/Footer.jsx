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
  const logoUrl = footer?.logoUrl ?? footer?.siteSettings?.logoUrl ?? 'images/logo.jpg';
  const contactInfo = footer?.contactInfo;
  const socialLinks = footer?.socialLinks ?? [];
  const footerLinks = footer?.links ?? [];

  return (
    <footer id="site-footer">
      <div className="footer-container">
        <div className="footer-brand-block">
          <Link className="footer-brand" to="/">
            <img src={buildPublicAssetPath(logoUrl)} alt="Лого на приюта" />
            <span>{siteName}</span>
          </Link>
          <div className="footer-info">
            <p>{footer.copyright}</p>
            <p>{footer.secondary}</p>
            {contactInfo?.phone ? <p>{contactInfo.phone}</p> : null}
            {contactInfo?.email ? <p>{contactInfo.email}</p> : null}
            {socialLinks.length ? (
              <div className="footer-social-links" aria-label="Социални профили">
                {socialLinks.map((link) => (
                  <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
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
          {footerLinks.map((link) => (
            <span key={link.href ?? link.to ?? link.label}>{renderFooterLink(link)}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
