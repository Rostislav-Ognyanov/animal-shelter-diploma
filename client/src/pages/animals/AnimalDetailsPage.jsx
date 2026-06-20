import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  canManageAnimals,
  getAvailableStatusTransitions,
  getAnimalStatusLabel,
} from '../../auth/roleUi.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { AnimalDetailsSkeleton } from '../../components/animals/AnimalDetailsSkeleton.jsx';
import { AnimalImage } from '../../components/animals/AnimalImage.jsx';
import { AnimalNotFoundState } from '../../components/animals/AnimalNotFoundState.jsx';
import { AnimalStatusBadge } from '../../components/animals/AnimalStatusBadge.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FavoriteToggleButton } from '../../components/animals/FavoriteToggleButton.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import { canUseStandardAdoptionFlow, isProtectedCareSpecies } from './animalUi.js';

const ACTION_LABELS = {
  list: 'Преглед на списък',
  detail: 'Детайлен преглед',
  'filter-search': 'Търсене и филтри',
  create: 'Създаване',
  edit: 'Редакция',
  'change-status': 'Смяна на статус',
  'view-all': 'Пълен преглед',
  deactivate: 'Деактивиране',
  archive: 'Архивиране',
  'full-access': 'Пълен достъп',
};

function formatDate(value) {
  if (!value) {
    return 'Няма данни';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildUnavailableClientMessage(animal) {
  const statusLabel = animal.statusLabel ?? getAnimalStatusLabel(animal.status);

  if (isProtectedCareSpecies(animal.species) || animal.status === 'protected-care') {
    return 'Животното е част от защитена или специализирана грижа и не приема стандартна заявка за осиновяване. Можете да се свържете с екипа, ако искате да помогнете или да получите повече информация.';
  }

  if (animal.status === 'under-care') {
    return 'Животното е под грижа на приюта и в момента не участва в стандартния процес по осиновяване.';
  }

  if (animal.status === 'released') {
    return 'Животното е върнато в природата и профилът му остава като част от дейността и спасителната работа на приюта.';
  }

  if (animal.status === 'reserved') {
    return `Животното вече е резервирано и в момента не приема нови заявки за осиновяване.`;
  }

  if (animal.status === 'adopted') {
    return 'Животното вече е осиновено и не е достъпно за нова заявка.';
  }

  if (animal.status === 'medical-care') {
    return 'Животното е под медицинска грижа и временно не може да бъде заявено за осиновяване.';
  }

  if (animal.status === 'inactive' || animal.status === 'archived') {
    return `Животното е със статус „${statusLabel}“ и не е активно за нови заявки.`;
  }

  return `Животното е със статус „${statusLabel}“ и в момента не може да приеме нова заявка.`;
}

function usesSpecialCareFlow(animal) {
  return (
    isProtectedCareSpecies(animal.species) ||
    ['under-care', 'protected-care', 'released'].includes(animal.status)
  );
}

function buildActionConfig(role, animal) {
  const isStandardAdoptionCandidate = canUseStandardAdoptionFlow(animal);
  const isSpecialCareAnimal = usesSpecialCareFlow(animal);

  if (role === 'guest') {
    if (!isStandardAdoptionCandidate) {
      return isSpecialCareAnimal
        ? {
            label: 'Свържи се с нас',
            to: '/svurji-se-s-nas',
            helper: buildUnavailableClientMessage(animal),
          }
        : {
            label: 'В момента няма налично действие',
            helper: buildUnavailableClientMessage(animal),
            disabled: true,
          };
    }

    return {
      label: 'Влез в профила си',
      to: '/login',
      helper:
        'За да подадеш заявка за осиновяване, влез в профила си или създай нов клиентски профил.',
      secondaryLabel: 'Регистрация',
      secondaryTo: '/register',
    };
  }

  if (role === 'client') {
    if (isStandardAdoptionCandidate) {
      return {
        label: 'Подай заявка за осиновяване',
        to: `/animals/${animal.id}/adopt`,
        helper:
          'Ако смятате, че можете да осигурите подходящ дом, подайте заявка за осиновяване. Екипът на приюта ще я прегледа и ще се свърже с вас при нужда от допълнителна информация.',
      };
    }

    return isSpecialCareAnimal
      ? {
          label: 'Свържи се с нас',
          to: '/svurji-se-s-nas',
          helper: buildUnavailableClientMessage(animal),
        }
      : {
          label: 'В момента няма налично действие',
          helper: buildUnavailableClientMessage(animal),
          disabled: true,
        };
  }

  if (canManageAnimals(role)) {
    return {
      label: 'Редактирай животното',
      to: `/animals/${animal.id}/edit`,
      helper: 'Можеш да промениш основните данни, медицинската информация и статуса на този запис.',
    };
  }

  return null;
}

function buildConfirmConfig(nextStatus, animalName) {
  if (nextStatus === 'inactive') {
    return {
      nextStatus,
      title: 'Деактивиране на животно',
      description: `Сигурен ли си, че искаш да деактивираш „${animalName}“? Записът ще остане в системата, но няма да участва в активните процеси.`,
      confirmLabel: 'Деактивирай',
      tone: 'danger',
    };
  }

  return {
    nextStatus,
    title: 'Архивиране на животно',
    description: `Сигурен ли си, че искаш да архивираш „${animalName}“? Записът ще остане в системата, но ще бъде скрит от активните операции.`,
    confirmLabel: 'Архивирай',
    tone: 'danger',
  };
}

const NON_STANDARD_NEUTER_SPECIES = new Set(['fox', 'hedgehog', 'lizard', 'owl']);
const SPECIAL_CARE_SPECIES = new Set(['fox', 'hedgehog', 'lizard', 'owl']);
const EMPTY_HEALTH_NOTE = 'няма въведени специфични медицински бележки';

function hasGenericHealthStatus(healthStatus) {
  return String(healthStatus ?? '').trim().toLowerCase().includes(EMPTY_HEALTH_NOTE);
}

function buildGeneralHealthItem(animal) {
  const healthStatus = String(animal.healthStatus ?? '').trim();

  if (animal.status === 'medical-care') {
    return {
      label: 'Общо здравословно състояние',
      value: 'Нуждае се от наблюдение',
      description:
        'Животното е под медицинска грижа и е добре състоянието му да се следи внимателно от екипа.',
    };
  }

  if (!healthStatus || hasGenericHealthStatus(healthStatus)) {
    return {
      label: 'Общо здравословно състояние',
      value: 'Стабилно',
      description:
        'Животното е в стабилно състояние и към момента няма отбелязани специфични здравословни проблеми.',
    };
  }

  return {
    label: 'Общо здравословно състояние',
    value: healthStatus,
    description:
      'Това е текущата здравна бележка, въведена от екипа на приюта при прегледа на животното.',
  };
}

function buildVaccinationItem(animal) {
  if (animal.vaccinated) {
    return {
      label: 'Ваксинации',
      value: 'Поставени',
      description: 'Поставени са основни ваксини според наличната информация в системата.',
    };
  }

  return {
    label: 'Ваксинации',
    value: 'Няма данни',
    description:
      'В системата няма отбелязани поставени ваксини. Екипът може да даде повече информация при интерес.',
  };
}

function buildNeuteredItem(animal) {
  if (NON_STANDARD_NEUTER_SPECIES.has(animal.species)) {
    return {
      label: 'Кастрация',
      value: 'Не е приложимо',
      description:
        'За този вид това поле не е водеща част от стандартната грижа и се преценява според конкретния случай.',
    };
  }

  if (animal.neutered) {
    return {
      label: 'Кастрация',
      value: 'Да',
      description: 'Животното е кастрирано, което е важна част от отговорната дългосрочна грижа.',
    };
  }

  return {
    label: 'Кастрация',
    value: 'Не',
    description:
      'Към момента няма отбелязана кастрация. При осиновяване е добре това да се обсъди с екипа на приюта.',
  };
}

function buildSpecialCareItem(animal) {
  const combinedText = [
    animal.description,
    animal.story,
    animal.historyAndCharacter,
    animal.details,
    animal.careConditions,
    animal.healthStatus,
  ]
    .join(' ')
    .toLowerCase();

  if (SPECIAL_CARE_SPECIES.has(animal.species)) {
    return {
      label: 'Специални грижи',
      value: 'Нуждае се от наблюдение',
      description:
        'Видът изисква по-внимателен подход, спокойна среда и наблюдение от хора с подходяща подготовка.',
    };
  }

  if (/(адаптац|стрес|спокой|тишин|наблюден)/i.test(combinedText)) {
    return {
      label: 'Специални грижи',
      value: 'Нуждае се от по-спокойна адаптация',
      description:
        'Добре е преминаването към нов дом да бъде плавно, с търпение, рутина и достатъчно спокойствие.',
    };
  }

  return {
    label: 'Специални грижи',
    value: 'Няма отбелязани специални грижи',
    description:
      'Към момента няма допълнителни специални указания извън редовната ежедневна грижа.',
  };
}

function buildHealthCareItems(animal) {
  if (Array.isArray(animal.healthCareItems)) {
    const storedHealthCareItems = animal.healthCareItems.filter(
      (item) => item?.label && item?.value && item?.description
    );

    if (storedHealthCareItems.length > 0) {
      return storedHealthCareItems;
    }
  }

  return [
    buildGeneralHealthItem(animal),
    buildVaccinationItem(animal),
    buildNeuteredItem(animal),
    buildSpecialCareItem(animal),
  ];
}

function parseAnimalTextParts(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  let paragraphLines = [];
  let listItems = [];

  function flushParagraph() {
    const paragraphText = paragraphLines.join(' ').trim();

    if (paragraphText) {
      parts.push({
        type: 'paragraph',
        text: paragraphText,
      });
    }

    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length > 0) {
      parts.push({
        type: 'list',
        items: listItems,
      });
    }

    listItems = [];
  }

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      return;
    }

    if (trimmedLine.endsWith(':') && trimmedLine.indexOf(':') === trimmedLine.length - 1) {
      flushParagraph();
      flushList();
      parts.push({
        type: 'heading',
        text: trimmedLine.slice(0, -1),
      });
      return;
    }

    const keyValueMatch = trimmedLine.match(/^([^:]{1,72}):\s*(.+)$/);

    if (keyValueMatch) {
      flushParagraph();
      listItems.push({
        label: keyValueMatch[1].trim(),
        value: keyValueMatch[2].trim(),
      });
      return;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  flushList();

  return parts;
}

function FormattedAnimalText({ text, className = '' }) {
  const parts = parseAnimalTextParts(text);

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {parts.map((part, index) => {
        const key = `${part.type}-${index}`;

        if (part.type === 'heading') {
          return (
            <p key={key} className="animal-details-text-heading">
              {part.text}
            </p>
          );
        }

        if (part.type === 'list') {
          return (
            <ul key={key} className="animal-details-structured-list">
              {part.items.map((item) => (
                <li key={`${item.label}-${item.value}`}>
                  <strong>{item.label}</strong>: {item.value}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={key} className="animal-details-text-paragraph">
            {part.text}
          </p>
        );
      })}
    </div>
  );
}

export function AnimalDetailsPage() {
  const { animalId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [animalState, setAnimalState] = useState({
    item: null,
    isLoading: true,
    error: '',
    statusCode: 0,
  });
  const [pageFeedback, setPageFeedback] = useState({
    type: '',
    message: '',
  });
  const [managementState, setManagementState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
  });
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    const feedback = location.state?.feedback;

    if (!feedback?.message) {
      return;
    }

    setPageFeedback({
      type: feedback.type === 'error' ? 'error' : 'success',
      message: feedback.message,
    });

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnimal() {
      try {
        setAnimalState({
          item: null,
          isLoading: true,
          error: '',
          statusCode: 0,
        });
        setManagementState({
          isSubmitting: false,
          error: '',
          success: '',
        });
        setConfirmState(null);

        const payload = await fetchJson(`/api/animals/${animalId}`);

        if (!isMounted) {
          return;
        }

        setAnimalState({
          item: payload,
          isLoading: false,
          error: '',
          statusCode: 0,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAnimalState({
          item: null,
          isLoading: false,
          error:
            error.status === 503
              ? 'Животното временно не може да се зареди. Провери връзката към базата данни.'
              : error.message,
          statusCode: error.status ?? 0,
        });
      }
    }

    loadAnimal();

    return () => {
      isMounted = false;
    };
  }, [animalId, reloadToken]);

  const actionConfig = useMemo(() => {
    if (!animalState.item) {
      return null;
    }

    return buildActionConfig(role, animalState.item);
  }, [animalState.item, role]);

  const allowedActions = useMemo(() => animalState.item?.policy?.allowedActions ?? [], [animalState.item]);

  const visibleTransitions = useMemo(() => {
    if (!animalState.item) {
      return [];
    }

    return getAvailableStatusTransitions(animalState.item.status, role);
  }, [animalState.item, role]);

  async function submitManagementAction(nextStatus) {
    try {
      setManagementState({
        isSubmitting: true,
        error: '',
        success: '',
      });

      const endpoint = nextStatus === 'inactive' || nextStatus === 'archived' ? 'deactivate' : 'status';
      const updatedAnimal = await patchJson(`/api/animals/${animalId}/${endpoint}`, {
        status: nextStatus,
      });

      setAnimalState((currentValue) => ({
        ...currentValue,
        item: updatedAnimal,
      }));
      setManagementState({
        isSubmitting: false,
        error: '',
        success:
          nextStatus === 'archived'
            ? 'Записът е архивиран успешно.'
            : nextStatus === 'inactive'
              ? 'Записът е деактивиран успешно.'
              : `Статусът е обновен на „${updatedAnimal.statusLabel}“.`,
      });
    } catch (error) {
      setManagementState({
        isSubmitting: false,
        error: error.message,
        success: '',
      });
    }
  }

  function handleStatusAction(nextStatus) {
    const animalName = animalState.item?.displayName ?? animalState.item?.name ?? 'животното';

    if (nextStatus === 'inactive' || nextStatus === 'archived') {
      setConfirmState(buildConfirmConfig(nextStatus, animalName));
      return;
    }

    submitManagementAction(nextStatus);
  }

  async function handleConfirmAction() {
    if (!confirmState?.nextStatus) {
      return;
    }

    const nextStatus = confirmState.nextStatus;
    setConfirmState(null);
    await submitManagementAction(nextStatus);
  }

  function handleRetryLoad() {
    setReloadToken((currentValue) => currentValue + 1);
  }

  function handleFavoriteFeedback(feedback) {
    if (!feedback?.message) {
      return;
    }

    setPageFeedback({
      type: feedback.type === 'error' ? 'error' : 'success',
      message: feedback.message,
    });
  }

  if (animalState.isLoading) {
    return <AnimalDetailsSkeleton />;
  }

  if (animalState.statusCode === 400) {
    return (
      <AnimalNotFoundState
        code="400"
        title="Невалиден идентификатор на животно"
        description="Адресът на животното е невалиден. Провери линка и отвори запис от списъка с животни."
        showCreateAction={canManageAnimals(role)}
      />
    );
  }

  if (animalState.statusCode === 404) {
    return <AnimalNotFoundState showCreateAction={canManageAnimals(role)} />;
  }

  if (animalState.error) {
    return (
      <main className="route-shell animal-details-shell">
        <div className="route-card animals-feedback-card animals-feedback-card-error">
                    <h1>Животното не може да се зареди</h1>
          <p>{animalState.error}</p>
          <div className="animals-feedback-actions">
            <button type="button" className="animals-primary-action" onClick={handleRetryLoad}>
              Опитай отново
            </button>
            <Link className="animals-secondary-action" to="/search">
              Обратно към списъка
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const animal = animalState.item;
  const visibleName = animal.displayName ?? animal.name;
  const hasManagementAccess = canManageAnimals(role);
  const relatedRoute =
    role === 'client'
      ? '/adoptions/my'
      : role === 'admin'
        ? '/admin/adoptions'
        : role === 'employee'
          ? '/staff/adoptions'
          : '';
  const animalStory = animal.story || animal.description;
  const animalDetails = animal.details || '';
  const publicInfoBlocks = [
    {
      title: 'История и характер',
      text: animal.historyAndCharacter,
      className: 'animal-details-history-card',
    },
    {
      title: 'Подходящи условия за отглеждане',
      text: animal.careConditions,
      className: 'animal-details-care-card',
    },
  ].filter((block) => String(block.text ?? '').trim());
  const animalHistoryBlock = publicInfoBlocks.find((block) => block.title === 'История и характер');
  const animalCareBlock = publicInfoBlocks.find((block) => block.title === 'Подходящи условия за отглеждане');
  const visibleActionConfig = hasManagementAccess ? null : actionConfig;
  const canUseStandardAdoptionAction = canUseStandardAdoptionFlow(animal);
  const showPublicHelpCard = Boolean(visibleActionConfig && !visibleActionConfig.disabled);
  const healthCareItems = buildHealthCareItems(animal);

  return (
    <main className="route-shell animal-details-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to="/search">
          Към всички животни
        </Link>
        {relatedRoute ? (
          <Link className="animals-primary-action" to={relatedRoute}>
            {role === 'client' ? 'Моите заявки' : 'Заявки за осиновяване'}
          </Link>
        ) : null}
      </div>

      {pageFeedback.message ? (
        <div className={`auth-status ${pageFeedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'} animal-page-feedback`}>
          {pageFeedback.message}
        </div>
      ) : null}

      <section className="animal-details-hero">
        <div className="animal-details-gallery">
          <div className="animal-details-main-image">
            <AnimalImage src={animal.imageUrl} alt={visibleName} loading="eager" />
          </div>

          {animal.imageUrls?.length > 1 ? (
            <div className="animal-details-thumbnails">
              {animal.imageUrls.map((imageUrl) => (
                <div key={imageUrl} className="animal-details-thumbnail">
                  <AnimalImage src={imageUrl} alt={`Снимка на ${visibleName}`} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="animal-details-summary">
          <div className="animal-details-summary-top">
            <AnimalStatusBadge status={animal.status} statusLabel={animal.statusLabel} />
            {hasManagementAccess ? (
              <span className={`animal-activity-pill ${animal.isActive ? 'is-active' : 'is-inactive'}`}>
                {animal.isActive ? 'Активен запис' : 'Неактивен запис'}
              </span>
            ) : null}
          </div>

          <h1>{visibleName}</h1>
          <p className="animal-details-facts">{animal.facts}</p>
          <p className="animal-details-description">{animal.description}</p>

          <div className="animal-details-favorite-row">
            <FavoriteToggleButton animal={animal} variant="detail" onFeedback={handleFavoriteFeedback} />
          </div>

          {visibleActionConfig ? (
            <div className="animal-details-cta-card" id="animal-adoption-action">
              <h2>Следващо действие</h2>
              <p>{visibleActionConfig.helper}</p>

              <div className="animal-details-cta-actions">
                {visibleActionConfig.to ? (
                  <Link className="animals-primary-action animal-details-action" to={visibleActionConfig.to}>
                    {visibleActionConfig.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="animals-primary-action animal-details-action"
                    disabled={visibleActionConfig.disabled}
                  >
                    {visibleActionConfig.label}
                  </button>
                )}

                {visibleActionConfig.secondaryTo ? (
                  <Link className="animals-secondary-action animal-details-action" to={visibleActionConfig.secondaryTo}>
                    {visibleActionConfig.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="animal-details-grid">
        <article className="animal-details-card animal-details-description-card">
          <div className="animal-details-card-heading">
            <h2>Описание</h2>
          </div>

          <FormattedAnimalText className="animal-details-card-text" text={animalStory} />
        </article>

        {animalHistoryBlock ? (
          <article className={`animal-details-card ${animalHistoryBlock.className}`}>
            <div className="animal-details-card-heading">
              <h2>{animalHistoryBlock.title}</h2>
            </div>

            <FormattedAnimalText className="animal-details-card-text" text={animalHistoryBlock.text} />
          </article>
        ) : null}

        {animalDetails ? (
          <article className="animal-details-card animal-details-basic-card">
            <div className="animal-details-card-heading">
              <h2>Основна информация</h2>
            </div>

            <FormattedAnimalText className="animal-details-card-text" text={animalDetails} />
          </article>
        ) : null}

        {animalCareBlock ? (
          <article className={`animal-details-card ${animalCareBlock.className}`}>
            <div className="animal-details-card-heading">
              <h2>{animalCareBlock.title}</h2>
            </div>

            <FormattedAnimalText className="animal-details-card-text" text={animalCareBlock.text} />
          </article>
        ) : null}

        <article className="animal-details-card animal-details-medical-card">
          <div className="animal-details-card-heading">
            <h2>Здравословно състояние</h2>
            <p>Здраве и грижи според наличната информация в системата.</p>
          </div>

          <div className="animal-healthcare-list">
            {healthCareItems.map((item) => (
              <div key={item.label} className="animal-healthcare-item">
                <div className="animal-healthcare-item-header">
                  <h3>{item.label}</h3>
                  <span>{item.value}</span>
                </div>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </article>

        {hasManagementAccess ? (
          <>
            <article className="animal-details-card">
              <div className="animal-details-card-heading">
                <h2>В системата</h2>
                <p>Вътрешна информация за записа, достъпна само за служители и администратори.</p>
              </div>

              <dl className="animal-details-info-list">
                <div>
                  <dt>Slug</dt>
                  <dd>{animal.slug}</dd>
                </div>
                <div>
                  <dt>Създаден</dt>
                  <dd>{formatDate(animal.createdAt)}</dd>
                </div>
                <div>
                  <dt>Последна промяна</dt>
                  <dd>{formatDate(animal.updatedAt)}</dd>
                </div>
                <div className="animal-details-info-wide">
                  <dt>Policy / allowed actions</dt>
                  <dd>
                    <div className="animal-details-policy-list">
                      {allowedActions.length > 0 ? (
                        allowedActions.map((action) => (
                          <span key={action} className="animal-details-policy-pill">
                            {ACTION_LABELS[action] ?? action}
                          </span>
                        ))
                      ) : (
                        <span className="animal-details-policy-empty">Няма допълнителни действия за тази роля.</span>
                      )}
                    </div>
                  </dd>
                </div>
              </dl>
            </article>

            <article className="animal-details-card animal-details-management-card">
              <div className="animal-details-card-heading">
                <h2>Управление на статуси и редакция</h2>
                <p>
                  {role === 'admin'
                    ? 'Администраторът може да редактира, да сменя статуси и да архивира записа.'
                    : 'Служителят може да редактира и да сменя позволените оперативни статуси.'}
                </p>
              </div>

              <div className="animal-details-management-actions">
                <Link className="animals-primary-action" to={`/animals/${animal.id}/edit`}>
                  Редакция
                </Link>

                {visibleTransitions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    className={`animals-secondary-action ${nextStatus === 'inactive' || nextStatus === 'archived' ? 'animal-danger-action' : ''}`}
                    disabled={managementState.isSubmitting}
                    onClick={() => handleStatusAction(nextStatus)}
                  >
                    {getAnimalStatusLabel(nextStatus)}
                  </button>
                ))}
              </div>

              {managementState.error ? (
                <div className="auth-status auth-status-error">{managementState.error}</div>
              ) : null}
              {managementState.success ? (
                <div className="auth-status auth-status-info">{managementState.success}</div>
              ) : null}
            </article>
          </>
        ) : null}
      </section>

      {showPublicHelpCard ? (
        <section className="animal-details-help-card">
          {canUseStandardAdoptionAction ? (
            <>
              <div className="animal-details-help-row">
                <h2>Искаш да помогнеш на {visibleName}?</h2>
                <a className="about-page-contact-link" href="#animal-adoption-action">
                  Осинови
                </a>
              </div>

              <div className="animal-details-help-row">
                <h2>Имаш въпроси към нас за животното?</h2>
                <Link className="about-page-contact-link" to="/svurji-se-s-nas">
                  Свържи се с нас
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="animal-details-help-row">
                <h2>Искаш да помогнеш на {visibleName}?</h2>
                <Link className="about-page-contact-link" to="/svurji-se-s-nas">
                  Свържи се с нас
                </Link>
              </div>

              <div className="animal-details-help-row">
                <h2>Искаш да подкрепиш грижата за животните?</h2>
                <Link className="about-page-contact-link" to="/podkrepa">
                  Виж как
                </Link>
              </div>
            </>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Потвърди'}
        cancelLabel="Отказ"
        tone={confirmState?.tone ?? 'danger'}
        isSubmitting={managementState.isSubmitting}
        onConfirm={handleConfirmAction}
        onClose={() => {
          if (!managementState.isSubmitting) {
            setConfirmState(null);
          }
        }}
      />
    </main>
  );
}












