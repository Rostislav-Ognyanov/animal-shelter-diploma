import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getAnimalStatusLabel } from '../../auth/roleUi.js';
import { AnimalImage } from '../../components/animals/AnimalImage.jsx';
import { AnimalStatusBadge } from '../../components/animals/AnimalStatusBadge.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { fetchJson, postJson } from '../../lib/api.js';
import { getAnimalDisplayName } from './adoptionUi.js';

const INITIAL_FORM_VALUES = {
  contactPhone: '',
  motivation: '',
};

function validateForm(values) {
  const errors = {};

  if (!values.contactPhone.trim()) {
    errors.contactPhone = 'Телефонът за връзка е задължителен.';
  }

  if (!values.motivation.trim()) {
    errors.motivation = 'Кратката мотивация е задължителна.';
  }

  return errors;
}

function buildUnavailableMessage(animal) {
  const statusLabel = getAnimalStatusLabel(animal?.status);

  switch (animal?.status) {
    case 'reserved':
      return 'Животното вече е резервирано и в момента не приема нови заявки.';
    case 'adopted':
      return 'Животното вече е осиновено и не може да бъде заявено отново.';
    case 'medical-care':
      return 'Животното е под медицинска грижа и временно е извадено от процеса по осиновяване.';
    case 'inactive':
    case 'archived':
      return `Животното е със статус „${statusLabel}“ и не участва в активните осиновявания.`;
    default:
      return `Животното е със статус „${statusLabel}“ и в момента не приема нова заявка.`;
  }
}

export function CreateAdoptionRequestPage() {
  const { animalId } = useParams();
  const { currentUser } = useAuth();
  const [animalState, setAnimalState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState({});
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
    createdRequest: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAnimal() {
      try {
        setAnimalState({
          item: null,
          isLoading: true,
          error: '',
        });

        const animal = await fetchJson(`/api/animals/${animalId}`);

        if (!isMounted) {
          return;
        }

        setAnimalState({
          item: animal,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAnimalState({
          item: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadAnimal();

    return () => {
      isMounted = false;
    };
  }, [animalId]);

  const animalName = useMemo(() => getAnimalDisplayName(animalState.item), [animalState.item]);
  const isAnimalAvailable = animalState.item?.status === 'available';

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAnimalAvailable || submitState.isSubmitting || submitState.createdRequest) {
      return;
    }

    const validationErrors = validateForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        error: 'Моля, попълни задължителните полета преди изпращане.',
        success: '',
      }));
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        error: '',
        success: '',
        createdRequest: null,
      });

      const createdRequest = await postJson('/api/adoptions', {
        animalId,
        contactPhone: formValues.contactPhone,
        motivation: formValues.motivation,
      });

      setSubmitState({
        isSubmitting: false,
        error: '',
        success: `Заявката за ${animalName} е изпратена успешно.`,
        createdRequest,
      });
      setFormErrors({});
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        error: error.message,
        success: '',
        createdRequest: null,
      });
    }
  }

  if (animalState.isLoading) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Зареждане на животното</h1>
          <p>Подготвяме формата за заявка за осиновяване.</p>
        </section>
      </main>
    );
  }

  if (animalState.error) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Формата не може да се зареди</h1>
          <p>{animalState.error}</p>
          <Link className="animals-secondary-action" to={`/animals/${animalId}`}>
            Към детайлите
          </Link>
        </section>
      </main>
    );
  }

  const animal = animalState.item;

  return (
    <main className="route-shell adoptions-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to={`/animals/${animalId}`}>
          Към детайлите на животното
        </Link>
        <Link className="animals-primary-action" to="/adoptions/my">
          Моите заявки
        </Link>
      </div>

      <section className="adoptions-hero">
        <div>
                    <h1>Заявка за осиновяване</h1>
          <p>
            Мотивация и телефон за връзка.
          </p>
        </div>

        <article className="adoptions-animal-summary">
          <AnimalImage src={animal.imageUrl} alt={animalName} />
          <div>
            <strong>{animalName}</strong>
            <span>{animal.speciesLabel || animal.species} • {animal.ageText} • {getAnimalStatusLabel(animal.status)}</span>
          </div>
        </article>
      </section>

      <section className="adoptions-card">
        {!isAnimalAvailable ? (
          <div className="adoptions-empty-state adoptions-empty-state-warning">
            <AnimalStatusBadge status={animal.status} statusLabel={getAnimalStatusLabel(animal.status)} />
            <h2>Това животно не приема нови заявки</h2>
            <p>{buildUnavailableMessage(animal)}</p>
            <Link className="animals-primary-action" to={`/animals/${animalId}`}>
              Върни се към детайлите
            </Link>
          </div>
        ) : null}

        {submitState.error ? <div className="auth-status auth-status-error">{submitState.error}</div> : null}
        {submitState.success ? (
          <div className="auth-status auth-status-info animal-form-success-box">
            <div>
              <strong>{submitState.success}</strong>
              <p>Проследи я в „Моите заявки“.</p>
            </div>
            <div className="animal-form-success-actions">
              <Link className="animals-primary-action" to="/adoptions/my">
                Виж моите заявки
              </Link>
              <Link className="animals-secondary-action" to={`/adoptions/${submitState.createdRequest?.id}`}>
                Детайли на заявката
              </Link>
            </div>
          </div>
        ) : null}

        <form className="adoption-form" onSubmit={handleSubmit}>
          <label>
            Телефон за връзка
            <input
              type="tel"
              value={formValues.contactPhone}
              placeholder="+359 888 123 456"
              disabled={!isAnimalAvailable || submitState.isSubmitting || Boolean(submitState.createdRequest)}
              onChange={(event) => handleFieldChange('contactPhone', event.target.value)}
            />
            {formErrors.contactPhone ? <span>{formErrors.contactPhone}</span> : null}
          </label>

          <label>
            Защо искаш да осиновиш {animalName}?
            <textarea
              value={formValues.motivation}
              placeholder={`Разкажи накратко за условията, грижата и мотивацията си за ${animalName}.`}
              disabled={!isAnimalAvailable || submitState.isSubmitting || Boolean(submitState.createdRequest)}
              onChange={(event) => handleFieldChange('motivation', event.target.value)}
            />
            {formErrors.motivation ? <span>{formErrors.motivation}</span> : null}
          </label>

          <div className="adoption-form-actions">
            <button
              type="submit"
              className="animals-primary-action"
              disabled={!isAnimalAvailable || submitState.isSubmitting || Boolean(submitState.createdRequest)}
            >
              {submitState.isSubmitting ? 'Изпращане...' : 'Изпрати заявка'}
            </button>
            <Link className="animals-secondary-action" to={`/animals/${animalId}`}>
              Отказ
            </Link>
          </div>
        </form>


      </section>
    </main>
  );
}



