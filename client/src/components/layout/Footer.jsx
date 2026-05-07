export function Footer({ footer }) {
  return (
    <footer id="site-footer">
      <div className="footer-container">
        <div className="footer-info">
          <p>{footer.copyright}</p>
          <p>{footer.secondary}</p>
        </div>

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
