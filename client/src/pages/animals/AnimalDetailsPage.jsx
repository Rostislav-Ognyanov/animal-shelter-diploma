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

function formatBoolean(value) {
  return value ? 'Да' : 'Не';
}

function buildUnavailableClientMessage(animal) {
  const statusLabel = animal.statusLabel ?? getAnimalStatusLabel(animal.status);

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

function buildActionConfig(role, animal) {
  if (role === 'guest') {
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
    if (animal.status === 'available') {
      return {
        label: 'Подай заявка за осиновяване',
        to: `/animals/${animal.id}/adopt`,
        helper:
          'Попълни кратка форма и екипът на приюта ще прегледа заявката ти. След това ще можеш да следиш статуса ѝ в „Моите заявки“.',
      };
    }

    return {
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
            <span className={`animal-activity-pill ${animal.isActive ? 'is-active' : 'is-inactive'}`}>
              {animal.isActive ? 'Активен запис' : 'Неактивен запис'}
            </span>
          </div>

          <h1>{visibleName}</h1>
          <p className="animal-details-facts">{animal.facts}</p>
          <p className="animal-details-description">{animal.description}</p>

          <div className="animal-details-favorite-row">
            <FavoriteToggleButton animal={animal} variant="detail" onFeedback={handleFavoriteFeedback} />
          </div>

          {actionConfig ? (
            <div className="animal-details-cta-card">
              <h2>Следващо действие</h2>
              <p>{actionConfig.helper}</p>

              <div className="animal-details-cta-actions">
                {actionConfig.to ? (
                  <Link className="animals-primary-action animal-details-action" to={actionConfig.to}>
                    {actionConfig.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="animals-primary-action animal-details-action"
                    disabled={actionConfig.disabled}
                  >
                    {actionConfig.label}
                  </button>
                )}

                {actionConfig.secondaryTo ? (
                  <Link className="animals-secondary-action animal-details-action" to={actionConfig.secondaryTo}>
                    {actionConfig.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="animal-details-grid">
        <article className="animal-details-card">
          <div className="animal-details-card-heading">
            <h2>Основна информация</h2>

          </div>

          <dl className="animal-details-info-list">
            <div>
              <dt>Име</dt>
              <dd>{visibleName}</dd>
            </div>
            <div>
              <dt>Вид</dt>
              <dd>{animal.speciesLabel}</dd>
            </div>
            <div>
              <dt>Порода</dt>
              <dd>{animal.breed}</dd>
            </div>
            <div>
              <dt>Възраст</dt>
              <dd>{animal.ageText ?? `${animal.age} години`}</dd>
            </div>
            <div>
              <dt>Пол</dt>
              <dd>{animal.genderLabel}</dd>
            </div>
            <div>
              <dt>Големина</dt>
              <dd>{animal.sizeLabel}</dd>
            </div>
            <div>
              <dt>Дата на приемане</dt>
              <dd>{formatDate(animal.intakeDate)}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{animal.statusLabel}</dd>
            </div>
          </dl>
        </article>

        <article className="animal-details-card">
          <div className="animal-details-card-heading">
            <h2>Медицинска информация</h2>

          </div>

          <dl className="animal-details-info-list">
            <div className="animal-details-info-wide">
              <dt>Здравен статус</dt>
              <dd>{animal.healthStatus}</dd>
            </div>
            <div>
              <dt>Ваксиниран</dt>
              <dd>{formatBoolean(animal.vaccinated)}</dd>
            </div>
            <div>
              <dt>Кастриран</dt>
              <dd>{formatBoolean(animal.neutered)}</dd>
            </div>
          </dl>
        </article>

        <article className="animal-details-card">
          <div className="animal-details-card-heading">
            <h2>В системата</h2>

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
              <dt>Разрешени действия за текущата роля</dt>
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

        {hasManagementAccess ? (
          <article className="animal-details-card animal-details-management-card">
            <div className="animal-details-card-heading">
              <h2>Управление според роля</h2>
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
        ) : null}
      </section>

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












