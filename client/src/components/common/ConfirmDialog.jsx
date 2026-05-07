export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Потвърди',
  cancelLabel = 'Отказ',
  isSubmitting = false,
  tone = 'danger',
  onConfirm,
  onClose,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-body">
          <p className="route-meta">Потвърждение</p>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>

        <div className="confirm-dialog-actions">
          <button type="button" className="animals-secondary-action" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`animals-primary-action confirm-dialog-confirm is-${tone}`}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Изпълняваме...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
