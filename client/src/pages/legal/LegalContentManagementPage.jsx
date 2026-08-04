import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchJson, patchJson } from '../../lib/api.js';
import { DEFAULT_LEGAL_CONTENT, LEGAL_CONTENT_LABELS } from './legalContentDefaults.js';

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function cloneLegalDraft(legalKey, draft = DEFAULT_LEGAL_CONTENT[legalKey]) {
  return {
    ...draft,
    legalKey,
    intro: [...(draft?.intro ?? [])],
    sections: (draft?.sections ?? []).map((section, index) => ({
      title: section.title ?? '',
      paragraphs: [...(section.paragraphs ?? [])],
      items: [...(section.items ?? [])],
      closing: [...(section.closing ?? [])],
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
      isVisible: section.isVisible !== false,
    })),
  };
}

function LegalSectionEditor({ section, index, onChange, onRemove }) {
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
          <input value={section.title} onChange={(event) => updateSection({ title: event.target.value })} />
        </label>
        <label className="page-content-admin-check">
          <input
            type="checkbox"
            checked={section.isVisible !== false}
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
          onChange={(event) => updateSection({ paragraphs: splitLines(event.target.value) })}
        />
      </label>
      <label className="page-content-admin-field">
        <span>Списък, всеки елемент на нов ред</span>
        <textarea
          rows={4}
          value={joinLines(section.items)}
          onChange={(event) => updateSection({ items: splitLines(event.target.value) })}
        />
      </label>
      <label className="page-content-admin-field">
        <span>Заключителни параграфи, всеки на нов ред</span>
        <textarea
          rows={3}
          value={joinLines(section.closing)}
          onChange={(event) => updateSection({ closing: splitLines(event.target.value) })}
        />
      </label>

      <button type="button" className="animals-secondary-action" onClick={() => onRemove(index)}>
        Премахни секцията
      </button>
    </article>
  );
}

export function LegalContentManagementPage() {
  const [records, setRecords] = useState([]);
  const [selectedKey, setSelectedKey] = useState('privacy');
  const [draft, setDraft] = useState(() => cloneLegalDraft('privacy'));
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.legalKey === selectedKey) ?? null,
    [records, selectedKey]
  );

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/legal-content/admin/records')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(payload?.items) ? payload.items : [];
        setRecords(items);
        const firstRecord = items.find((item) => item.legalKey === selectedKey);
        setDraft(cloneLegalDraft(selectedKey, firstRecord?.draft ?? DEFAULT_LEGAL_CONTENT[selectedKey]));
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedKey]);

  function selectLegalKey(legalKey) {
    setSelectedKey(legalKey);
    const record = records.find((item) => item.legalKey === legalKey);
    setDraft(cloneLegalDraft(legalKey, record?.draft ?? DEFAULT_LEGAL_CONTENT[legalKey]));
    setStatusMessage('');
    setErrorMessage('');
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

  async function saveDraft(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedRecord = await patchJson(`/api/legal-content/admin/${selectedKey}`, draft);
      setRecords((currentRecords) => {
        const otherRecords = currentRecords.filter((record) => record.legalKey !== selectedKey);
        return [...otherRecords, savedRecord].sort((firstRecord, secondRecord) =>
          firstRecord.legalKey.localeCompare(secondRecord.legalKey)
        );
      });
      setDraft(cloneLegalDraft(selectedKey, savedRecord.draft));
      setStatusMessage('Черновата е запазена. Публичната страница ще се промени след публикуване.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function publishDraft() {
    setIsPublishing(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedRecord = await patchJson(`/api/legal-content/admin/${selectedKey}`, draft);
      const publishedRecord = await patchJson(`/api/legal-content/admin/${selectedKey}/publish`, savedRecord.draft);
      setRecords((currentRecords) => {
        const otherRecords = currentRecords.filter((record) => record.legalKey !== selectedKey);
        return [...otherRecords, publishedRecord].sort((firstRecord, secondRecord) =>
          firstRecord.legalKey.localeCompare(secondRecord.legalKey)
        );
      });
      setDraft(cloneLegalDraft(selectedKey, publishedRecord.draft));
      setStatusMessage(`Публикувана е версия ${publishedRecord.version}.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsPublishing(false);
    }
  }

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
        <Link className="animals-secondary-action" to="/admin">
          Назад
        </Link>
      </section>

      <div className="page-content-admin-tabs" role="tablist" aria-label="Юридически страници">
        {Object.entries(LEGAL_CONTENT_LABELS).map(([legalKey, label]) => (
          <button
            key={legalKey}
            type="button"
            className={`page-content-admin-tab ${selectedKey === legalKey ? 'is-active' : ''}`}
            onClick={() => selectLegalKey(legalKey)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="page-content-admin-card" onSubmit={saveDraft}>
        <div className="legal-admin-meta">
          <span>Статус: {selectedRecord?.status ?? 'draft'}</span>
          <span>Версия: {selectedRecord?.version ?? 0}</span>
          <span>
            Публикувано:{' '}
            {selectedRecord?.publishedAt ? new Date(selectedRecord.publishedAt).toLocaleDateString('bg-BG') : 'няма'}
          </span>
        </div>

        <div className="page-content-admin-form-grid">
          <label className="page-content-admin-field">
            <span>Заглавие</span>
            <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
          </label>
          <label className="page-content-admin-field">
            <span>Последна актуализация</span>
            <input
              value={draft.lastUpdatedLabel}
              onChange={(event) => updateDraft({ lastUpdatedLabel: event.target.value })}
            />
          </label>
          <label className="page-content-admin-field page-content-admin-field-wide">
            <span>Въвеждащи параграфи, всеки на нов ред</span>
            <textarea
              rows={5}
              value={joinLines(draft.intro)}
              onChange={(event) => updateDraft({ intro: splitLines(event.target.value) })}
            />
          </label>
        </div>

        <div className="legal-admin-section-list">
          {(draft.sections ?? []).map((section, index) => (
            <LegalSectionEditor
              key={`${section.title}-${index}`}
              section={section}
              index={index}
              onChange={updateSection}
              onRemove={removeSection}
            />
          ))}
        </div>

        <button type="button" className="animals-secondary-action" onClick={addSection}>
          Добави секция
        </button>

        <div className="profile-form-actions">
          <button type="submit" className="animals-primary-action" disabled={isSaving || isPublishing}>
            {isSaving ? 'Запазване...' : 'Запази чернова'}
          </button>
          <button
            type="button"
            className="animals-primary-action"
            disabled={isSaving || isPublishing}
            onClick={publishDraft}
          >
            {isPublishing ? 'Публикуване...' : 'Публикувай'}
          </button>
        </div>
        {statusMessage ? <p className="form-success-message">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-error-message">{errorMessage}</p> : null}
      </form>

      <section className="page-content-admin-card">
        <h2>История на версиите</h2>
        {selectedRecord?.history?.length ? (
          <div className="legal-admin-history-list">
            {selectedRecord.history.map((historyItem) => (
              <article key={`${historyItem.version}-${historyItem.replacedAt}`} className="legal-admin-history-item">
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
    </main>
  );
}
