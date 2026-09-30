import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { getRoleLabel } from '../../auth/roleUi.js';
import { NotificationBell } from '../notifications/NotificationBell.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { getMainNavigation } from '../../navigation/appNavigation.js';

function renderMenuLink(item, onClick, className = '', children = item.label) {
  const target = item.href ?? item.to;

  if (!target) {
    return <span className={className}>{children}</span>;
  }

  if (target.startsWith('/') && !target.startsWith('/#')) {
    return (
      <Link to={target} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <a href={target} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export function Header({
  logoUrl = 'images/logo.jpg',
  siteName,
  profileMenu,
  currentUser,
  onLogout,
  role,
  publicBanner,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [hoveredNavigationDropdown, setHoveredNavigationDropdown] = useState('');
  const [clickedNavigationDropdown, setClickedNavigationDropdown] = useState('');
  const headerRef = useRef(null);
  const profileRef = useRef(null);
  const mainNavigation = useMemo(() => getMainNavigation(role), [role]);
  const authReturnTarget = useMemo(() => {
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
    const target = isAuthRoute ? location.state?.from : location;

    if (!target || typeof target !== 'object') {
      return null;
    }

    return {
      pathname: String(target.pathname ?? ''),
      search: String(target.search ?? ''),
      hash: String(target.hash ?? ''),
    };
  }, [location]);
  const roleLabel = getRoleLabel(role);
  const currentUserName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
    currentUser?.username ||
    'Потребител';

  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }

      const toggleDropdown =
        event.target instanceof Element
          ? event.target.closest('.main-nav-item-dropdown-toggle')
          : null;

      if (!toggleDropdown) {
        setHoveredNavigationDropdown('');
        setClickedNavigationDropdown('');
      }

      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsNavigationOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsNavigationOpen(false);
        setHoveredNavigationDropdown('');
        setClickedNavigationDropdown('');
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    const headerElement = headerRef.current;

    if (!headerElement) {
      return undefined;
    }

    function updateHeaderScrollOffset() {
      const nextHeight = Math.ceil(headerElement.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-scroll-offset', `${nextHeight}px`);
    }

    updateHeaderScrollOffset();

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(updateHeaderScrollOffset) : null;

    resizeObserver?.observe(headerElement);
    window.addEventListener('resize', updateHeaderScrollOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateHeaderScrollOffset);
      document.documentElement.style.removeProperty('--header-scroll-offset');
    };
  }, [publicBanner?.isVisible, publicBanner?.text, role, isNavigationOpen]);

  useEffect(() => {
    setHoveredNavigationDropdown('');
    setClickedNavigationDropdown('');
  }, [role]);

  async function handleLogout() {
    setIsProfileOpen(false);
    setHoveredNavigationDropdown('');
    setClickedNavigationDropdown('');

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

    if (role === 'guest' && (link.href === '/login' || link.href === '/register')) {
      return (
        <Link
          to={link.href}
          state={authReturnTarget ? { from: authReturnTarget } : undefined}
          onClick={() => setIsProfileOpen(false)}
        >
          {link.label}
        </Link>
      );
    }

    return renderMenuLink(link, () => setIsProfileOpen(false));
  }

  function handleNavigationLinkClick() {
    setIsNavigationOpen(false);
    setHoveredNavigationDropdown('');
    setClickedNavigationDropdown('');
  }

  function renderNavigationItem(item) {
    if (item.items?.length) {
      const dropdownId = item.id ?? item.label;
      const hasNavigationTarget = Boolean(item.href ?? item.to);
      const isToggleDropdown = !hasNavigationTarget;
      const isDropdownOpen =
        hoveredNavigationDropdown === dropdownId || clickedNavigationDropdown === dropdownId;

      return (
        <div
          className={`main-nav-item main-nav-item-dropdown${
            isToggleDropdown ? ' main-nav-item-dropdown-toggle' : ''
          }${isDropdownOpen ? ' is-open' : ''}`}
          onPointerEnter={
            isToggleDropdown
              ? (event) => {
                  if (event.pointerType === 'mouse') {
                    setHoveredNavigationDropdown(dropdownId);
                  }
                }
              : undefined
          }
          onPointerLeave={
            isToggleDropdown
              ? (event) => {
                  if (event.pointerType === 'mouse') {
                    setHoveredNavigationDropdown('');
                  }
                }
              : undefined
          }
        >
          {isToggleDropdown ? (
            <button
              type="button"
              className="main-nav-trigger"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              aria-controls={`${dropdownId}-menu`}
              onClick={() =>
                setClickedNavigationDropdown((currentValue) =>
                  currentValue === dropdownId ? '' : dropdownId
                )
              }
            >
              <span>{item.label}</span>
              <span className="main-nav-caret" aria-hidden="true">
                ▾
              </span>
            </button>
          ) : (
            renderMenuLink(
              item,
              handleNavigationLinkClick,
              'main-nav-trigger',
              <>
                <span>{item.label}</span>
                <span className="main-nav-caret" aria-hidden="true">
                  ▾
                </span>
              </>
            )
          )}

          <div
            id={isToggleDropdown ? `${dropdownId}-menu` : undefined}
            className="main-nav-dropdown"
            hidden={isToggleDropdown && !isDropdownOpen}
          >
            {item.items.map((dropdownItem) => (
              <div key={`${item.label}-${dropdownItem.label}`}>
                {renderMenuLink(dropdownItem, handleNavigationLinkClick, 'main-nav-dropdown-link')}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="main-nav-item">{renderMenuLink(item, handleNavigationLinkClick)}</div>;
  }

  return (
    <header id="main-header" ref={headerRef}>
      {publicBanner?.isVisible && publicBanner?.text ? (
        <div className="site-public-banner">
          <p>{publicBanner.text}</p>
        </div>
      ) : null}
      <div className="header-container">
        <div className="header-left">
          <Link className="logo" to="/" onClick={handleNavigationLinkClick}>
            <img src={buildPublicAssetPath(logoUrl)} alt="Лого на приюта" />
            <span>{siteName}</span>
          </Link>
        </div>

        <button
          type="button"
          className="main-nav-toggle"
          aria-controls="main-navigation"
          aria-expanded={isNavigationOpen}
          aria-label={isNavigationOpen ? 'Затвори навигацията' : 'Отвори навигацията'}
          onClick={() => {
            setIsProfileOpen(false);
            setHoveredNavigationDropdown('');
            setClickedNavigationDropdown('');
            setIsNavigationOpen((currentValue) => !currentValue);
          }}
        >
          <span aria-hidden="true">{isNavigationOpen ? '×' : '☰'}</span>
        </button>

        <div className={`header-center ${isNavigationOpen ? 'is-open' : ''}`}>
          <nav id="main-navigation" className="main-nav" aria-label="Основна навигация">
            <ul>
              {mainNavigation.map((item) => (
                <li key={item.id ?? item.to ?? item.href ?? item.label}>{renderNavigationItem(item)}</li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="header-right">
          {currentUser ? <span className="header-role-chip">{roleLabel}</span> : null}
          <NotificationBell
            currentUser={currentUser}
            role={role}
            onOpen={() => {
              setIsProfileOpen(false);
              setIsNavigationOpen(false);
              setHoveredNavigationDropdown('');
              setClickedNavigationDropdown('');
            }}
          />

          <div className="profile" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              aria-expanded={isProfileOpen}
              aria-controls="profile-menu"
              aria-label={currentUser ? `Профил на ${currentUserName}` : 'Профил'}
              onClick={() => {
                setIsNavigationOpen(false);
                setHoveredNavigationDropdown('');
                setClickedNavigationDropdown('');
                setIsProfileOpen((currentValue) => !currentValue);
              }}
            >
              <img src={buildPublicAssetPath('images/icons/client.jpg')} alt="Профил" />
            </button>

            <div
              id="profile-menu"
              className={`profile-dropdown ${isProfileOpen ? 'is-open' : ''}`}
              hidden={!isProfileOpen}
            >
              {(profileMenu?.links ?? []).map((link) => (
                <div key={`${link.href}-${link.label}`}>{renderProfileLink(link)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
