import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getRoleLabel } from '../../auth/roleUi.js';
import { AnimalEntryForm } from '../../components/animals/AnimalEntryForm.jsx';
import { createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import {
  ANIMAL_FORM_VALIDATION_MESSAGE,
  buildAnimalPayload,
  getInitialAnimalFormValues,
  validateAnimalForm,
} from './animalFormConfig.js';

export function CreateAnimalPage({ role }) {
  const [formValues, setFormValues] = useState(getInitialAnimalFormValues);
  const [formErrors, setFormErrors] = useState({});
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
    createdAnimal: null,
  });

  const pageRoleLabel = getRoleLabel(role);

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
    setFormValues(getInitialAnimalFormValues());
    setFormErrors({});
    setSubmitState({
      isSubmitting: false,
      error: '',
      success: '',
      createdAnimal: null,
    });
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
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        error: '',
        success: '',
        createdAnimal: null,
      });

      const createdAnimal = await postJson('/api/animals', buildAnimalPayload(formValues));
      const successMessage = `Животното „${createdAnimal.displayName ?? createdAnimal.name}“ е създадено успешно.`;

      setSubmitState({
        isSubmitting: false,
        error: '',
        success: successMessage,
        createdAnimal,
      });
      setFormErrors({});
      setFormValues(getInitialAnimalFormValues());
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        error: error.message,
        success: '',
        createdAnimal: null,
      });
    }
  }

  return (
    <main className="route-shell animal-form-shell">
      <div className="animal-form-back-row">
        <Link className="animals-secondary-action" to="/search">
          Към списъка с животни
        </Link>
      </div>

      <section className="animal-form-hero">
        <div>
                    <h1>Създаване на ново животно</h1>

        </div>

        <div className="animal-form-hero-note">
          <strong>Роля: {pageRoleLabel}</strong>
          <span>Достъп само за служители и администратори.</span>
        </div>
      </section>

      <section className="animal-form-card">
        <div className="animal-form-header">
          <div>
            <h2>Нови данни за животно</h2>

          </div>
        </div>

        {submitState.error ? <div className="auth-status auth-status-error">{submitState.error}</div> : null}
        {submitState.success ? (
          <div className="auth-status auth-status-info animal-form-success-box">
            <div>
              <strong>{submitState.success}</strong>
              <p>Записът е готов и може да бъде отворен веднага.</p>
            </div>
            <div className="animal-form-success-actions">
              <Link
                className="animals-primary-action"
                to={`/animals/${submitState.createdAnimal?.id}`}
                state={{
                  feedback: createSuccessFeedback(submitState.success),
                }}
              >
                Виж детайли
              </Link>
              <button type="button" className="animals-secondary-action" onClick={handleReset}>
                Нов запис
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
          submitLabel="Създай животно"
          resetLabel="Изчисти формата"
          isSubmitting={submitState.isSubmitting}
        />
      </section>
    </main>
  );
}







