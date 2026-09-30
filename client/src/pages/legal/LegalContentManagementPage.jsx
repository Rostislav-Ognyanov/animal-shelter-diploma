import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useErrorFeedbackFocus } from '../../hooks/useErrorFeedbackFocus.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  LEGAL_CONTENT_EDITABLE_FIELDS,
  LEGAL_CONTENT_KEY_VALUES,
  LEGAL_CONTENT_LABELS,
  LEGAL_CONTENT_LIMITS,
} from '../../../../shared/domain/legalContentConstants.js';
import { DEFAULT_LEGAL_CONTENT } from './legalContentDefaults.js';

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function getMultilineMaxLength(itemLength, itemCount) {
  return itemLength * itemCount + Math.max(0, itemCount - 1);
}

function cloneLegalDraft(legalKey, draft = DEFAULT_LEGAL_CONTENT[legalKey]) {
  return {
    title: draft?.title ?? '',
    lastUpdatedLabel: draft?.lastUpdatedLabel ?? '',
    intro: [...(draft?.intro ?? [])],
    sections: (draft?.sections ?? []).map((section, index) => ({
      title: section.title ?? '',
      paragraphs: [...(section.paragraphs ?? [])],
      items: [...(section.items ?? [])],
      closing: [...(section.closing ?? [])],
      order: Number.isInteger(section.order) ? section.order : index,
      isVisible: typeof section.isVisible === 'boolean' ? section.isVisible : true,
    })),
  };
}

function buildLegalPayload(draft) {
  return LEGAL_CONTENT_EDITABLE_FIELDS.reduce((payload, fieldName) => {
    payload[fieldName] = draft[fieldName];
    return payload;
  }, {});
}

function validateText(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    return fieldName + ' трябва да бъде текст.';
  }

  if (value.trim().length > maxLength) {
    return fieldName + ' не може да надвишава ' + maxLength + ' символа.';
  }

  return '';
}

function validateTextList(value, fieldName, itemFieldName, maxItems, maxItemLength) {
  if (!Array.isArray(value)) {
    return fieldName + ' трябва да бъде списък.';
  }

  if (value.length > maxItems) {
    return fieldName + ' може да съдържа най-много ' + maxItems + ' елемента.';
  }

  for (const item of value) {
    const error = validateText(item, itemFieldName, maxItemLength);

    if (error) {
      return error;
    }

    if (!item.trim()) {
      return fieldName + ' не може да съдържа празни елементи.';
    }
  }

  return '';
}

function validateLegalDraft(draft, { forPublish = false } = {}) {
  const titleError = validateText(draft.title, 'Заглавието', LEGAL_CONTENT_LIMITS.title);
  const updatedLabelError = validateText(
    draft.lastUpdatedLabel,
    'Последната актуализация',
    LEGAL_CONTENT_LIMITS.lastUpdatedLabel
  );
  const introError = validateTextList(
    draft.intro,
    'Въвеждащите параграфи',
    'Въвеждащият параграф',
    LEGAL_CONTENT_LIMITS.introParagraphs,
    LEGAL_CONTENT_LIMITS.introParagraph
  );

  if (titleError || updatedLabelError || introError) {
    return titleError || updatedLabelError || introError;
  }

  if (!Array.isArray(draft.sections)) {
    return 'Секциите трябва да бъдат списък.';
  }

  if (draft.sections.length > LEGAL_CONTENT_LIMITS.sections) {
    return 'Юридическото съдържание може да има най-много ' +
      LEGAL_CONTENT_LIMITS.sections +
      ' секции.';
  }

  for (const section of draft.sections) {
    const sectionTitleError = validateText(
      section.title,
      'Заглавието на секцията',
      LEGAL_CONTENT_LIMITS.sectionTitle
    );
    const paragraphsError = validateTextList(
      section.paragraphs,
      'Параграфите в секцията',
      'Параграфът',
      LEGAL_CONTENT_LIMITS.paragraphsPerSection,
      LEGAL_CONTENT_LIMITS.paragraph
    );
    const itemsError = validateTextList(
      section.items,
      'Елементите в секцията',
      'Елементът от списъка',
      LEGAL_CONTENT_LIMITS.itemsPerSection,
      LEGAL_CONTENT_LIMITS.item
    );
    const closingError = validateTextList(
      section.closing,
      'Заключителните параграфи',
      'Заключителният параграф',
      LEGAL_CONTENT_LIMITS.closingParagraphsPerSection,
      LEGAL_CONTENT_LIMITS.paragraph
    );

    if (sectionTitleError || paragraphsError || itemsError || closingError) {
      return sectionTitleError || paragraphsError || itemsError || closingError;
    }

    if (!Number.isInteger(section.order) || section.order < 0) {
      return 'Редът на секцията трябва да бъде неотрицателно цяло число.';
    }

    if (typeof section.isVisible !== 'boolean') {
      return 'Видимостта на секцията трябва да бъде true или false.';
    }
  }

  if (!forPublish) {
    return '';
  }

  if (!draft.title.trim()) {
    return 'Заглавието е задължително преди публикуване.';
  }

  if (draft.intro.length === 0) {
    return 'Преди публикуване е необходим поне един въвеждащ параграф.';
  }

  const hasVisibleContentSection = draft.sections.some(
    (section) =>
      section.isVisible &&
      Boolean(section.title.trim()) &&
      (section.paragraphs.length > 0 || section.items.length > 0 || section.closing.length > 0)
  );

  return hasVisibleContentSection
    ? ''
    : 'Преди публикуване е необходима поне една видима непразна секция.';
}

