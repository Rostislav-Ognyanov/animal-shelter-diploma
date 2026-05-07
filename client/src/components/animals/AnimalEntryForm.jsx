import { useEffect, useMemo, useRef, useState } from 'react';

import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
  STATUS_OPTIONS,
} from '../../pages/animals/animalFormConfig.js';
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
  const fileInputRef = useRef(null);
  const [uploadState, setUploadState] = useState({
    isReading: false,
    error: '',
  });
  const isForcedInactive = values.status === 'inactive' || values.status === 'archived';
  const imageUrls = useMemo(() => parseImageUrlsText(values.imageUrlsText), [values.imageUrlsText]);

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

    const invalidTypeFile = files.find((file) => !String(file.type ?? '').startsWith('image/'));

    if (invalidTypeFile) {
      setUploadState({
        isReading: false,
        error: 'Можеш да качваш само изображения.',
      });
      event.target.value = '';
      return;
    }

    const oversizedFile = files.find((file) => file.size > 4 * 1024 * 1024);

    if (oversizedFile) {
      setUploadState({
        isReading: false,
        error: 'Всяка снимка трябва да бъде до 4 MB.',
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
      const existingUrls = parseImageUrlsText(values.imageUrlsText);
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
        </label>

        <label>
          <span>Дата на приемане *</span>
          <input
            type="text"
            inputMode="numeric"
            value={values.intakeDate}
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
            disabled={isSubmitting}
            onChange={(event) => onFieldChange('description', event.target.value)}
            placeholder="Поведение, характер и подходящ дом"
          />
          {errors.description ? <small className="animal-form-error">{errors.description}</small> : null}
        </label>

        <div className="animal-entry-field-wide animal-image-upload-panel">
          <div className="animal-image-upload-header">
            <span>Снимки</span>
          </div>

          <button
            type="button"
            className="animals-secondary-action animal-image-upload-trigger"
            disabled={isSubmitting || uploadState.isReading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadState.isReading ? 'Качване...' : 'Добави снимка'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
                    <AnimalImage src={imageUrl} alt={`Снимка ${index + 1}`} />
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
                  className="animals-secondary-action"
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

      <div className="animal-entry-actions">
        <button type="submit" className="animals-primary-action" disabled={isSubmitting || uploadState.isReading}>
          {isSubmitting ? 'Записваме...' : uploadState.isReading ? 'Качваме снимка...' : submitLabel}
        </button>
        <button
          type="button"
          className="animals-secondary-action"
          disabled={isSubmitting || uploadState.isReading}
          onClick={handleResetClick}
        >
          {resetLabel}
        </button>
      </div>
    </form>
  );
}
