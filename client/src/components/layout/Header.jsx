import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getRoleDescription, getRoleLabel } from '../../auth/roleUi.js';
import { getMainNavigation } from '../../navigation/appNavigation.js';

function renderMenuLink(item, onClick, className = '', children = item.label) {
  if (item.href || item.to?.startsWith('/#') || item.to?.startsWith('#')) {
    const targetHref = item.href ?? item.to;
    return (
      <a href={targetHref} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={item.to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function Header({ siteName, profileMenu, currentUser, onLogout, role }) {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const mainNavigation = useMemo(() => getMainNavigation(role), [role]);
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);
  const currentUserName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
    currentUser?.username ||
    'Потребител';

  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    setIsProfileOpen(false);

    try {
      await onLogout();
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  }

  function renderProfileLink(link) {
    if (link.href === '/logout') {
      return (
        <button type="button" className="profile-dropdown-action" onClick={handleLogout}>
          {link.label}
        </button>
      );
    }

    return renderMenuLink(link, () => setIsProfileOpen(false));
  }

  function renderNavigationItem(item) {
    if (item.items?.length) {
      return (
        <div className="main-nav-item main-nav-item-dropdown">
          {renderMenuLink(
            item,
            undefined,
            'main-nav-trigger',
            <>
              <span>{item.label}</span>
              <span className="main-nav-caret" aria-hidden="true">
                ▾
              </span>
            </>
          )}

          <div className="main-nav-dropdown" role="menu">
            {item.items.map((dropdownItem) => (
              <div key={`${item.label}-${dropdownItem.label}`} role="none">
                {renderMenuLink(dropdownItem, undefined, 'main-nav-dropdown-link')}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="main-nav-item">{renderMenuLink(item)}</div>;
  }

  return (
    <header id="main-header">
      <div className="header-container">
        <div className="header-left">
          <Link className="logo" to="/">
            <img src="/images/logo.jpg" alt="Лого на приюта" />
            <span>{siteName}</span>
          </Link>
        </div>

        <div className="header-center">
          <nav className="main-nav" aria-label="Основна навигация">
            <ul>
              {mainNavigation.map((item) => (
                <li key={item.to ?? item.href ?? item.label}>{renderNavigationItem(item)}</li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="header-right">
          {currentUser ? <span className={`header-role-chip role-${role}`}>{roleLabel}</span> : null}

          <div className="profile" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              aria-label={currentUser ? `Профил на ${currentUserName}` : 'Профил'}
              onClick={() => setIsProfileOpen((currentValue) => !currentValue)}
            >
              <img src="/images/icons/client.jpg" alt="Профил" />
            </button>

            <div className={`profile-dropdown ${isProfileOpen ? 'is-open' : ''}`}>
              {currentUser ? (
                <div className="profile-dropdown-summary">
                  <strong>{currentUserName}</strong>
                  <span>{profileMenu.roleLabel}</span>
                  <small>{roleDescription}</small>
                </div>
              ) : null}

              {(profileMenu.links ?? []).map((link) => (
                <div key={`${link.href}-${link.label}`}>{renderProfileLink(link)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
