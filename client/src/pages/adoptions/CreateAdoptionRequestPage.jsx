import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AnimalImage } from '../../components/animals/AnimalImage.jsx';
import { AnimalStatusBadge } from '../../components/animals/AnimalStatusBadge.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { fetchJson, postJson } from '../../lib/api.js';
import { focusErrorFeedback, focusFirstInvalidField } from '../../lib/formFocus.js';
import {
  canUseStandardAdoptionFlow,
  getAnimalStatusLabel,
  isProtectedCareSpecies,
} from '../animals/animalUi.js';
import { getAnimalDisplayName } from './adoptionUi.js';
import {
  ADOPTION_ANIMAL_ALLERGY_LABELS,
  ADOPTION_ANIMAL_LIVING_PLACE_LABELS,
  ADOPTION_HOUSING_TYPE_LABELS,
  ADOPTION_MAX_OTHER_PETS,
  ADOPTION_OTHER_PET_CARE_STATUS_LABELS,
  ADOPTION_OTHER_PET_SEX_LABELS,
  ADOPTION_OTHER_PET_SPECIES_LABELS,
  ADOPTION_TRANSPORT_LABELS,
  ADOPTION_YARD_SECURITY_LABELS,
  isValidAdoptionPhone,
} from '../../../../shared/domain/adoptionConstants.js';

function buildOptions(labels) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const HOUSING_TYPE_OPTIONS = buildOptions(ADOPTION_HOUSING_TYPE_LABELS);

const YARD_SECURITY_OPTIONS = buildOptions(ADOPTION_YARD_SECURITY_LABELS);
const ANIMAL_LIVING_PLACE_OPTIONS = buildOptions(ADOPTION_ANIMAL_LIVING_PLACE_LABELS);
const ANIMAL_ALLERGY_OPTIONS = buildOptions(ADOPTION_ANIMAL_ALLERGY_LABELS);
const OTHER_PET_SPECIES_OPTIONS = buildOptions(ADOPTION_OTHER_PET_SPECIES_LABELS);
const OTHER_PET_SEX_OPTIONS = buildOptions(ADOPTION_OTHER_PET_SEX_LABELS);
const OTHER_PET_CARE_STATUS_OPTIONS = buildOptions(ADOPTION_OTHER_PET_CARE_STATUS_LABELS);
const ANIMAL_TRANSPORT_OPTIONS = buildOptions(ADOPTION_TRANSPORT_LABELS);

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Не' },
];
const EMPTY_OTHER_PET = {
  species: '',
  otherSpecies: '',
  sex: '',
  neuteringStatus: '',
  vaccinationStatus: '',
  approximateAge: '',
};

const INITIAL_FORM_VALUES = {
  contactPhone: '',
  housingType: '',
  housingTypeOther: '',
  hasYard: '',
  yardSecurity: '',
  animalLivingPlace: '',
  animalLivingPlaceOther: '',
  householdMembersCount: '',
  hasAnimalAllergies: '',
  hasOtherPets: '',
  otherPets: [],
  hasPreviousPetExperience: '',
  previousPetExperienceDetails: '',
  adoptionMotivation: '',
  acceptsUnexpectedMedicalCosts: '',
  animalTransport: '',
};

function RequiredLabel({ children }) {
  return (
    <span className="volunteer-field-label">
      {children}
      <span className="volunteer-required-marker" aria-hidden="true" title="Задължително поле">
        *
      </span>
    </span>
  );
}

function getTrimmedValue(value) {
  return String(value ?? '').trim();
}

function createClientId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyOtherPet() {
  return {
    clientId: createClientId(),
    ...EMPTY_OTHER_PET,
  };
}

function canUseSecuredYardLivingPlace(values) {
  // A secured yard is valid only when the applicant has confirmed a house with a secured yard.
  return (
    values.housingType === 'house' &&
    values.hasYard === 'yes' &&
    values.yardSecurity === 'secured'
  );
}

function setNestedError(errors, index, field, message) {
  errors[`otherPets.${index}.${field}`] = message;
}