function replaceRecord(records, nextRecord) {
  return [
    ...records.filter((record) => record.legalKey !== nextRecord.legalKey),
    nextRecord,
  ].sort((firstRecord, secondRecord) => firstRecord.legalKey.localeCompare(secondRecord.legalKey));
}

function LegalSectionEditor({ section, index, onChange, onRemove, disabled = false }) {
  function updateSection(patch) {
    onChange(index, {
      ...section,
      ...patch,
    });
  }

  return (
    <article className="legal-admin-section-editor">
      <div className="legal-admin-section-header">
        <label className="page-content-admin-field">
          <span>Заглавие на секцията</span>
          <input
            value={section.title}
            disabled={disabled}
            maxLength={LEGAL_CONTENT_LIMITS.sectionTitle}
            onChange={(event) => updateSection({ title: event.target.value })}
          />
        </label>
        <label className="page-content-admin-check">
          <input
            type="checkbox"
            checked={section.isVisible}
            disabled={disabled}
            onChange={(event) => updateSection({ isVisible: event.target.checked })}
          />
          <span>Показвай</span>
        </label>
      </div>

      <label className="page-content-admin-field">
        <span>Параграфи, всеки на нов ред</span>
        <textarea
          rows={5}
          value={joinLines(section.paragraphs)}
          disabled={disabled}
          maxLength={getMultilineMaxLength(
            LEGAL_CONTENT_LIMITS.paragraph,
            LEGAL_CONTENT_LIMITS.paragraphsPerSection
          )}
          onChange={(event) => updateSection({ paragraphs: splitLines(event.target.value) })}
        />
      </label>
      <label className="page-content-admin-field">
        <span>Списък, всеки елемент на нов ред</span>
        <textarea
          rows={4}
          value={joinLines(section.items)}
          disabled={disabled}
          maxLength={getMultilineMaxLength(
            LEGAL_CONTENT_LIMITS.item,
            LEGAL_CONTENT_LIMITS.itemsPerSection
          )}
          onChange={(event) => updateSection({ items: splitLines(event.target.value) })}
        />
      </label>
      <label className="page-content-admin-field">
        <span>Заключителни параграфи, всеки на нов ред</span>
        <textarea
          rows={3}
          value={joinLines(section.closing)}
          disabled={disabled}
          maxLength={getMultilineMaxLength(
            LEGAL_CONTENT_LIMITS.paragraph,
            LEGAL_CONTENT_LIMITS.closingParagraphsPerSection
          )}
          onChange={(event) => updateSection({ closing: splitLines(event.target.value) })}
        />
      </label>

      <button
        type="button"
        className="app-secondary-action"
        disabled={disabled}
        onClick={() => onRemove(index)}
      >
        Премахни секцията
      </button>
    </article>
  );
}

