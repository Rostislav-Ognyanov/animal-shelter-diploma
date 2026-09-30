import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { getMainNavigation } from '../../navigation/appNavigation.js';

function renderFooterLink(item) {
  const target = item.href ?? item.to;

  if (!target) {
    return <span>{item.label}</span>;
  }

  if (target?.startsWith('/') && !target.startsWith('/#')) {
    return <Link to={target}>{item.label}</Link>;
  }

  return <a href={target}>{item.label}</a>;
}

function normalizePhoneHref(phone) {
  return String(phone ?? '').replace(/[^\d+]/g, '');
}

export function Footer({ footer, siteName }) {
  const footerNavigation = getMainNavigation('guest');
  const logoUrl = footer?.logoUrl ?? 'images/logo.jpg';
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
            {footer?.copyright ? <p>{footer.copyright}</p> : null}
            {footer?.secondary ? <p>{footer.secondary}</p> : null}
            {contactInfo?.phone ? (
              <p>
                <a href={`tel:${normalizePhoneHref(contactInfo.phone)}`}>{contactInfo.phone}</a>
              </p>
            ) : null}
            {contactInfo?.email ? (
              <p>
                <a href={`mailto:${String(contactInfo.email).trim()}`}>{contactInfo.email}</a>
              </p>
            ) : null}
            {contactInfo?.address ? <p>{contactInfo.address}</p> : null}
            {contactInfo?.workingHours ? <p>{contactInfo.workingHours}</p> : null}
            {socialLinks.length ? (
              <nav className="footer-social-links" aria-label="Социални профили">
                {socialLinks.map((link) => (
                  <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </nav>
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