function validateForm(values) {
  const errors = {};
  const motivation = getTrimmedValue(values.adoptionMotivation);
  const householdMembersCount = Number(values.householdMembersCount);
  const contactPhone = getTrimmedValue(values.contactPhone);

  if (!contactPhone) {
    errors.contactPhone = 'Телефонът за връзка е задължителен.';
  } else if (!isValidAdoptionPhone(contactPhone)) {
    errors.contactPhone = 'Въведи валиден телефонен номер.';
  }

  if (!values.housingType) {
    errors.housingType = 'Избери тип жилище.';
  }

  if (values.housingType === 'other' && !getTrimmedValue(values.housingTypeOther)) {
    errors.housingTypeOther = 'Опиши накратко типа жилище.';
  }

  if (values.housingType === 'house' && !values.hasYard) {
    errors.hasYard = 'Посочи дали къщата има двор.';
  }

  if (values.housingType === 'house' && values.hasYard === 'yes' && !values.yardSecurity) {
    errors.yardSecurity = 'Посочи дали дворът е обезопасен.';
  }

  if (!values.animalLivingPlace) {
    errors.animalLivingPlace = 'Посочи къде ще живее животното.';
  } else if (values.animalLivingPlace === 'secured-yard' && !canUseSecuredYardLivingPlace(values)) {
    errors.animalLivingPlace =
      'Обезопасен двор може да бъде избран само при къща с потвърден обезопасен двор.';
  }

  if (values.animalLivingPlace === 'other' && !getTrimmedValue(values.animalLivingPlaceOther)) {
    errors.animalLivingPlaceOther = 'Опиши накратко къде ще живее животното.';
  }

  if (
    !Number.isInteger(householdMembersCount) ||
    householdMembersCount < 1 ||
    householdMembersCount > 20
  ) {
    errors.householdMembersCount = 'Въведи цяло число между 1 и 20.';
  }

  if (!values.hasAnimalAllergies) {
    errors.hasAnimalAllergies = 'Посочи дали има алергии към животни.';
  }

  if (!values.hasOtherPets) {
    errors.hasOtherPets = 'Посочи дали в дома има други животни.';
  }

  if (values.hasOtherPets === 'yes') {
    if (!Array.isArray(values.otherPets) || values.otherPets.length === 0) {
      errors.otherPets = 'Добави поне едно животно.';
    } else if (values.otherPets.length > ADOPTION_MAX_OTHER_PETS) {
      errors.otherPets = `Могат да бъдат добавени най-много ${ADOPTION_MAX_OTHER_PETS} животни.`;
    } else {
      values.otherPets.forEach((pet, index) => {
        if (!pet.species) {
          setNestedError(errors, index, 'species', 'Избери вид.');
        }

        if (pet.species === 'other' && !getTrimmedValue(pet.otherSpecies)) {
          setNestedError(errors, index, 'otherSpecies', 'Опиши вида.');
        }

        if (!pet.sex) {
          setNestedError(errors, index, 'sex', 'Избери пол.');
        }

        if (!pet.neuteringStatus) {
          setNestedError(errors, index, 'neuteringStatus', 'Посочи кастрация.');
        }

        if (!pet.vaccinationStatus) {
          setNestedError(errors, index, 'vaccinationStatus', 'Посочи ваксинации.');
        }
      });
    }
  }

  if (!values.hasPreviousPetExperience) {
    errors.hasPreviousPetExperience = 'Посочи дали имаш предишен опит.';
  }

  if (getTrimmedValue(values.previousPetExperienceDetails).length > 1000) {
    errors.previousPetExperienceDetails = 'Текстът може да бъде до 1000 символа.';
  }

  if (!motivation) {
    errors.adoptionMotivation = 'Мотивацията е задължителна.';
  } else if (motivation.length < 20) {
    errors.adoptionMotivation = 'Опиши мотивацията с поне 20 символа.';
  } else if (motivation.length > 1500) {
    errors.adoptionMotivation = 'Мотивацията може да бъде до 1500 символа.';
  }

  if (!values.acceptsUnexpectedMedicalCosts) {
    errors.acceptsUnexpectedMedicalCosts =
      'Посочи дали си готов за непредвидени ветеринарномедицински разходи.';
  }

  if (!values.animalTransport) {
    errors.animalTransport = 'Избери как ще бъде осигурен транспортът.';
  }

  return errors;
}

