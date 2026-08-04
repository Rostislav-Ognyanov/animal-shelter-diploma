import { Link } from 'react-router-dom';

export function PageContentLink({ children, className = '', to = '' }) {
  const normalizedTarget = String(to ?? '').trim();

  if (!normalizedTarget || !children) {
    return null;
  }

  if (/^(?:#|https?:|mailto:|tel:)/i.test(normalizedTarget)) {
    return (
      <a className={className} href={normalizedTarget}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} to={normalizedTarget}>
      {children}
    </Link>
  );
}
