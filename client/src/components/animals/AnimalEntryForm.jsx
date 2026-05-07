import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
  STATUS_OPTIONS,
} from '../../pages/animals/animalFormConfig.js';

export function AnimalEntryForm({
  values,
  errors,
  onFieldChange,
  onSubmit,
  onReset,
  submitLabel,
  resetLabel,
  isSubmitting,
}) {
  const isForcedInactive = values.status === 'inactive' || values.status === 'archived';

  return (
    <form className="animal-entry-form" onSubmit={onSubmit} noValidate>
      <div className="animal-entry-grid animal-entry-grid-primary">
        <label>
          <span>Име на латиница *</span>
          <input
            type="text"
            value={values.name}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('name', event.target.value)}
            placeholder="Например Max"
          />
          {errors.name ? <small className="animal-form-error">{errors.name}</small> : null}
        </label>

        <label>
          <span>Име за показване</span>
          <input
            type="text"
            value={values.displayName}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('displayName', event.target.value)}
            placeholder="Например Макс"
          />
          <small className="animal-form-hint">По желание, ако искаш визуално име на кирилица.</small>
        </label>

        <label>
          <span>Вид *</span>
          <select
            value={values.species}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('species', event.target.value)}
          >
            {SPECIES_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Порода *</span>
          <input
            type="text"
            value={values.breed}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('breed', event.target.value)}
            placeholder="Например Лабрадор микс"
          />
          {errors.breed ? <small className="animal-form-error">{errors.breed}</small> : null}
        </label>

        <label>
          <span>Възраст *</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.age}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('age', event.target.value)}
            placeholder="Например 3"
          />
          {errors.age ? <small className="animal-form-error">{errors.age}</small> : null}
        </label>

        <label>
          <span>Пол *</span>
          <select
            value={values.gender}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('gender', event.target.value)}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Големина *</span>
          <select
            value={values.size}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('size', event.target.value)}
          >
            {SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Статус *</span>
          <select
            value={values.status}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('status', event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small className="animal-form-hint">
            При статус „Неактивно“ или „Архивирано“ записът автоматично става неактивен.
          </small>
        </label>

        <label>
          <span>Дата на приемане *</span>
          <input
            type="date"
            value={values.intakeDate}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('intakeDate', event.target.value)}
          />
          {errors.intakeDate ? <small className="animal-form-error">{errors.intakeDate}</small> : null}
        </label>
      </div>

      <div className="animal-entry-grid animal-entry-grid-secondary">
        <label>
          <span>Здравен статус *</span>
          <textarea
            rows="4"
            value={values.healthStatus}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('healthStatus', event.target.value)}
            placeholder="Кратка медицинска информация и текущо състояние"
          />
          {errors.healthStatus ? <small className="animal-form-error">{errors.healthStatus}</small> : null}
        </label>

        <label>
          <span>Описание *</span>
          <textarea
            rows="5"
            value={values.description}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('description', event.target.value)}
            placeholder="Поведение, характер и подходящ дом"
          />
          {errors.description ? <small className="animal-form-error">{errors.description}</small> : null}
        </label>

        <label className="animal-entry-field-wide">
          <span>Снимки</span>
          <textarea
            rows="4"
            value={values.imageUrlsText}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('imageUrlsText', event.target.value)}
            placeholder={'/images/animals/Dogs/Beagle_Lily.jpg\n/images/animals/Dogs/Beagle_Lily_2.jpg'}
          />
          <small className="animal-form-hint">
            Добави по един адрес или локален път на ред. Първата снимка ще се използва като основна.
          </small>
          {errors.imageUrlsText ? <small className="animal-form-error">{errors.imageUrlsText}</small> : null}
        </label>
      </div>

      <div className="animal-entry-checkboxes">
        <label className="auth-checkbox animal-entry-checkbox">
          <input
            type="checkbox"
            checked={isForcedInactive ? false : values.isActive}
            disabled={isSubmitting || isForcedInactive}
            onChange={(event) => onFieldChange('isActive', event.target.checked)}
          />
          <span>Активен запис</span>
        </label>

        <label className="auth-checkbox animal-entry-checkbox">
          <input
            type="checkbox"
            checked={values.vaccinated}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('vaccinated', event.target.checked)}
          />
          <span>Ваксиниран</span>
        </label>

        <label className="auth-checkbox animal-entry-checkbox">
          <input
            type="checkbox"
            checked={values.neutered}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('neutered', event.target.checked)}
          />
          <span>Кастриран</span>
        </label>
      </div>

      {isForcedInactive ? (
        <p className="animal-form-hint animal-form-hint-inline">
          Текущият статус изключва животното от активните процеси и прави полето „Активен запис“ невалидно.
        </p>
      ) : null}

      <div className="animal-entry-actions">
        <button type="submit" className="animals-primary-action" disabled={isSubmitting}>
          {isSubmitting ? 'Записваме...' : submitLabel}
        </button>
        <button type="button" className="animals-secondary-action" disabled={isSubmitting} onClick={onReset}>
          {resetLabel}
        </button>
      </div>
    </form>
  );
}
