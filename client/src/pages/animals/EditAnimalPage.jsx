import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AnimalNotFoundState } from '../../components/animals/AnimalNotFoundState.jsx';
import { AnimalEntryForm } from '../../components/animals/AnimalEntryForm.jsx';
import { createSuccessFeedback } from '../../lib/feedback.js';
import { focusErrorFeedback, focusFirstInvalidField } from '../../lib/formFocus.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  ANIMAL_FORM_VALIDATION_MESSAGE,
  buildAnimalPayload,
  mapAnimalToFormValues,
  validateAnimalForm,
} from './animalFormConfig.js';

export function EditAnimalPage({ role }) {
  const { animalId } = useParams();
  const errorFeedbackRef = useRef(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [formValues, setFormValues] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [pageState, setPageState] = useState({
    isLoading: true,
    error: '',
    statusCode: 0,
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
    updatedAnimal: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAnimal() {
      try {
        setPageState({
          isLoading: true,
          error: '',
          statusCode: 0,
        });
        setSubmitState({
          isSubmitting: false,
          error: '',
          success: '',
          updatedAnimal: null,
        });
        setFormErrors({});

        const animal = await fetchJson(`/api/animals/${animalId}`);

        if (!isMounted) {
          return;
        }

        if (role === 'employee' && ['inactive', 'archived'].includes(animal.status)) {
          setPageState({
            isLoading: false,
            error: 'Нямаш право да редактираш деактивирано или архивирано животно.',
            statusCode: 403,
          });
          return;
        }

        const nextFormValues = mapAnimalToFormValues(animal);

        setFormValues(nextFormValues);
        setInitialValues(nextFormValues);
        setPageState({
          isLoading: false,
          error: '',
          statusCode: 0,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          isLoading: false,
          error: error.message,
          statusCode: error.status ?? 0,
        });
      }
    }

    loadAnimal();

    return () => {
      isMounted = false;
    };
  }, [animalId, reloadToken, role]);

  function handleFieldChange(field, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));

    setFormErrors((currentValue) => {
      if (!currentValue[field]) {
        return currentValue;
      }

      const nextErrors = { ...currentValue };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleReset() {
    if (!initialValues) {
      return;
    }

    setFormValues(initialValues);
    setFormErrors({});
    setSubmitState((currentValue) => ({
      ...currentValue,
      error: '',
      success: '',
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateAnimalForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        error: ANIMAL_FORM_VALIDATION_MESSAGE,
        success: '',
      }));
      focusFirstInvalidField(event.currentTarget, validationErrors);
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        error: '',
        success: '',
        updatedAnimal: null,
      });

      const updatedAnimal = await patchJson(
        `/api/animals/${animalId}`,
        buildAnimalPayload(formValues, { includeStatus: false })
      );
      const nextFormValues = mapAnimalToFormValues(updatedAnimal);
      const successMessage = `Промените по „${updatedAnimal.displayName ?? updatedAnimal.name}“ са записани успешно.`;

      setFormValues(nextFormValues);
      setInitialValues(nextFormValues);
      setFormErrors({});
      setSubmitState({
        isSubmitting: false,
        error: '',
        success: successMessage,
        updatedAnimal,
      });
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        error: error.message,
        success: '',
        updatedAnimal: null,
      });
      focusErrorFeedback(errorFeedbackRef);
    }
  }

  function handleRetryLoad() {
    setReloadToken((currentValue) => currentValue + 1);
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell animal-form-shell">
        <section className="route-card animal-form-loading-card" aria-live="polite" aria-busy="true">
          <p className="sr-only" role="status">
            Зареждане на данните за редакция...
          </p>

          <div className="animal-skeleton-line animal-skeleton-line-hero-title" />
          <div className="animal-skeleton-line animal-skeleton-line-body" />
          <div className="animal-skeleton-line animal-skeleton-line-body" />
          <div className="animal-form-loading-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`animal-form-skeleton-${index + 1}`} className="animal-form-loading-field">
                <div className="animal-skeleton-line animal-skeleton-line-meta" />
                <div className="animal-skeleton-line animal-skeleton-line-input" />
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (pageState.statusCode === 400) {
    return (
      <AnimalNotFoundState
        code="400"
        title="Невалиден идентификатор на животно"
        description="Адресът на редакцията е невалиден. Провери линка и отвори животното от списъка с налични записи."
        showCreateAction
      />
    );
  }

  if (pageState.statusCode === 404) {
    return (
      <AnimalNotFoundState
        title="Животното за редакция не беше намерено"
        description="Записът липсва или вече не е достъпен за редакция. Провери адреса или отвори друг запис от списъка."
        showCreateAction
      />
    );
  }

  if (pageState.statusCode === 403) {
    return (
      <AnimalNotFoundState
        code="403"
        title="Редакцията не е достъпна"
        description={pageState.error}
      />
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell animal-form-shell">
        <div className="route-card animals-feedback-card animals-feedback-card-error">
                    <h1>Редакцията не може да се зареди</h1>
          <p>{pageState.error}</p>
          <div className="animals-feedback-actions">
            <button type="button" className="app-primary-action" onClick={handleRetryLoad}>
              Опитай отново
            </button>
            <Link className="app-secondary-action" to="/animals">
              Към списъка с животни
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!formValues) {
    return null;
  }

  return (
    <main className="route-shell animal-form-shell">
      <div className="animal-form-back-row">
        <Link className="app-secondary-action" to={`/animals/${animalId}`}>
          Към детайлите
        </Link>
      </div>

      <section className="animal-form-hero">
        <div>
          <h1>Редакция на животно</h1>
        </div>
      </section>

      <section className="animal-form-card">
        <div className="animal-form-header">
          <div>
            <h2>Текущи данни</h2>

          </div>
        </div>

        {submitState.error ? (
          <div
            ref={errorFeedbackRef}
            className="feedback-message feedback-message-error"
            role="alert"
            tabIndex={-1}
          >
            {submitState.error}
          </div>
        ) : null}
        {submitState.success ? (
          <div className="feedback-message feedback-message-info animal-form-success-box">
            <div>
              <strong>{submitState.success}</strong>
              <p>Промените са запазени и могат да бъдат прегледани веднага.</p>
            </div>
            <div className="animal-form-success-actions">
              <Link
                className="app-primary-action"
                to={`/animals/${submitState.updatedAnimal?.id ?? animalId}`}
                state={{
                  feedback: createSuccessFeedback(submitState.success),
                }}
              >
                Виж детайли
              </Link>
              <button type="button" className="app-secondary-action" onClick={handleReset}>
                Върни стойностите
              </button>
            </div>
          </div>
        ) : null}

        <AnimalEntryForm
          values={formValues}
          errors={formErrors}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onReset={handleReset}
          submitLabel="Запази промените"
          resetLabel="Върни оригинала"
          isSubmitting={submitState.isSubmitting}
          role={role}
          showStatusField={false}
        />
      </section>
    </main>
  );
}







