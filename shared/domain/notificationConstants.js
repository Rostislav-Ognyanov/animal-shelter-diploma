export const NOTIFICATION_DEFINITIONS = Object.freeze({
  'adoption-created': Object.freeze({
    label: 'Нова заявка за осиновяване',
    resourceType: 'adoption-request',
  }),
  'adoption-status-updated': Object.freeze({
    label: 'Промяна по заявка за осиновяване',
    resourceType: 'adoption-request',
  }),
  'volunteer-application-created': Object.freeze({
    label: 'Нова доброволческа кандидатура',
    resourceType: 'volunteer-application',
  }),
  'rescue-report-created': Object.freeze({
    label: 'Нов сигнал за животно',
    resourceType: 'rescue-report',
  }),
  'contact-inquiry-created': Object.freeze({
    label: 'Ново запитване',
    resourceType: 'contact-inquiry',
  }),
  'donation-created': Object.freeze({
    label: 'Нова заявка за дарение',
    resourceType: 'donation',
  }),
  'rescue-story-draft-created': Object.freeze({
    label: 'История очаква преглед',
    resourceType: 'rescue-story',
  }),
  'rescue-story-draft-updated': Object.freeze({
    label: 'Историята има обновена чернова',
    resourceType: 'rescue-story',
  }),
  'species-content-draft-updated': Object.freeze({
    label: 'Чернова за вид очаква преглед',
    resourceType: 'content',
  }),
});

export const NOTIFICATION_TYPE_VALUES = Object.freeze(Object.keys(NOTIFICATION_DEFINITIONS));

export const NOTIFICATION_RESOURCE_TYPE_VALUES = Object.freeze([
  ...new Set(
    Object.values(NOTIFICATION_DEFINITIONS).map((definition) => definition.resourceType)
  ),
]);

export const NOTIFICATION_TYPE_LABELS = Object.freeze(
  Object.fromEntries(
    Object.entries(NOTIFICATION_DEFINITIONS).map(([type, definition]) => [
      type,
      definition.label,
    ])
  )
);

export const NOTIFICATION_TEXT_LIMITS = Object.freeze({
  title: 200,
  message: 1000,
  resourceId: 200,
  dedupeKey: 200,
});

export const NOTIFICATION_RETENTION_DAYS = 180;
export const NOTIFICATION_RETENTION_SECONDS = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60;
