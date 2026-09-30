import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useErrorFeedbackFocus } from '../../hooks/useErrorFeedbackFocus.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import {
  getDefaultPageContent,
  PAGE_CONTENT_CONFIGS,
} from './pageContentDefaults.js';
import { getPageContentCtaTargetOptions } from '../../../../shared/content-defaults/pageContentCtaTargets.js';
import {
  PAGE_CONTENT_IMAGE_POSITION_VALUES,
  PAGE_CONTENT_KEYS,
  PAGE_CONTENT_LABELS,
  PAGE_CONTENT_LIMITS,
} from '../../../../shared/domain/pageContentConstants.js';
import { clonePageContent, mergePageContent } from './pageContentUtils.js';

function textToParagraphs(value) {
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function createBlockId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `block-${globalThis.crypto.randomUUID()}`;
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildEmptyItem(bodyField = 'text') {
  return {
    id: createBlockId(),
    isVisible: true,
    title: 'Нов блок',
    [bodyField]: '',
    imagePath: '',
    imageAlt: '',
    imagePosition: 'right',
    ctaLabel: '',
    ctaTo: '',
  };
}

function TextField({ label, value, onChange, placeholder = '', disabled = false }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      <input
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function ImagePathField({ imagePath, imageAlt, onChange }) {
  return (
    <div className="page-content-admin-image-field">
      <TextField
        label="URL или публичен път до снимката"
        value={imagePath}
        onChange={(value) => onChange({ imagePath: value })}
      />
      {imagePath ? (
        <div className="page-content-admin-image-preview">
          <img src={buildPublicAssetPath(imagePath)} alt={imageAlt || ''} />
          <button type="button" onClick={() => onChange({ imagePath: '', imageAlt: '' })}>
            Премахни снимката
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder = '', rows = 5 }) {
  return (
    <label className="page-content-admin-field page-content-admin-field-wide">
      <span>{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = PAGE_CONTENT_LIMITS.sectionCountMin,
  max = PAGE_CONTENT_LIMITS.sectionCountMax,
}) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      <input
        min={min}
        max={max}
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function VisibilityField({ checked, onChange }) {
  return (
    <label className="page-content-admin-checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Показвай блока</span>
    </label>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="page-content-admin-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function useContentObjectEditor(content, setContent) {
  function updateRoot(patch) {
    setContent((currentContent) => ({
      ...currentContent,
      ...patch,
    }));
  }

  function updateObject(objectKey, patch) {
    setContent((currentContent) => ({
      ...currentContent,
      [objectKey]: {
        ...(currentContent[objectKey] ?? {}),
        ...patch,
      },
    }));
  }

  function updateArrayItem(arrayKey, itemIndex, patch) {
    setContent((currentContent) => {
      const items = [...(currentContent[arrayKey] ?? [])];
      items[itemIndex] = {
        ...(items[itemIndex] ?? {}),
        ...patch,
      };

      return {
        ...currentContent,
        [arrayKey]: items,
      };
    });
  }

  function moveArrayItem(arrayKey, itemIndex, direction) {
    setContent((currentContent) => {
      const items = [...(currentContent[arrayKey] ?? [])];
      const nextIndex = itemIndex + direction;

      if (nextIndex < 0 || nextIndex >= items.length) {
        return currentContent;
      }

      [items[itemIndex], items[nextIndex]] = [items[nextIndex], items[itemIndex]];

      return {
        ...currentContent,
        [arrayKey]: items,
      };
    });
  }

  function removeArrayItem(arrayKey, itemIndex) {
    setContent((currentContent) => ({
      ...currentContent,
      [arrayKey]: (currentContent[arrayKey] ?? []).filter((_, index) => index !== itemIndex),
    }));
  }

  function addArrayItem(arrayKey, bodyField, maxItems = PAGE_CONTENT_LIMITS.blocks) {
    setContent((currentContent) => {
      const currentItems = currentContent[arrayKey] ?? [];

      if (currentItems.length >= maxItems) {
        return currentContent;
      }

      return {
        ...currentContent,
        [arrayKey]: [...currentItems, buildEmptyItem(bodyField)],
      };
    });
  }

  return {
    updateRoot,
    updateObject,
    updateArrayItem,
    moveArrayItem,
    removeArrayItem,
    addArrayItem,
  };
}

function ImageFields({ imagePath, imageAlt, imagePosition, includePosition = false, onChange }) {
  return (
    <>
      <ImagePathField imagePath={imagePath} imageAlt={imageAlt} onChange={onChange} />
      <TextField
        label="Alt текст (задължителен при снимка)"
        value={imageAlt}
        onChange={(value) => onChange({ imageAlt: value })}
      />
      {includePosition ? (
        <label className="page-content-admin-field">
          <span>Позиция на снимката</span>
          <select value={imagePosition ?? 'right'} onChange={(event) => onChange({ imagePosition: event.target.value })}>
            {PAGE_CONTENT_IMAGE_POSITION_VALUES.map((position) => (
              <option key={position} value={position}>
                {position === 'left' ? 'Ляво' : 'Дясно'}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

function CtaFields({ item = {}, onChange, targetOptions = [] }) {
  const hasTarget = Boolean(item.ctaTo);

  useEffect(() => {
    if (!hasTarget && item.ctaLabel) {
      onChange({ ctaLabel: '', ctaTo: '' });
    }
  }, [hasTarget, item.ctaLabel, onChange]);

  return (
    <>
      <label className="page-content-admin-field">
        <span>Дестинация на бутона</span>
        <select
          value={item.ctaTo ?? ''}
          onChange={(event) => {
            const ctaTo = event.target.value;
            onChange(ctaTo ? { ctaTo } : { ctaLabel: '', ctaTo: '' });
          }}
        >
          <option value="">Без бутон</option>
          {targetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label="Текст на бутона"
        value={hasTarget ? item.ctaLabel : ''}
        disabled={!hasTarget}
        placeholder={hasTarget ? '' : 'Първо избери дестинация'}
        onChange={(value) => onChange({ ctaLabel: value })}
      />
    </>
  );
}

function HeroEditor({ hero = {}, onChange, includeDescription = false, includeCta = false, ctaTargetOptions = [] }) {
  return (
    <SectionCard title="Първи блок">
      <div className="page-content-admin-form-grid">
        <TextField label="Заглавие" value={hero.title} onChange={(value) => onChange({ title: value })} />
        <ImagePathField imagePath={hero.imagePath} imageAlt="" onChange={onChange} />
        {includeDescription ? (
          <TextareaField
            label="Подзаглавие"
            value={hero.description}
            onChange={(value) => onChange({ description: value })}
          />
        ) : null}
        {includeCta ? <CtaFields item={hero} onChange={onChange} targetOptions={ctaTargetOptions} /> : null}
      </div>
    </SectionCard>
  );
}

function ObjectBlockEditor({
  item = {},
  title,
  onChange,
  bodyField = 'text',
  bodyLabel = 'Текст',
  useParagraphs = false,
  includeImage = true,
  includeImagePosition = false,
  includeCta = true,
  wrapInCard = true,
  ctaTargetOptions = [],
}) {
  const bodyValue = useParagraphs ? (item.paragraphs ?? []).join('\n\n') : item[bodyField];
  const fields = (
    <div className="page-content-admin-form-grid">
      <TextField label="Заглавие" value={item.title} onChange={(value) => onChange({ title: value })} />
      <TextareaField
        label={bodyLabel}
        value={bodyValue}
        onChange={(value) =>
          onChange(useParagraphs ? { paragraphs: textToParagraphs(value) } : { [bodyField]: value })
        }
        rows={6}
      />
      {includeImage ? (
        <ImageFields
          imagePath={item.imagePath}
          imageAlt={item.imageAlt}
          imagePosition={item.imagePosition}
          includePosition={includeImagePosition}
          onChange={onChange}
        />
      ) : null}
      {includeCta ? <CtaFields item={item} onChange={onChange} targetOptions={ctaTargetOptions} /> : null}
    </div>
  );

  if (!wrapInCard) {
    return (
      <div className="page-content-admin-inline-editor">
        <h3>{title}</h3>
        {fields}
      </div>
    );
  }

  return (
    <SectionCard title={title}>
      {fields}
    </SectionCard>
  );
}

function EditableArray({
  title,
  items = [],
  arrayKey,
  editor,
  bodyField = 'text',
  onUpdate,
  onMove,
  onRemove,
  onAdd,
  maxItems = PAGE_CONTENT_LIMITS.blocks,
}) {
  return (
    <SectionCard title={title}>
      <div className="page-content-admin-block-list">
        {items.map((item, index) => (
          <article key={item.id ?? `${arrayKey}-${index}`} className="page-content-admin-block">
            <div className="page-content-admin-block-toolbar">
              <VisibilityField
                checked={item.isVisible !== false}
                onChange={(isVisible) => onUpdate(arrayKey, index, { isVisible })}
              />
              <div className="page-content-admin-block-actions">
                <button type="button" onClick={() => onMove(arrayKey, index, -1)} disabled={index === 0}>
                  Нагоре
                </button>
                <button type="button" onClick={() => onMove(arrayKey, index, 1)} disabled={index === items.length - 1}>
                  Надолу
                </button>
                <button type="button" onClick={() => onRemove(arrayKey, index)}>
                  Премахни
                </button>
              </div>
            </div>
            {editor(item, (patch) => onUpdate(arrayKey, index, patch))}
          </article>
        ))}
      </div>

      <button
        type="button"
        className="page-content-admin-secondary-action"
        disabled={items.length >= maxItems}
        onClick={() => onAdd(arrayKey, bodyField, maxItems)}
      >
        Добави блок
      </button>
    </SectionCard>
  );
}

function SectionMetaEditor({ item = {}, title, onChange, includeCount = false, countLabel = 'Брой елементи', ctaTargetOptions = [] }) {
  return (
    <SectionCard title={title}>
      <div className="page-content-admin-form-grid">
        <TextField label="Заглавие" value={item.title} onChange={(value) => onChange({ title: value })} />
        <TextareaField
          label="Описание"
          value={item.description}
          onChange={(value) => onChange({ description: value })}
          rows={4}
        />
        <CtaFields item={item} onChange={onChange} targetOptions={ctaTargetOptions} />
        {includeCount ? (
          <NumberField label={countLabel} value={item.count} onChange={(value) => onChange({ count: value })} />
        ) : null}
      </div>
    </SectionCard>
  );
}

function HomeContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor
        hero={content.hero}
        includeDescription
        includeCta
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('hero', patch)}
      />
      <ObjectBlockEditor
        item={content.about}
        title="Блок „За приюта“"
        bodyLabel="Параграфи"
        useParagraphs
        includeImage
        includeCta
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('about', patch)}
      />
      <EditableArray
        title="Блокове за доброволчество и дарение"
        items={content.helpCards}
        arrayKey="helpCards"
        bodyField="description"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        maxItems={PAGE_CONTENT_LIMITS.cards}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="description"
            bodyLabel="Описание"
            includeImage={false}
            includeCta
            ctaTargetOptions={ctaTargetOptions}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <SectionMetaEditor
        title="Секция „Истории за спасявания“"
        item={content.rescueStoriesSection}
        includeCount
        countLabel="Брой истории"
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('rescueStoriesSection', patch)}
      />
    </>
  );
}

function AboutContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <EditableArray
        title="Информационни блокове"
        items={content.blocks}
        arrayKey="blocks"
        bodyField="text"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="text"
            includeImage
            includeImagePosition
            includeCta
            ctaTargetOptions={ctaTargetOptions}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <EditableArray
        title="Мисия и крайна цел"
        items={content.toggles}
        arrayKey="toggles"
        bodyField="text"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        maxItems={PAGE_CONTENT_LIMITS.cards}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Секция'}
            bodyField="text"
            includeImage={false}
            includeCta={false}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
    </>
  );
}

function SupportContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <EditableArray
        title="Общи информационни блокове"
        items={content.infoBlocks}
        arrayKey="infoBlocks"
        bodyField="text"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="text"
            includeImage
            includeImagePosition
            includeCta
            ctaTargetOptions={ctaTargetOptions}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <EditableArray
        title="Карти за подкрепа"
        items={content.actionCards}
        arrayKey="actionCards"
        bodyField="description"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        maxItems={PAGE_CONTENT_LIMITS.cards}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Карта'}
            bodyField="description"
            bodyLabel="Описание"
            includeImage
            includeCta
            ctaTargetOptions={ctaTargetOptions}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
    </>
  );
}

function AnimalsOverviewContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <EditableArray
        title="Общи информационни блокове"
        items={content.infoBlocks}
        arrayKey="infoBlocks"
        bodyField="text"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="text"
            includeImage
            includeImagePosition
            includeCta
            ctaTargetOptions={ctaTargetOptions}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <SectionMetaEditor
        title="Секция „Видове животни“"
        item={content.speciesSection}
        includeCount
        countLabel="Брой видове"
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('speciesSection', patch)}
      />
      <SectionMetaEditor
        title="Секция „Истории“"
        item={content.storiesSection}
        includeCount
        countLabel="Брой истории"
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('storiesSection', patch)}
      />
    </>
  );
}

function AnimalsInfoContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <SectionCard title="Въвеждащ текст">
        <div className="page-content-admin-form-grid">
          <TextField
            label="Заглавие"
            value={content.intro?.title}
            onChange={(value) => editors.updateObject('intro', { title: value })}
          />
          <TextareaField
            label="Описание"
            value={content.intro?.description}
            onChange={(value) => editors.updateObject('intro', { description: value })}
            rows={4}
          />
          <TextField
            label="Кратка инструкция"
            value={content.intro?.note}
            onChange={(value) => editors.updateObject('intro', { note: value })}
          />
        </div>
      </SectionCard>
    </>
  );
}

function RescueStoriesContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <ObjectBlockEditor
        item={content.introBlock}
        title="Въвеждащ блок"
        bodyField="text"
        includeImage
        includeImagePosition
        includeCta={false}
        onChange={(patch) => editors.updateObject('introBlock', patch)}
      />
      <SectionCard title="Секция с истории">
        <div className="page-content-admin-form-grid">
          <TextField
            label="Заглавие"
            value={content.listSection?.title}
            onChange={(value) => editors.updateObject('listSection', { title: value })}
          />
          <TextField
            label="Заглавие над бутона"
            value={content.listSection?.ctaTitle}
            onChange={(value) => editors.updateObject('listSection', { ctaTitle: value })}
          />
          <TextareaField
            label="Празно състояние"
            value={content.listSection?.emptyState}
            onChange={(value) => editors.updateObject('listSection', { emptyState: value })}
            rows={3}
          />
          <CtaFields
            item={content.listSection}
            targetOptions={ctaTargetOptions}
            onChange={(patch) => editors.updateObject('listSection', patch)}
          />
        </div>
      </SectionCard>
    </>
  );
}

function VolunteeringContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <ObjectBlockEditor
        item={content.reasonBlock}
        title="Информационен блок"
        bodyField="text"
        includeImage
        includeCta
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('reasonBlock', patch)}
      />
      <SectionCard title="Текстове около формата">
        <div className="page-content-admin-form-grid">
          <TextareaField
            label="Текст над формата"
            value={content.formIntro}
            onChange={(value) => editors.updateRoot({ formIntro: value })}
            rows={3}
          />
          <TextareaField
            label="Инструкции и условия"
            value={content.instructions}
            onChange={(value) => editors.updateRoot({ instructions: value })}
            rows={4}
          />
        </div>
      </SectionCard>
    </>
  );
}

