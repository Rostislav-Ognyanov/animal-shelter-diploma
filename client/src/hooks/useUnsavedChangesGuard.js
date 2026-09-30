import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useUnsavedChangesGuard(hasUnsavedChanges) {
  const navigate = useNavigate();
  const [pendingNavigationPath, setPendingNavigationPath] = useState('');

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setPendingNavigationPath('');
      return undefined;
    }

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    function blockInternalNavigation(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest('a[href]');

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      const targetUrl = new URL(anchor.href, window.location.href);

      if (targetUrl.origin !== window.location.origin) {
        return;
      }

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

      if (targetPath === currentPath) {
        return;
      }

      event.preventDefault();
      setPendingNavigationPath(targetPath);
    }

    document.addEventListener('click', blockInternalNavigation, true);

    return () => {
      document.removeEventListener('click', blockInternalNavigation, true);
    };
  }, [hasUnsavedChanges]);

  function confirmNavigation() {
    if (!pendingNavigationPath) {
      return;
    }

    const targetPath = pendingNavigationPath;
    setPendingNavigationPath('');
    navigate(targetPath);
  }

  return {
    pendingNavigationPath,
    confirmNavigation,
    cancelNavigation: () => setPendingNavigationPath(''),
  };
}
