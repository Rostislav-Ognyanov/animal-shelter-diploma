import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import {
  RESCUE_REPORT_SPECIES_OPTIONS,
  RESCUE_REPORT_URGENCY_OPTIONS,
  getRescueReportDisplayName,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
} from './rescueReportUi.js';

const EMPTY_FORM = {
  name: '',
  phone: '',
  location: '',
  species: 'dog',
  urgency: 'medium',
  description: '',
  imageUrl: '',
};

function validateRescueReportForm(values) {
  const errors = {};

  if (!String(values.name ?? '').trim()) {
    errors.name = 'Името е задължително.';
  }

  if (!String(values.phone ?? '').trim()) {
    errors.phone = 'Телефонът е задължителен.';
  } else if (!/^[0-9+\s().-]{6,32}$/.test(String(values.phone ?? '').trim())) {
    errors.phone = 'Въведи валиден телефонен номер.';
  }

  if (!String(values.location ?? '').trim()) {
    errors.location = 'Посочи мястото на животното.';
  }

  if (!String(values.species ?? '').trim()) {
    errors.species = 'Избери вид животно.';
  }

  if (!String(values.urgency ?? '').trim()) {
    errors.urgency = 'Избери ниво на спешност.';
  }

  if (!String(values.description ?? '').trim()) {
    errors.description = 'Опиши какво се е случило и в какво състояние е животното.';
  }

  return errors;
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Снимката не можа да се зареди.'));
    reader.readAsDataURL(file);
  });
}

export function RescueReportPage() {
  const { currentUser } = useAuth();
  const imageInputRef = useRef(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    submittedReport: null,
    feedback: createEmptyFeedback(),
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFormValues((currentValue) => ({
      ...currentValue,
      name:
        currentValue.name ||
        [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() ||
        '',
    }));
  }, [currentUser]);

  const reportName = useMemo(
    () => getRescueReportDisplayName(submitState.submittedReport),
    [submitState.submittedReport]
  );

  function clearFormFields() {
    setFormValues({ ...EMPTY_FORM });
    setFormErrors({});
    setIsReadingImage(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  function handleFieldChange(fieldName, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));

    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      handleFieldChange('imageUrl', '');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: 'Избери валиден image файл.',
      }));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: 'Снимката трябва да бъде до 4 MB.',
      }));
      return;
    }

    try {
      setIsReadingImage(true);
      const imageDataUrl = await readImageFileAsDataUrl(file);
      handleFieldChange('imageUrl', imageDataUrl);
    } catch (error) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: error.message,
      }));
    } finally {
      setIsReadingImage(false);
    }
  }

  function resetForm() {
    clearFormFields();
    setSubmitState({
      isSubmitting: false,
      submittedReport: null,
      feedback: createEmptyFeedback(),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitState.isSubmitting || isReadingImage) {
      return;
    }

    const validationErrors = validateRescueReportForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        feedback: createErrorFeedback('Попълни коректно задължителните полета преди изпращане.'),
      }));
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        submittedReport: null,
        feedback: createEmptyFeedback(),
      });

      const createdReport = await postJson('/api/rescue-reports', formValues);

      setSubmitState({
        isSubmitting: false,
        submittedReport: createdReport,
        feedback: createSuccessFeedback('Сигналът беше изпратен успешно.'),
      });
      clearFormFields();
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        submittedReport: null,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  return (
    <main className="route-shell rescue-shell">
      <section className="rescue-hero">
        <div>
          <h1>Свържи се с приюта</h1>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/search">
          Към животните
        </Link>
        <Link className="animals-primary-action" to="/">
          Към началото
        </Link>
      </div>

      {submitState.feedback.message ? (
        <div className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
          {submitState.feedback.message}
        </div>
      ) : null}

      {submitState.submittedReport ? (
        <section className="rescue-card rescue-success-card">
          <div className="rescue-success-heading">
            <span className={`rescue-status is-${submitState.submittedReport.status}`}>
              {getRescueReportStatusLabel(submitState.submittedReport.status)}
            </span>
            <h2>{reportName}</h2>
          </div>
          <p>{getRescueReportStatusGuidance(submitState.submittedReport.status)}</p>
          <p>Ще използваме телефона, който посочи, ако екипът има нужда от още информация.</p>
          <div className="route-actions rescue-inline-actions">
            <button type="button" className="animals-primary-action" onClick={resetForm}>
              Нов сигнал
            </button>
            <Link className="animals-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rescue-card">
        <form className="rescue-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Име</span>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="name"
            />
            {formErrors.name ? <span>{formErrors.name}</span> : null}
          </label>

          <label>
            <span>Телефон</span>
            <input
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="tel"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          <label className="rescue-form-grid-wide">
            <span>Място</span>
            <input
              type="text"
              value={formValues.location}
              onChange={(event) => handleFieldChange('location', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              placeholder="Адрес, ориентир или квартал"
            />
            {formErrors.location ? <span>{formErrors.location}</span> : null}
          </label>

          <label>
            <span>Вид животно</span>
            <select
              value={formValues.species}
              onChange={(event) => handleFieldChange('species', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
            >
              {RESCUE_REPORT_SPECIES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formErrors.species ? <span>{formErrors.species}</span> : null}
          </label>

          <label>
            <span>Спешност</span>
            <select
              value={formValues.urgency}
              onChange={(event) => handleFieldChange('urgency', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
            >
              {RESCUE_REPORT_URGENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formErrors.urgency ? <span>{formErrors.urgency}</span> : null}
          </label>

          <label className="rescue-form-grid-wide">
            <span>Описание</span>
            <textarea
              value={formValues.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              placeholder="Опиши какво се е случило, как изглежда животното и защо смяташ, че е в нужда."
            />
            {formErrors.description ? <span>{formErrors.description}</span> : null}
          </label>

          <div className="rescue-form-grid-wide rescue-photo-field">
            <span>Снимка по желание</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={submitState.isSubmitting || isReadingImage}
            />
            {formErrors.imageUrl ? <p className="rescue-field-error">{formErrors.imageUrl}</p> : null}
            {formValues.imageUrl ? (
              <div className="rescue-photo-preview">
                <img src={formValues.imageUrl} alt="Преглед на качената снимка" />
                <button
                  type="button"
                  className="animals-secondary-action"
                  onClick={() => handleFieldChange('imageUrl', '')}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  Премахни снимката
                </button>
              </div>
            ) : null}
          </div>

          <div className="profile-form-actions rescue-form-grid-wide">
            <button type="submit" className="animals-primary-action" disabled={submitState.isSubmitting || isReadingImage}>
              {submitState.isSubmitting ? 'Изпращане...' : isReadingImage ? 'Качване...' : 'Изпрати сигнал'}
            </button>
            <button
              type="button"
              className="animals-secondary-action"
              disabled={submitState.isSubmitting || isReadingImage}
              onClick={resetForm}
            >
              Изчисти полетата
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