function DonationsContentEditor({ content, editors, ctaTargetOptions }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <ObjectBlockEditor
        item={content.reasonBlock}
        title="Информационен блок „Защо да дариш“"
        bodyField="text"
        includeImage
        includeCta
        ctaTargetOptions={ctaTargetOptions}
        onChange={(patch) => editors.updateObject('reasonBlock', patch)}
      />
      <SectionCard title="Допълнителни указания">
        <div className="page-content-admin-form-grid">
          <TextareaField
            label="За какво се използват даренията"
            value={content.useOfDonations}
            onChange={(value) => editors.updateRoot({ useOfDonations: value })}
            rows={4}
          />
          <TextareaField
            label="Кампания или бележка"
            value={content.campaignNote}
            onChange={(value) => editors.updateRoot({ campaignNote: value })}
            rows={4}
          />
        </div>
      </SectionCard>
    </>
  );
}

function ContactContentEditor({ content, editors, ctaTargetOptions }) {
  const contactTypeEntries = Object.entries(content.contactTypeLabels ?? {});

  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <EditableArray
        title="Текстово-графични блокове"
        items={content.infoBlocks}
        arrayKey="infoBlocks"
        bodyField="text"
        onUpdate={editors.updateArrayItem}
        onMove={editors.moveArrayItem}
        onRemove={editors.removeArrayItem}
        onAdd={editors.addArrayItem}
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="text"
            includeImage
            includeImagePosition
            includeCta={false}
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <SectionCard title="Инструкции към формата">
        <div className="page-content-admin-form-grid">
          <TextareaField
            label="Текст преди избора на тип"
            value={content.typeSelectorIntro}
            onChange={(value) => editors.updateRoot({ typeSelectorIntro: value })}
            rows={3}
          />
          <TextField
            label="Заглавие над типовете"
            value={content.typeSelectorTitle}
            onChange={(value) => editors.updateRoot({ typeSelectorTitle: value })}
          />
          <TextareaField
            label="Текст в началото на формата"
            value={content.formIntro}
            onChange={(value) => editors.updateRoot({ formIntro: value })}
            rows={3}
          />
        </div>
      </SectionCard>
      <SectionCard title="Labels на типовете запитвания">
        <div className="page-content-admin-block-list">
          {contactTypeEntries.map(([typeValue, typeContent]) => (
            <article key={typeValue} className="page-content-admin-block">
              <div className="page-content-admin-inline-editor">
                <h3>{typeValue}</h3>
                <div className="page-content-admin-form-grid">
                  <TextField
                    label="Label"
                    value={typeContent.label}
                    onChange={(value) =>
                      editors.updateObject('contactTypeLabels', {
                        [typeValue]: { ...typeContent, label: value },
                      })
                    }
                  />
                  <TextareaField
                    label="Описание"
                    value={typeContent.description}
                    onChange={(value) =>
                      editors.updateObject('contactTypeLabels', {
                        [typeValue]: { ...typeContent, description: value },
                      })
                    }
                    rows={3}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function PageContentManagementPage({ role }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromUrl = searchParams.get('page');
  const selectedPage = PAGE_CONTENT_KEYS.includes(pageFromUrl) ? pageFromUrl : 'home';
  const defaultContent = useMemo(() => getDefaultPageContent(selectedPage), [selectedPage]);
  const [content, setContent] = useState(() => clonePageContent(defaultContent));
  const [lastSavedContent, setLastSavedContent] = useState(() => clonePageContent(defaultContent));
  const [pendingPage, setPendingPage] = useState('');
  const [pendingBlockRemoval, setPendingBlockRemoval] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorFeedbackRef = useErrorFeedbackFocus(errorMessage);
  const contentDashboardPath = role === 'admin' ? '/admin/content' : '/staff/content';
  const contentEditors = useContentObjectEditor(content, setContent);
  const editors = {
    ...contentEditors,
    removeArrayItem: (arrayKey, itemIndex) => {
      setPendingBlockRemoval({ arrayKey, itemIndex });
    },
  };
  const ctaTargetOptions = useMemo(() => getPageContentCtaTargetOptions(selectedPage), [selectedPage]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(lastSavedContent),
    [content, lastSavedContent]
  );
  const { pendingNavigationPath, confirmNavigation, cancelNavigation } =
    useUnsavedChangesGuard(hasUnsavedChanges);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setStatusMessage('');
    setErrorMessage('');
    const nextDefaultContent = clonePageContent(defaultContent);
    setContent(nextDefaultContent);
    setLastSavedContent(clonePageContent(nextDefaultContent));
    setPendingPage('');
    setPendingBlockRemoval(null);

    fetchJson(`/api/page-content/${selectedPage}`)
      .then((pageContent) => {
        if (isMounted) {
          const nextContent = mergePageContent(defaultContent, pageContent?.content);
          setContent(nextContent);
          setLastSavedContent(clonePageContent(nextContent));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [defaultContent, selectedPage]);

  function handlePageChange(nextPage) {
    if (nextPage === selectedPage) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingPage(nextPage);
      return;
    }

    setSearchParams({ page: nextPage });
  }

  function confirmPageChange() {
    if (!pendingPage) {
      return;
    }

    const nextPage = pendingPage;
    setPendingPage('');
    setSearchParams({ page: nextPage });
  }

  function confirmBlockRemoval() {
    if (!pendingBlockRemoval) {
      return;
    }

    contentEditors.removeArrayItem(
      pendingBlockRemoval.arrayKey,
      pendingBlockRemoval.itemIndex
    );
    setPendingBlockRemoval(null);
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedContent = await patchJson(`/api/page-content/${selectedPage}`, { content });
      const nextContent = mergePageContent(defaultContent, savedContent?.content);
      setContent(nextContent);
      setLastSavedContent(clonePageContent(nextContent));
      setStatusMessage('Промените са запазени успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetDefaults() {
    setContent(clonePageContent(defaultContent));
    setStatusMessage('Заредени са началните стойности. Запази, ако искаш да ги приложиш.');
  }

  function renderEditor() {
    const editorProps = { content, editors, ctaTargetOptions };

    if (selectedPage === 'about') {
      return <AboutContentEditor {...editorProps} />;
    }

    if (selectedPage === 'support') {
      return <SupportContentEditor {...editorProps} />;
    }

    if (selectedPage === 'animals-overview') {
      return <AnimalsOverviewContentEditor {...editorProps} />;
    }

    if (selectedPage === 'animals-info') {
      return <AnimalsInfoContentEditor {...editorProps} />;
    }

    if (selectedPage === 'rescue-stories') {
      return <RescueStoriesContentEditor {...editorProps} />;
    }

    if (selectedPage === 'volunteering') {
      return <VolunteeringContentEditor {...editorProps} />;
    }

    if (selectedPage === 'donations') {
      return <DonationsContentEditor {...editorProps} />;
    }

    if (selectedPage === 'contact') {
      return <ContactContentEditor {...editorProps} />;
    }

    return <HomeContentEditor {...editorProps} />;
  }

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero page-content-admin-hero-wide">
        <div>
          <p className="route-meta">Съдържание на публичните страници</p>
          <h1>Редакция на блокове</h1>
          <p>Запазените промени се показват веднага в публичните страници.</p>
        </div>
        <Link className="app-secondary-action" to={contentDashboardPath}>
          Към управление на съдържанието
        </Link>
      </section>

      <form className="page-content-admin-layout" onSubmit={handleSave}>
        <aside className="page-content-admin-sidebar">
          <label className="page-content-admin-field">
            <span>Страница</span>
            <select
              value={selectedPage}
              disabled={isLoading || isSaving}
              onChange={(event) => handlePageChange(event.target.value)}
            >
              {PAGE_CONTENT_CONFIGS.map((page) => (
                <option key={page.key} value={page.key}>
                  {page.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? 'Запазване...' : 'Запази промените'}
          </button>
          <button
            type="button"
            className="page-content-admin-secondary-action"
            disabled={isLoading || isSaving}
            onClick={handleResetDefaults}
          >
            Върни началните стойности
          </button>

          {statusMessage ? <p className="feedback-message feedback-message-info">{statusMessage}</p> : null}
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
        </aside>

        <div className="page-content-admin-editor">
          {isLoading ? <p className="route-card">Зареждане на съдържанието...</p> : renderEditor()}
        </div>
      </form>

      <ConfirmDialog
        isOpen={Boolean(pendingNavigationPath)}
        title="Незапазени промени"
        description="Промените по текущата страница не са запазени. Сигурен ли си, че искаш да я напуснеш?"
        confirmLabel="Продължи без запазване"
        tone="default"
        onConfirm={confirmNavigation}
        onClose={cancelNavigation}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingPage)}
        title="Незапазени промени"
        description={`Промените по „${PAGE_CONTENT_LABELS[selectedPage]}“ не са запазени. Да преминем ли към „${PAGE_CONTENT_LABELS[pendingPage] ?? ''}“?`}
        confirmLabel="Продължи без запазване"
        tone="default"
        onConfirm={confirmPageChange}
        onClose={() => setPendingPage('')}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingBlockRemoval)}
        title="Премахване на блок"
        description="Сигурен ли си, че искаш да премахнеш този блок? Промяната ще бъде приложена след записване на страницата."
        confirmLabel="Премахни блока"
        tone="danger"
        onConfirm={confirmBlockRemoval}
        onClose={() => setPendingBlockRemoval(null)}
      />
    </main>
  );
}
