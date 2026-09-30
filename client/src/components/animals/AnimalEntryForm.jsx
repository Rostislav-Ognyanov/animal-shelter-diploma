import { useEffect, useMemo, useRef, useState } from 'react';

import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
} from '../../pages/animals/animalFormConfig.js';
import {
  ANIMAL_IMAGE_DATA_MIME_TYPES,
  ANIMAL_IMAGE_MAX_BYTES,
  ANIMAL_IMAGE_MAX_COUNT,
  ANIMAL_TEXT_LIMITS,
} from '../../../../shared/domain/animalConstants.js';
import { getAnimalFormStatusOptions } from '../../pages/animals/animalUi.js';
import { AnimalImage } from './AnimalImage.jsx';

function parseImageUrlsText(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Снимката не можа да се зареди.'));
    reader.readAsDataURL(file);
  });
}

function isAllowedUploadMimeType(file) {
  return ANIMAL_IMAGE_DATA_MIME_TYPES.includes(String(file.type ?? '').toLowerCase());
}

export function AnimalEntryForm({
  values,
  errors,
  onFieldChange,
  onSubmit,
  onReset,
  submitLabel,
  resetLabel,
  isSubmitting,
  role,
  showStatusField = true,
}) {
  const fileInputRef = useRef(null);
  const [uploadState, setUploadState] = useState({
    isReading: false,
    error: '',
  });
  const imageUrls = useMemo(() => parseImageUrlsText(values.imageUrlsText), [values.imageUrlsText]);
  const statusOptions = useMemo(() => getAnimalFormStatusOptions(role), [role]);

  function getFieldA11yProps(fieldName) {
    return {
      name: fieldName,
      'aria-invalid': Boolean(errors[fieldName]),
    };
  }

  useEffect(() => {
    if (!values.imageUrlsText && !uploadState.isReading) {
      setUploadState((currentValue) => ({
        ...currentValue,
        error: '',
      }));

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadState.isReading, values.imageUrlsText]);

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const invalidTypeFile = files.find((file) => !isAllowedUploadMimeType(file));

    if (invalidTypeFile) {
      setUploadState({
        isReading: false,
        error: 'Можеш да качваш само JPEG, PNG или WebP изображения.',
      });
      event.target.value = '';
      return;
    }

    const existingUrls = parseImageUrlsText(values.imageUrlsText);

    if (existingUrls.length + files.length > ANIMAL_IMAGE_MAX_COUNT) {
      setUploadState({
        isReading: false,
        error: `Можеш да добавиш най-много ${ANIMAL_IMAGE_MAX_COUNT} снимки.`,
      });
      event.target.value = '';
      return;
    }

    const oversizedFile = files.find((file) => file.size > ANIMAL_IMAGE_MAX_BYTES);

    if (oversizedFile) {
      setUploadState({
        isReading: false,
        error: `Всяка снимка трябва да бъде до ${Math.floor(ANIMAL_IMAGE_MAX_BYTES / 1024 / 1024)} MB.`,
      });
      event.target.value = '';
      return;
    }

    try {
      setUploadState({
        isReading: true,
        error: '',
      });

      const uploadedUrls = await Promise.all(files.map((file) => readImageFileAsDataUrl(file)));
      const mergedUrls = [...existingUrls];

      uploadedUrls.forEach((url) => {
        if (!mergedUrls.includes(url)) {
          mergedUrls.push(url);
        }
      });

      onFieldChange('imageUrlsText', mergedUrls.join('\n'));
      setUploadState({
        isReading: false,
        error: '',
      });
    } catch (error) {
      setUploadState({
        isReading: false,
        error: error.message,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleResetClick() {
    setUploadState({
      isReading: false,
      error: '',
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onReset();
  }

  function handleRemoveImage(imageIndex) {
    const nextImageUrls = imageUrls.filter((_, index) => index !== imageIndex);
    onFieldChange('imageUrlsText', nextImageUrls.join('\n'));

    if (uploadState.error) {
      setUploadState((currentValue) => ({
        ...currentValue,
        error: '',
      }));
    }
  }

  function handleClearImages() {
    onFieldChange('imageUrlsText', '');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (uploadState.error) {
      setUploadState((currentValue) => ({
        ...currentValue,
        error: '',
      }));
    }
  }

  return (
    <form className="animal-entry-form" onSubmit={onSubmit} noValidate>
      <div className="animal-entry-grid animal-entry-grid-primary">
        <label>
          <span>Име *</span>
          <input
            type="text"
            value={values.name}
            {...getFieldA11yProps('name')}
            required
            maxLength={ANIMAL_TEXT_LIMITS.name}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('name', event.target.value)}
            placeholder="Например Max или Макс"
          />
          {errors.name ? <small className="animal-form-error">{errors.name}</small> : null}
        </label>

        <label>
          <span>Вид *</span>
          <select
            value={values.species}
            {...getFieldA11yProps('species')}
            required
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('species', event.target.value)}
          >
            <option value="" disabled>Избери вид</option>
            {SPECIES_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.species ? <small className="animal-form-error">{errors.species}</small> : null}
        </label>

        <label>
          <span>Порода *</span>
          <input
            type="text"
            value={values.breed}
            {...getFieldA11yProps('breed')}
            required
            maxLength={ANIMAL_TEXT_LIMITS.breed}
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
            {...getFieldA11yProps('age')}
            required
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
            {...getFieldA11yProps('gender')}
            required
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('gender', event.target.value)}
          >
            <option value="" disabled>Избери пол</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.gender ? <small className="animal-form-error">{errors.gender}</small> : null}
        </label>

        <label>
          <span>Големина *</span>
          <select
            value={values.size}
            {...getFieldA11yProps('size')}
            required
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('size', event.target.value)}
          >
            <option value="" disabled>Избери големина</option>
            {SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.size ? <small className="animal-form-error">{errors.size}</small> : null}
        </label>

        {showStatusField ? (
          <label>
            <span>Статус *</span>
            <select
              value={values.status}
              {...getFieldA11yProps('status')}
              required
              disabled={isSubmitting}
              onChange={(event) => onFieldChange('status', event.target.value)}
            >
              <option value="" disabled>Избери статус</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status ? <small className="animal-form-error">{errors.status}</small> : null}
          </label>
        ) : null}

        <label>
          <span>Дата на приемане *</span>
          <input
            type="text"
            inputMode="numeric"
            value={values.intakeDate}
            {...getFieldA11yProps('intakeDate')}
            required
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('intakeDate', event.target.value)}
            placeholder="dd/mm/yyyy"
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
            {...getFieldA11yProps('healthStatus')}
            required
            maxLength={ANIMAL_TEXT_LIMITS.healthStatus}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('healthStatus', event.target.value)}
            placeholder="Кратка медицинска информация и текущо състояние"
          />
          {errors.healthStatus ? <small className="animal-form-error">{errors.healthStatus}</small> : null}
        </label>

        <label>
          <span>Описание *</span>
          <textarea
            rows="4"
            value={values.description}
            {...getFieldA11yProps('description')}
            required
            maxLength={ANIMAL_TEXT_LIMITS.description}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('description', event.target.value)}
            placeholder="Поведение, характер и подходящ дом"
          />
          {errors.description ? <small className="animal-form-error">{errors.description}</small> : null}
        </label>

        <label>
          <span>Кратка история</span>
          <textarea
            rows="5"
            value={values.story}
            {...getFieldA11yProps('story')}
            maxLength={ANIMAL_TEXT_LIMITS.story}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('story', event.target.value)}
            placeholder="Как животното е попаднало в приюта и какъв е основният му контекст"
          />
          {errors.story ? <small className="animal-form-error">{errors.story}</small> : null}
        </label>

        <label>
          <span>История и характер</span>
          <textarea
            rows="6"
            value={values.historyAndCharacter}
            {...getFieldA11yProps('historyAndCharacter')}
            maxLength={ANIMAL_TEXT_LIMITS.historyAndCharacter}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('historyAndCharacter', event.target.value)}
            placeholder="Поведение, адаптация, отношения с хора и важни особености"
          />
          {errors.historyAndCharacter ? (
            <small className="animal-form-error">{errors.historyAndCharacter}</small>
          ) : null}
        </label>

        <label>
          <span>Основна информация</span>
          <textarea
            rows="5"
            value={values.details}
            {...getFieldA11yProps('details')}
            maxLength={ANIMAL_TEXT_LIMITS.details}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('details', event.target.value)}
            placeholder="Допълнителни факти, които са полезни за детайлната страница"
          />
          {errors.details ? <small className="animal-form-error">{errors.details}</small> : null}
        </label>

        <label>
          <span>Подходящи условия за отглеждане</span>
          <textarea
            rows="6"
            value={values.careConditions}
            {...getFieldA11yProps('careConditions')}
            maxLength={ANIMAL_TEXT_LIMITS.careConditions}
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('careConditions', event.target.value)}
            placeholder="Дом, активност, адаптация, специфични нужди и важни условия"
          />
          {errors.careConditions ? <small className="animal-form-error">{errors.careConditions}</small> : null}
        </label>

        <div className="animal-entry-field-wide animal-image-upload-panel">
          <div className="animal-image-upload-header">
            <span>Снимки</span>
          </div>

          <button
            type="button"
            className="app-secondary-action animal-image-upload-trigger"
            {...getFieldA11yProps('imageUrlsText')}
            disabled={isSubmitting || uploadState.isReading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadState.isReading ? 'Качване...' : 'Добави снимка'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ANIMAL_IMAGE_DATA_MIME_TYPES.join(',')}
            multiple
            className="animal-image-upload-input"
            disabled={isSubmitting || uploadState.isReading}
            onChange={handleImageUpload}
          />

          {uploadState.error ? <small className="animal-form-error">{uploadState.error}</small> : null}
          {errors.imageUrlsText ? <small className="animal-form-error">{errors.imageUrlsText}</small> : null}

          {imageUrls.length > 0 ? (
            <>
              <div className="animal-image-preview-grid">
                {imageUrls.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index + 1}`} className="animal-image-preview-card">
                    <AnimalImage src={imageUrl} species={values.species} alt={`Снимка ${index + 1}`} />
                    <button
                      type="button"
                      className="animal-image-remove-button"
                      disabled={isSubmitting || uploadState.isReading}
                      onClick={() => handleRemoveImage(index)}
                    >
                      Премахни
                    </button>
                  </div>
                ))}
              </div>

              <div className="animal-image-panel-actions">
                <button
                  type="button"
                  className="app-secondary-action"
                  disabled={isSubmitting || uploadState.isReading}
                  onClick={handleClearImages}
                >
                  Изчисти снимките
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="animal-entry-checkboxes">
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

      <div className="animal-entry-actions">
        <button type="submit" className="app-primary-action" disabled={isSubmitting || uploadState.isReading}>
          {isSubmitting ? 'Записваме...' : uploadState.isReading ? 'Качваме снимка...' : submitLabel}
        </button>
        <button
          type="button"
          className="app-secondary-action"
          disabled={isSubmitting || uploadState.isReading}
          onClick={handleResetClick}
        >
          {resetLabel}
        </button>
      </div>
    </form>
  );
}