function buildAdoptionRequestPayload(values, animalId) {
  const hasOtherPets = values.hasOtherPets === 'yes';
  const hasPreviousPetExperience = values.hasPreviousPetExperience === 'yes';
  const hasYard = values.housingType === 'house' ? values.hasYard === 'yes' : null;
  const motivation = getTrimmedValue(values.adoptionMotivation);

  return {
    animalId,
    contactPhone: getTrimmedValue(values.contactPhone),
    housingType: values.housingType,
    housingTypeOther: values.housingType === 'other' ? getTrimmedValue(values.housingTypeOther) : '',
    hasYard,
    yardSecurity: values.housingType === 'house' && hasYard ? values.yardSecurity : null,
    animalLivingPlace: values.animalLivingPlace,
    animalLivingPlaceOther:
      values.animalLivingPlace === 'other' ? getTrimmedValue(values.animalLivingPlaceOther) : '',
    householdMembersCount: Number(values.householdMembersCount),
    hasAnimalAllergies: values.hasAnimalAllergies,
    hasOtherPets,
    otherPets: hasOtherPets
      ? values.otherPets.map((pet) => ({
          species: pet.species,
          otherSpecies: pet.species === 'other' ? getTrimmedValue(pet.otherSpecies) : '',
          sex: pet.sex,
          neuteringStatus: pet.neuteringStatus,
          vaccinationStatus: pet.vaccinationStatus,
          approximateAge: getTrimmedValue(pet.approximateAge),
        }))
      : [],
    hasPreviousPetExperience,
    previousPetExperienceDetails: hasPreviousPetExperience
      ? getTrimmedValue(values.previousPetExperienceDetails)
      : '',
    motivation,
    acceptsUnexpectedMedicalCosts: values.acceptsUnexpectedMedicalCosts === 'yes',
    animalTransport: values.animalTransport,
  };
}

function buildUnavailableMessage(animal) {
  const statusLabel = getAnimalStatusLabel(animal?.status);

  if (isProtectedCareSpecies(animal?.species) || animal?.status === 'protected-care') {
    return 'Това животно е част от защитена или специализирана грижа и не приема стандартни заявки за осиновяване.';
  }

  switch (animal?.status) {
    case 'reserved':
      return 'Животното вече е резервирано и в момента не приема нови заявки.';
    case 'adopted':
      return 'Животното вече е осиновено и не може да бъде заявено отново.';
    case 'medical-care':
      return 'Животното е под медицинска грижа и временно е извадено от процеса по осиновяване.';
    case 'under-care':
      return 'Животното е под грижа на приюта и в момента не участва в стандартния процес по осиновяване.';
    case 'released':
      return 'Животното е върнато в природата и не може да бъде заявено за осиновяване.';
    case 'inactive':
    case 'archived':
      return `Животното е със статус „${statusLabel}“ и не участва в активните осиновявания.`;
    default:
      return `Животното е със статус „${statusLabel}“ и в момента не приема нова заявка.`;
  }
}

function FieldError({ error }) {
  return error ? <span className="volunteer-field-error">{error}</span> : null;
}

function SelectPlaceholder({ children = 'Избери' }) {
  return <option value="" disabled>{children}</option>;
}