export function LegalContentManagementPage() {
  const [records, setRecords] = useState([]);
  const [selectedKey, setSelectedKey] = useState('privacy');
  const [draft, setDraft] = useState(() => cloneLegalDraft('privacy'));
  const [lastSavedDraft, setLastSavedDraft] = useState(() => cloneLegalDraft('privacy'));
  const [pendingLegalKey, setPendingLegalKey] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [loadState, setLoadState] = useState({
    isLoading: true,
    error: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorFeedbackRef = useErrorFeedbackFocus(errorMessage);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.legalKey === selectedKey) ?? null,
    [records, selectedKey]
  );
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(lastSavedDraft),
    [draft, lastSavedDraft]
  );
  const { pendingNavigationPath, confirmNavigation, cancelNavigation } =
    useUnsavedChangesGuard(hasUnsavedChanges);
  const canUseDraft = !loadState.isLoading && !loadState.error;
  const isEditorDisabled = !canUseDraft || isSaving || isPublishing;
  const hasPublishableChanges =
    hasUnsavedChanges || Boolean(selectedRecord?.hasUnpublishedChanges) || !selectedRecord;

  useEffect(() => {
    let isMounted = true;

    setLoadState({
      isLoading: true,
      error: '',
    });
    setStatusMessage('');
    setErrorMessage('');

    fetchJson('/api/legal-content/admin/records')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(payload?.items) ? payload.items : [];
        const selected = items.find((item) => item.legalKey === selectedKey);
        const nextDraft = cloneLegalDraft(
          selectedKey,
          selected?.draft ?? DEFAULT_LEGAL_CONTENT[selectedKey]
        );
        setRecords(items);
        setDraft(nextDraft);
        setLastSavedDraft(cloneLegalDraft(selectedKey, nextDraft));
        setPendingLegalKey('');
        setLoadState({
          isLoading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (isMounted) {
          setLoadState({
            isLoading: false,
            error: error.message,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken, selectedKey]);

  function applyLegalKey(legalKey) {
    setSelectedKey(legalKey);
    setLoadState({
      isLoading: true,
      error: '',
    });
    setStatusMessage('');
    setErrorMessage('');
  }

  function selectLegalKey(legalKey) {
    if (legalKey === selectedKey) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingLegalKey(legalKey);
      return;
    }

    applyLegalKey(legalKey);
  }

  function confirmLegalKeyChange() {
    if (!pendingLegalKey) {
      return;
    }

    const nextLegalKey = pendingLegalKey;
    setPendingLegalKey('');
    applyLegalKey(nextLegalKey);
  }

  function updateDraft(patch) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...patch,
    }));
  }

  function updateSection(index, nextSection) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      sections: currentDraft.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...nextSection, order: sectionIndex } : section
      ),
    }));
  }

  function addSection() {
    if (draft.sections.length >= LEGAL_CONTENT_LIMITS.sections) {
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      sections: [
        ...currentDraft.sections,
        {
          title: '',
          paragraphs: [],
          items: [],
          closing: [],
          order: currentDraft.sections.length,
          isVisible: true,
        },
      ],
    }));
  }

  function removeSection(index) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      sections: currentDraft.sections
        .filter((_, sectionIndex) => sectionIndex !== index)
        .map((section, sectionIndex) => ({ ...section, order: sectionIndex })),
    }));
  }

  function setValidationError(options) {
    const validationError = validateLegalDraft(draft, options);

    if (!validationError) {
      return false;
    }

    setStatusMessage('');
    setErrorMessage(validationError);
    return true;
  }

  async function persistDraft() {
    const savedRecord = await patchJson(
      `/api/legal-content/admin/${selectedKey}`,
      buildLegalPayload(draft)
    );
    const nextDraft = cloneLegalDraft(selectedKey, savedRecord.draft);

    setRecords((currentRecords) => replaceRecord(currentRecords, savedRecord));
    setDraft(nextDraft);
    setLastSavedDraft(cloneLegalDraft(selectedKey, nextDraft));
    return savedRecord;
  }

  async function saveDraft(event) {
    event.preventDefault();

    if (!canUseDraft || setValidationError()) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await persistDraft();
      setStatusMessage('Черновата е запазена. Публичната страница ще се промени след публикуване.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function requestPublish() {
    if (!canUseDraft || !hasPublishableChanges || setValidationError({ forPublish: true })) {
      return;
    }

    setPendingAction('publish');
  }

  async function publishDraft() {
    if (!canUseDraft) {
      return;
    }

    setIsPublishing(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      let publishCandidate = selectedRecord;

      if (hasUnsavedChanges || !selectedRecord) {
        publishCandidate = await persistDraft();
      }

      if (!publishCandidate?.hasUnpublishedChanges) {
        setStatusMessage('Няма непубликувани промени.');
        return;
      }

      const publishedRecord = await patchJson(
        `/api/legal-content/admin/${selectedKey}/publish`,
        {}
      );
      const nextDraft = cloneLegalDraft(selectedKey, publishedRecord.draft);
      setRecords((currentRecords) => replaceRecord(currentRecords, publishedRecord));
      setDraft(nextDraft);
      setLastSavedDraft(cloneLegalDraft(selectedKey, nextDraft));
      setStatusMessage(`Публикувана е версия ${publishedRecord.version}.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsPublishing(false);
      setPendingAction('');
    }
  }

  const pendingLegalLabel = LEGAL_CONTENT_LABELS[pendingLegalKey] ?? 'другата страница';
  const publicVersionLabel = selectedRecord?.version
    ? `v${selectedRecord.version} – публикувана`
    : 'няма публикувана версия';
  const draftStatusLabel = hasUnsavedChanges
    ? 'има незапазени промени'
    : selectedRecord?.hasUnpublishedChanges
      ? 'има запазени непубликувани промени'
      : selectedRecord?.version
        ? 'съвпада с публичната версия'
        : 'не е публикувана';

  return (
    <main className="route-shell page-content-admin-shell legal-content-admin-shell">
      <section className="route-card page-content-admin-hero">
        <div>
          <p className="route-meta">Само за администратор</p>
          <h1>Юридически страници</h1>
          <p>
            Редакциите се пазят като чернова. Публичната политика или общите условия се променят
            само след изрично публикуване.
          </p>
        </div>
        <Link className="app-secondary-action" to="/admin/content">
          Към управление на съдържанието
        </Link>
      </section>

      <div className="page-content-admin-tabs" aria-label="Юридически страници">
        {LEGAL_CONTENT_KEY_VALUES.map((legalKey) => (
          <button
            key={legalKey}
            type="button"
            className={`page-content-admin-tab ${selectedKey === legalKey ? 'is-active' : ''}`}
            disabled={isSaving || isPublishing}
            onClick={() => selectLegalKey(legalKey)}
          >
            {LEGAL_CONTENT_LABELS[legalKey]}
          </button>
        ))}
      </div>

      {loadState.isLoading ? (
        <section className="page-content-admin-card">
          <p className="content-state-message" role="status">
            Зареждане на черновата...
          </p>
        </section>
      ) : null}

      {loadState.error ? (
        <section className="page-content-admin-card">
          <div className="adoptions-empty-state">
            <p>{loadState.error}</p>
            <button
              type="button"
              className="app-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        </section>
      ) : null}

      {canUseDraft ? (
        <>
          <form className="page-content-admin-card" onSubmit={saveDraft}>
            <div className="legal-admin-meta">
              <span>Публична версия: {publicVersionLabel}</span>
              <span>Чернова: {draftStatusLabel}</span>
              <span>
                Публикувана:{' '}
                {selectedRecord?.publishedAt
                  ? new Date(selectedRecord.publishedAt).toLocaleDateString('bg-BG')
                  : 'няма'}
              </span>
            </div>

            <div className="page-content-admin-form-grid">
              <label className="page-content-admin-field">
                <span>Заглавие</span>
                <input
                  value={draft.title}
                  disabled={isEditorDisabled}
                  maxLength={LEGAL_CONTENT_LIMITS.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              </label>
              <label className="page-content-admin-field">
                <span>Последна актуализация</span>
                <input
                  value={draft.lastUpdatedLabel}
                  disabled={isEditorDisabled}
                  maxLength={LEGAL_CONTENT_LIMITS.lastUpdatedLabel}
                  onChange={(event) => updateDraft({ lastUpdatedLabel: event.target.value })}
                />
              </label>
              <label className="page-content-admin-field page-content-admin-field-wide">
                <span>Въвеждащи параграфи, всеки на нов ред</span>
                <textarea
                  rows={5}
                  value={joinLines(draft.intro)}
                  disabled={isEditorDisabled}
                  maxLength={getMultilineMaxLength(
                    LEGAL_CONTENT_LIMITS.introParagraph,
                    LEGAL_CONTENT_LIMITS.introParagraphs
                  )}
                  onChange={(event) => updateDraft({ intro: splitLines(event.target.value) })}
                />
              </label>
            </div>

            <div className="legal-admin-section-list">
              {draft.sections.map((section, index) => (
                <LegalSectionEditor
                  key={`${section.title}-${index}`}
                  section={section}
                  index={index}
                  onChange={updateSection}
                  onRemove={removeSection}
                  disabled={isEditorDisabled}
                />
              ))}
            </div>

            <button
              type="button"
              className="app-secondary-action"
              disabled={isEditorDisabled || draft.sections.length >= LEGAL_CONTENT_LIMITS.sections}
              onClick={addSection}
            >
              Добави секция
            </button>

            <div className="profile-form-actions">
              <button type="submit" className="app-primary-action" disabled={isEditorDisabled}>
                {isSaving ? 'Запазване...' : 'Запази чернова'}
              </button>
              <button
                type="button"
                className="app-primary-action"
                disabled={isEditorDisabled || !hasPublishableChanges}
                onClick={requestPublish}
              >
                {isPublishing ? 'Публикуване...' : 'Публикувай'}
              </button>
            </div>
            {hasUnsavedChanges ? (
              <p className="feedback-message feedback-message-info">Има незапазени промени.</p>
            ) : null}
            {statusMessage ? (
              <p className="feedback-message feedback-message-info">{statusMessage}</p>
            ) : null}
            {errorMessage ? (
              <p
                ref={errorFeedbackRef}
                className="feedback-message feedback-message-error"
                role="alert"
                tabIndex={-1}
              >
                {errorMessage}
              </p>
            ) : null}
          </form>

          <section className="page-content-admin-card">
            <h2>История на версиите</h2>
            {selectedRecord?.history?.length ? (
              <div className="legal-admin-history-list">
                {selectedRecord.history.map((historyItem) => (
                  <article
                    key={`${historyItem.version}-${historyItem.replacedAt}`}
                    className="legal-admin-history-item"
                  >
                    <strong>Версия {historyItem.version}</strong>
                    <span>
                      Публикувана:{' '}
                      {historyItem.publishedAt
                        ? new Date(historyItem.publishedAt).toLocaleDateString('bg-BG')
                        : 'няма данни'}
                    </span>
                    <span>
                      Заменена:{' '}
                      {historyItem.replacedAt
                        ? new Date(historyItem.replacedAt).toLocaleDateString('bg-BG')
                        : 'няма данни'}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p>Все още няма предишни публикувани версии.</p>
            )}
          </section>
        </>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingNavigationPath)}
        title="Незапазени промени"
        description="Промените по текущата юридическа страница не са запазени. Сигурен ли си, че искаш да я напуснеш?"
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving || isPublishing}
        onConfirm={confirmNavigation}
        onClose={cancelNavigation}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingLegalKey)}
        title="Незапазени промени"
        description={`Има незапазени промени. Сигурен ли си, че искаш да преминеш към „${pendingLegalLabel}“?`}
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving || isPublishing}
        onConfirm={confirmLegalKeyChange}
        onClose={() => setPendingLegalKey('')}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'publish'}
        title="Публикуване на юридическа версия"
        description={
          selectedRecord?.version
            ? 'Сигурен ли си, че искаш тази версия да стане публична? Текущата публикувана версия ще бъде преместена в историята.'
            : 'Сигурен ли си, че искаш тази версия да стане публична?'
        }
        confirmLabel="Публикувай"
        tone="default"
        isSubmitting={isPublishing}
        onConfirm={publishDraft}
        onClose={() => setPendingAction('')}
      />
    </main>
  );
}
