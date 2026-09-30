import { NOTIFICATION_TYPE_LABELS } from '../../../../shared/domain/notificationConstants.js';

export const NOTIFICATIONS_UPDATED_EVENT = 'app:notifications-updated';

export function emitNotificationsUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function getNotificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[type] ?? 'Известие';
}

export function getNotificationPath(notification, role) {
  const resourceId = notification?.resourceId ?? '';
  const staffPrefix = role === 'admin' ? '/admin' : '/staff';
  const hasStaffAccess = role === 'employee' || role === 'admin';

  if (!resourceId) {
    return '/notifications';
  }

  switch (notification?.resourceType) {
    case 'adoption-request':
      return `/adoptions/${resourceId}`;
    case 'volunteer-application':
      return hasStaffAccess ? `${staffPrefix}/volunteers/${resourceId}` : '/notifications';
    case 'rescue-report':
      return hasStaffAccess ? `${staffPrefix}/signals/${resourceId}` : '/notifications';
    case 'contact-inquiry':
      return hasStaffAccess ? `${staffPrefix}/inquiries/${resourceId}` : '/notifications';
    case 'donation':
      return hasStaffAccess ? `${staffPrefix}/donations/${resourceId}` : '/notifications';
    case 'rescue-story':
      return hasStaffAccess
        ? `${staffPrefix}/rescue-stories-content?story=${encodeURIComponent(resourceId)}`
        : '/notifications';
    case 'content':
      return hasStaffAccess
        ? `${staffPrefix}/species-content?species=${encodeURIComponent(resourceId)}`
        : '/notifications';
    default:
      return '/notifications';
  }
}

export function formatNotificationDate(value) {
  if (!value) {
    return 'Няма дата';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