export function CreateAdoptionRequestPage() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const errorFeedbackRef = useRef(null);
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
  const isAnimalAvailable = canUseStandardAdoptionFlow(animalState.item);
  const isFormLocked = submitState.isSubmitting;
  const availableLivingPlaceOptions = useMemo(
    () =>
      ANIMAL_LIVING_PLACE_OPTIONS.filter(
        (option) => option.value !== 'secured-yard' || canUseSecuredYardLivingPlace(formValues)
      ),
    [formValues.housingType, formValues.hasYard, formValues.yardSecurity]
  );

  function getFieldA11yProps(fieldName, isRequired = true) {
    return {
      ...(isRequired ? { required: true, 'aria-required': 'true' } : {}),
      'aria-invalid': Boolean(formErrors[fieldName]),
    };
  }

  function clearFieldErrors(fields) {
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      fields.forEach((field) => {
        delete nextErrors[field];
      });
      return nextErrors;
    });
  }

  function clearOtherPetErrors(index = null) {
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      Object.keys(nextErrors).forEach((field) => {
        if (field === 'otherPets' || field.startsWith(index === null ? 'otherPets.' : `otherPets.${index}.`)) {
          delete nextErrors[field];
        }
      });
      return nextErrors;
    });
  }

  function handleFieldChange(field, value) {
    setFormValues((currentValue) => {
      const nextValue = {
        ...currentValue,
        [field]: value,
      };

      // Clear hidden conditional fields immediately so stale values are not submitted.
      if (field === 'housingType') {
        nextValue.housingTypeOther = '';
        nextValue.hasYard = '';
        nextValue.yardSecurity = '';
      }

      if (field === 'hasYard' && value !== 'yes') {
        nextValue.yardSecurity = '';
      }

      if (field === 'animalLivingPlace') {
        nextValue.animalLivingPlaceOther = '';
      }

      if (field === 'hasOtherPets') {
        nextValue.otherPets = value === 'yes' ? [createEmptyOtherPet()] : [];
      }

      if (field === 'hasPreviousPetExperience' && value !== 'yes') {
        nextValue.previousPetExperienceDetails = '';
      }

      if (nextValue.animalLivingPlace === 'secured-yard' && !canUseSecuredYardLivingPlace(nextValue)) {
        nextValue.animalLivingPlace = '';
      }

      return nextValue;
    });

    clearFieldErrors([
      field,
      'housingTypeOther',
      'hasYard',
      'yardSecurity',
      'animalLivingPlace',
      'animalLivingPlaceOther',
      'previousPetExperienceDetails',
    ]);

    if (field === 'hasOtherPets') {
      clearOtherPetErrors();
    }
  }

  function handleOtherPetChange(index, field, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      otherPets: currentValue.otherPets.map((pet, petIndex) => {
        if (petIndex !== index) {
          return pet;
        }

        return {
          ...pet,
          [field]: value,
          ...(field === 'species' && value !== 'other' ? { otherSpecies: '' } : {}),
        };
      }),
    }));

    clearOtherPetErrors(index);
  }

  function handleAddOtherPet() {
    setFormValues((currentValue) => ({
      ...currentValue,
      otherPets:
        currentValue.otherPets.length >= ADOPTION_MAX_OTHER_PETS
          ? currentValue.otherPets
          : [...currentValue.otherPets, createEmptyOtherPet()],
    }));
    clearOtherPetErrors();
  }

  function handleRemoveOtherPet(index) {
    setFormValues((currentValue) => ({
      ...currentValue,
      otherPets: currentValue.otherPets.filter((_, petIndex) => petIndex !== index),
    }));
    clearOtherPetErrors();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAnimalAvailable || submitState.isSubmitting) {
      return;
    }

    const validationErrors = validateForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        error: 'Моля, попълни задължителните полета преди изпращане.',
      }));
      focusFirstInvalidField(event.currentTarget, validationErrors);
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        error: '',
      });

      const createdRequest = await postJson(
        '/api/adoptions',
        buildAdoptionRequestPayload(formValues, animalId)
      );

      navigate('/adoptions/my', {
        replace: true,
        state: {
          adoptionCreated: {
            requestId: createdRequest.id,
            animalName,
          },
        },
      });
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        error: error.message,
      });
      focusErrorFeedback(errorFeedbackRef);
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
          <Link className="app-secondary-action" to={`/animals/${animalId}`}>
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
        <Link className="app-secondary-action" to={`/animals/${animalId}`}>
          Към детайлите на животното
        </Link>
        {currentUser ? (
          <Link className="app-primary-action" to="/adoptions/my">
            Моите заявки
          </Link>
        ) : null}
      </div>

      <section className="adoptions-hero">
        <div>
          <h1>Заявка за осиновяване</h1>
          <p>
            Попълни информация за дома, опита и готовността си за грижа. Така екипът на приюта
            може да прецени дали условията са подходящи за {animalName}.
          </p>
        </div>

        <article className="adoptions-animal-summary">
          <AnimalImage src={animal.imageUrl} species={animal.species} alt={animalName} />
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
            <Link className="app-primary-action" to={`/animals/${animalId}`}>
              Върни се към детайлите
            </Link>
          </div>
        ) : null}

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
        {isAnimalAvailable ? (
          <form className="adoption-form" noValidate onSubmit={handleSubmit}>
            <section className="adoption-form-section">
              <div className="adoption-form-section-heading">
                <h2>Жилищни условия</h2>
                <p>Разкажи къде ще живее животното и дали средата е достатъчно спокойна и сигурна.</p>
              </div>

              <div className="adoption-form-grid">
                <label>
                  <RequiredLabel>Тип жилище</RequiredLabel>
                  <select
                    value={formValues.housingType}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('housingType')}
                    onChange={(event) => handleFieldChange('housingType', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {HOUSING_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.housingType} />
                </label>

                {formValues.housingType === 'other' ? (
                  <label>
                    <RequiredLabel>Опиши жилището</RequiredLabel>
                    <input
                      type="text"
                      value={formValues.housingTypeOther}
                      maxLength={120}
                      disabled={isFormLocked}
                      {...getFieldA11yProps('housingTypeOther')}
                      onChange={(event) => handleFieldChange('housingTypeOther', event.target.value)}
                    />
                    <FieldError error={formErrors.housingTypeOther} />
                  </label>
                ) : null}

                {formValues.housingType === 'house' ? (
                  <label>
                    <RequiredLabel>Има ли двор?</RequiredLabel>
                    <select
                      value={formValues.hasYard}
                      disabled={isFormLocked}
                      {...getFieldA11yProps('hasYard')}
                      onChange={(event) => handleFieldChange('hasYard', event.target.value)}
                    >
                      <SelectPlaceholder />
                      {YES_NO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FieldError error={formErrors.hasYard} />
                  </label>
                ) : null}

                {formValues.housingType === 'house' && formValues.hasYard === 'yes' ? (
                  <label>
                    <RequiredLabel>Обезопасен ли е дворът?</RequiredLabel>
                    <select
                      value={formValues.yardSecurity}
                      disabled={isFormLocked}
                      {...getFieldA11yProps('yardSecurity')}
                      onChange={(event) => handleFieldChange('yardSecurity', event.target.value)}
                    >
                      <SelectPlaceholder />
                      {YARD_SECURITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FieldError error={formErrors.yardSecurity} />
                  </label>
                ) : null}

                <label>
                  <RequiredLabel>Къде ще живее животното?</RequiredLabel>
                  <select
                    value={formValues.animalLivingPlace}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('animalLivingPlace')}
                    onChange={(event) => handleFieldChange('animalLivingPlace', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {availableLivingPlaceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.animalLivingPlace} />
                </label>

                {formValues.animalLivingPlace === 'other' ? (
                  <label>
                    <RequiredLabel>Опиши мястото</RequiredLabel>
                    <input
                      type="text"
                      value={formValues.animalLivingPlaceOther}
                      maxLength={160}
                      disabled={isFormLocked}
                      {...getFieldA11yProps('animalLivingPlaceOther')}
                      onChange={(event) => handleFieldChange('animalLivingPlaceOther', event.target.value)}
                    />
                    <FieldError error={formErrors.animalLivingPlaceOther} />
                  </label>
                ) : null}
              </div>
            </section>

            <section className="adoption-form-section">
              <div className="adoption-form-section-heading">
                <h2>Домакинство</h2>
                <p>Тази информация помага да се прецени ежедневната среда и съвместимостта с други животни.</p>
              </div>

              <div className="adoption-form-grid">
                <label>
                  <RequiredLabel>Колко души живеят постоянно в домакинството?</RequiredLabel>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formValues.householdMembersCount}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('householdMembersCount')}
                    onChange={(event) => handleFieldChange('householdMembersCount', event.target.value)}
                  />
                  <FieldError error={formErrors.householdMembersCount} />
                </label>

                <label>
                  <RequiredLabel>Има ли човек с алергии към животни?</RequiredLabel>
                  <select
                    value={formValues.hasAnimalAllergies}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('hasAnimalAllergies')}
                    onChange={(event) => handleFieldChange('hasAnimalAllergies', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {ANIMAL_ALLERGY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.hasAnimalAllergies} />
                </label>

                <label>
                  <RequiredLabel>Има ли други животни в дома?</RequiredLabel>
                  <select
                    value={formValues.hasOtherPets}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('hasOtherPets')}
                    onChange={(event) => handleFieldChange('hasOtherPets', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {YES_NO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.hasOtherPets} />
                </label>
              </div>

              {formValues.hasOtherPets === 'yes' ? (
                <div className="adoption-other-pets-list">
                  <div className="adoption-form-section-heading">
                    <h3>Други животни</h3>
                    <p>Добави всяко животно поотделно, за да може екипът да прецени адаптацията.</p>
                  </div>
                  <FieldError error={formErrors.otherPets} />

                  {formValues.otherPets.map((pet, index) => (
                    <article key={pet.clientId} className="adoption-other-pet-card">
                      <div className="adoption-other-pet-heading">
                        <h4>Животно {index + 1}</h4>
                        {formValues.otherPets.length > 1 ? (
                          <button
                            type="button"
                            className="app-secondary-action"
                            disabled={isFormLocked}
                            onClick={() => handleRemoveOtherPet(index)}
                          >
                            Премахни
                          </button>
                        ) : null}
                      </div>

                      <div className="adoption-form-grid adoption-form-grid-compact">
                        <label>
                          <RequiredLabel>Вид</RequiredLabel>
                          <select
                            value={pet.species}
                            disabled={isFormLocked}
                            {...getFieldA11yProps(`otherPets.${index}.species`)}
                            onChange={(event) => handleOtherPetChange(index, 'species', event.target.value)}
                          >
                            <SelectPlaceholder />
                            {OTHER_PET_SPECIES_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError error={formErrors[`otherPets.${index}.species`]} />
                        </label>

                        {pet.species === 'other' ? (
                          <label>
                            <RequiredLabel>Опиши вида</RequiredLabel>
                            <input
                              type="text"
                              value={pet.otherSpecies}
                              maxLength={120}
                              disabled={isFormLocked}
                              {...getFieldA11yProps(`otherPets.${index}.otherSpecies`)}
                              onChange={(event) => handleOtherPetChange(index, 'otherSpecies', event.target.value)}
                            />
                            <FieldError error={formErrors[`otherPets.${index}.otherSpecies`]} />
                          </label>
                        ) : null}

                        <label>
                          <RequiredLabel>Пол</RequiredLabel>
                          <select
                            value={pet.sex}
                            disabled={isFormLocked}
                            {...getFieldA11yProps(`otherPets.${index}.sex`)}
                            onChange={(event) => handleOtherPetChange(index, 'sex', event.target.value)}
                          >
                            <SelectPlaceholder />
                            {OTHER_PET_SEX_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError error={formErrors[`otherPets.${index}.sex`]} />
                        </label>

                        <label>
                          <RequiredLabel>Кастрация</RequiredLabel>
                          <select
                            value={pet.neuteringStatus}
                            disabled={isFormLocked}
                            {...getFieldA11yProps(`otherPets.${index}.neuteringStatus`)}
                            onChange={(event) =>
                              handleOtherPetChange(index, 'neuteringStatus', event.target.value)
                            }
                          >
                            <SelectPlaceholder />
                            {OTHER_PET_CARE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError error={formErrors[`otherPets.${index}.neuteringStatus`]} />
                        </label>

                        <label>
                          <RequiredLabel>Ваксинации</RequiredLabel>
                          <select
                            value={pet.vaccinationStatus}
                            disabled={isFormLocked}
                            {...getFieldA11yProps(`otherPets.${index}.vaccinationStatus`)}
                            onChange={(event) =>
                              handleOtherPetChange(index, 'vaccinationStatus', event.target.value)
                            }
                          >
                            <SelectPlaceholder />
                            {OTHER_PET_CARE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError error={formErrors[`otherPets.${index}.vaccinationStatus`]} />
                        </label>

                        <label>
                          <span>Приблизителна възраст (по желание)</span>
                          <input
                            type="text"
                            value={pet.approximateAge}
                            maxLength={120}
                            placeholder="Напр. 4 години"
                            disabled={isFormLocked}
                            {...getFieldA11yProps(`otherPets.${index}.approximateAge`, false)}
                            onChange={(event) => handleOtherPetChange(index, 'approximateAge', event.target.value)}
                          />
                        </label>
                      </div>
                    </article>
                  ))}

                  <button
                    type="button"
                    className="app-secondary-action adoption-form-add-button"
                    disabled={isFormLocked || formValues.otherPets.length >= ADOPTION_MAX_OTHER_PETS}
                    onClick={handleAddOtherPet}
                  >
                    Добави друго животно
                  </button>
                </div>
              ) : null}
            </section>

            <section className="adoption-form-section">
              <div className="adoption-form-section-heading">
                <h2>Опит и мотивация</h2>
                <p>Опиши досегашния си опит и защо точно това животно е подходящият избор за теб.</p>
              </div>

              <div className="adoption-form-grid">
                <label>
                  <RequiredLabel>Имаш ли предишен опит с отглеждане на домашно животно?</RequiredLabel>
                  <select
                    value={formValues.hasPreviousPetExperience}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('hasPreviousPetExperience')}
                    onChange={(event) => handleFieldChange('hasPreviousPetExperience', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {YES_NO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.hasPreviousPetExperience} />
                </label>

                {formValues.hasPreviousPetExperience === 'yes' ? (
                  <label className="adoption-form-full">
                    <span>Опиши накратко предишния си опит (по желание)</span>
                    <textarea
                      className="adoption-form-small-textarea"
                      value={formValues.previousPetExperienceDetails}
                      maxLength={1000}
                      placeholder="По желание посочи вида на животното и продължителността на грижите."
                      disabled={isFormLocked}
                      {...getFieldA11yProps('previousPetExperienceDetails', false)}
                      onChange={(event) => handleFieldChange('previousPetExperienceDetails', event.target.value)}
                    />
                    <FieldError error={formErrors.previousPetExperienceDetails} />
                  </label>
                ) : null}

                <label className="adoption-form-full">
                  <RequiredLabel>Защо желаеш да осиновиш точно това животно?</RequiredLabel>
                  <textarea
                    value={formValues.adoptionMotivation}
                    maxLength={1500}
                    placeholder={`Опиши какво те привлече към ${animalName}, какви грижи можеш да осигуриш и как си представяш адаптацията му у дома.`}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('adoptionMotivation')}
                    onChange={(event) => handleFieldChange('adoptionMotivation', event.target.value)}
                  />
                  <small className="adoption-form-helper">
                    Опиши какво те привлече към животното и какви условия можеш да му осигуриш.
                  </small>
                  <FieldError error={formErrors.adoptionMotivation} />
                </label>
              </div>
            </section>

            <section className="adoption-form-section">
              <div className="adoption-form-section-heading">
                <h2>Готовност за осиновяване</h2>
                <p>Последните въпроси помагат да се планират следващите стъпки след прегледа на заявката.</p>
              </div>

              <div className="adoption-form-grid">
                <label>
                  <RequiredLabel>Имаш ли готовност за непредвидени ветеринарномедицински разходи?</RequiredLabel>
                  <select
                    value={formValues.acceptsUnexpectedMedicalCosts}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('acceptsUnexpectedMedicalCosts')}
                    onChange={(event) =>
                      handleFieldChange('acceptsUnexpectedMedicalCosts', event.target.value)
                    }
                  >
                    <SelectPlaceholder />
                    {YES_NO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="adoption-form-helper">
                    Отговор „Не“ не блокира заявката, но помага на екипа да даде по-точна насока при прегледа.
                  </small>
                  <FieldError error={formErrors.acceptsUnexpectedMedicalCosts} />
                </label>

                <label>
                  <RequiredLabel>Как ще бъде осигурен транспортът на животното?</RequiredLabel>
                  <select
                    value={formValues.animalTransport}
                    disabled={isFormLocked}
                    {...getFieldA11yProps('animalTransport')}
                    onChange={(event) => handleFieldChange('animalTransport', event.target.value)}
                  >
                    <SelectPlaceholder />
                    {ANIMAL_TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError error={formErrors.animalTransport} />
                </label>

                <label className="adoption-form-full">
                  <RequiredLabel>Телефон за връзка</RequiredLabel>
                  <input
                    type="tel"
                    value={formValues.contactPhone}
                    placeholder="+359 888 123 456"
                    maxLength={32}
                    autoComplete="tel"
                    disabled={isFormLocked}
                    {...getFieldA11yProps('contactPhone')}
                    onChange={(event) => handleFieldChange('contactPhone', event.target.value)}
                  />
                  <FieldError error={formErrors.contactPhone} />
                </label>
              </div>
            </section>

            <div className="adoption-form-actions">
              <button
                type="submit"
                className="app-primary-action"
                disabled={isFormLocked}
              >
                {submitState.isSubmitting ? 'Изпращане...' : 'Изпрати заявка'}
              </button>
              <Link className="app-secondary-action" to={`/animals/${animalId}`}>
                Отказ
              </Link>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}


