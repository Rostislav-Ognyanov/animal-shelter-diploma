import { getAnimalStatusLabel } from '../../pages/animals/animalUi.js';

const STATUS_CLASS_BY_VALUE = {
  available: 'is-available',
  reserved: 'is-reserved',
  adopted: 'is-adopted',
  'medical-care': 'is-medical-care',
  'under-care': 'is-under-care',
  'protected-care': 'is-protected-care',
  released: 'is-released',
  inactive: 'is-inactive',
  archived: 'is-archived',
};

export function AnimalStatusBadge({ status, statusLabel }) {
  const statusClassName = STATUS_CLASS_BY_VALUE[status] ?? 'is-default';

  return (
    <span className={`animal-status ${statusClassName}`}>
      {statusLabel || getAnimalStatusLabel(status)}
    </span>
  );
}
