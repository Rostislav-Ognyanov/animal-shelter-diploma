import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchJson, patchJson } from '../../lib/api.js';
import {
  getDefaultPageContent,
  PAGE_CONTENT_CONFIGS,
} from './pageContentDefaults.js';
import { clonePageContent, mergePageContent } from './pageContentUtils.js';

const PAGE_CONTENT_KEYS = PAGE_CONTENT_CONFIGS.map((config) => config.key);

function textToParagraphs(value) {
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildEmptyItem(bodyField = 'text') {
  return {
    id: `block-${Date.now()}`,
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

function TextField({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
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

function NumberField({ label, value, onChange, min = 1, max = 12 }) {
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

  function addArrayItem(arrayKey, bodyField) {
    setContent((currentContent) => ({
      ...currentContent,
      [arrayKey]: [...(currentContent[arrayKey] ?? []), buildEmptyItem(bodyField)],
    }));
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
      <TextField label="Снимка" value={imagePath} onChange={(value) => onChange({ imagePath: value })} />
      <TextField label="Alt текст" value={imageAlt} onChange={(value) => onChange({ imageAlt: value })} />
      {includePosition ? (
        <label className="page-content-admin-field">
          <span>Позиция на снимката</span>
          <select value={imagePosition ?? 'right'} onChange={(event) => onChange({ imagePosition: event.target.value })}>
            <option value="right">Дясно</option>
            <option value="left">Ляво</option>
          </select>
        </label>
      ) : null}
    </>
  );
}

function CtaFields({ item, onChange }) {
  return (
    <>
      <TextField label="CTA надпис" value={item.ctaLabel} onChange={(value) => onChange({ ctaLabel: value })} />
      <TextField label="CTA линк" value={item.ctaTo} onChange={(value) => onChange({ ctaTo: value })} />
    </>
  );
}

function HeroEditor({ hero = {}, onChange, includeDescription = false, includeCta = false }) {
  return (
    <SectionCard title="Първи блок">
      <div className="page-content-admin-form-grid">
        <TextField label="Заглавие" value={hero.title} onChange={(value) => onChange({ title: value })} />
        <TextField label="Фонова снимка" value={hero.imagePath} onChange={(value) => onChange({ imagePath: value })} />
        {includeDescription ? (
          <TextareaField
            label="Подзаглавие"
            value={hero.description}
            onChange={(value) => onChange({ description: value })}
          />
        ) : null}
        {includeCta ? <CtaFields item={hero} onChange={onChange} /> : null}
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
      {includeCta ? <CtaFields item={item} onChange={onChange} /> : null}
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

      <button type="button" className="page-content-admin-secondary-action" onClick={() => onAdd(arrayKey, bodyField)}>
        Добави блок
      </button>
    </SectionCard>
  );
}

function SectionMetaEditor({ item = {}, title, onChange, includeCount = false }) {
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
        <CtaFields item={item} onChange={onChange} />
        {includeCount ? (
          <NumberField label="Брой истории" value={item.count} onChange={(value) => onChange({ count: value })} />
        ) : null}
      </div>
    </SectionCard>
  );
}

function HomeContentEditor({ content, editors }) {
  return (
    <>
      <HeroEditor
        hero={content.hero}
        includeDescription
        includeCta
        onChange={(patch) => editors.updateObject('hero', patch)}
      />
      <ObjectBlockEditor
        item={content.about}
        title="Блок „За приюта“"
        bodyLabel="Параграфи"
        useParagraphs
        includeImage
        includeCta
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
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Блок'}
            bodyField="description"
            bodyLabel="Описание"
            includeImage={false}
            includeCta
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <SectionMetaEditor
        title="Секция „Истории за спасявания“"
        item={content.rescueStoriesSection}
        onChange={(patch) => editors.updateObject('rescueStoriesSection', patch)}
      />
    </>
  );
}

function AboutContentEditor({ content, editors }) {
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

function SupportContentEditor({ content, editors }) {
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
        editor={(item, onChange) => (
          <ObjectBlockEditor
            item={item}
            title={item.title ?? 'Карта'}
            bodyField="description"
            bodyLabel="Описание"
            includeImage
            includeCta
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
    </>
  );
}

function AnimalsOverviewContentEditor({ content, editors }) {
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
            wrapInCard={false}
            onChange={onChange}
          />
        )}
      />
      <SectionMetaEditor
        title="Секция „Видове животни“"
        item={content.speciesSection}
        onChange={(patch) => editors.updateObject('speciesSection', patch)}
      />
      <SectionMetaEditor
        title="Секция „Истории“"
        item={content.storiesSection}
        onChange={(patch) => editors.updateObject('storiesSection', patch)}
      />
    </>
  );
}

function AnimalsInfoContentEditor({ content, editors }) {
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

function RescueStoriesContentEditor({ content, editors }) {
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
            label="CTA заглавие"
            value={content.listSection?.ctaTitle}
            onChange={(value) => editors.updateObject('listSection', { ctaTitle: value })}
          />
          <TextareaField
            label="Празно състояние"
            value={content.listSection?.emptyState}
            onChange={(value) => editors.updateObject('listSection', { emptyState: value })}
            rows={3}
          />
          <TextField
            label="CTA надпис"
            value={content.listSection?.ctaLabel}
            onChange={(value) => editors.updateObject('listSection', { ctaLabel: value })}
          />
          <TextField
            label="CTA линк"
            value={content.listSection?.ctaTo}
            onChange={(value) => editors.updateObject('listSection', { ctaTo: value })}
          />
        </div>
      </SectionCard>
    </>
  );
}

function VolunteeringContentEditor({ content, editors }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <ObjectBlockEditor
        item={content.reasonBlock}
        title="Информационен блок"
        bodyField="text"
        includeImage
        includeCta
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

function DonationsContentEditor({ content, editors }) {
  return (
    <>
      <HeroEditor hero={content.hero} onChange={(patch) => editors.updateObject('hero', patch)} />
      <ObjectBlockEditor
        item={content.reasonBlock}
        title="Информационен блок „Защо да дариш“"
        bodyField="text"
        includeImage
        includeCta
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

function ContactContentEditor({ content, editors }) {
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
  const initialPage = PAGE_CONTENT_KEYS.includes(pageFromUrl) ? pageFromUrl : 'home';
  const [selectedPage, setSelectedPage] = useState(initialPage);
  const defaultContent = useMemo(() => getDefaultPageContent(selectedPage), [selectedPage]);
  const [content, setContent] = useState(() => clonePageContent(defaultContent));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';
  const editors = useContentObjectEditor(content, setContent);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setStatusMessage('');
    setErrorMessage('');
    setContent(clonePageContent(defaultContent));

    fetchJson(`/api/page-content/${selectedPage}`)
      .then((pageContent) => {
        if (isMounted) {
          setContent(mergePageContent(defaultContent, pageContent?.content));
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
    setSelectedPage(nextPage);
    setSearchParams({ page: nextPage });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedContent = await patchJson(`/api/page-content/${selectedPage}`, { content });
      setContent(mergePageContent(defaultContent, savedContent?.content));
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
    if (selectedPage === 'about') {
      return <AboutContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'support') {
      return <SupportContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'animals-overview') {
      return <AnimalsOverviewContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'animals-info') {
      return <AnimalsInfoContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'rescue-stories') {
      return <RescueStoriesContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'volunteering') {
      return <VolunteeringContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'donations') {
      return <DonationsContentEditor content={content} editors={editors} />;
    }

    if (selectedPage === 'contact') {
      return <ContactContentEditor content={content} editors={editors} />;
    }

    return <HomeContentEditor content={content} editors={editors} />;
  }

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero">
        <div>
          <p className="route-meta">Съдържание на публичните страници</p>
          <h1>Редакция на блокове</h1>
          <p>
            Промените се записват в MongoDB и се показват веднага в публичните страници.
          </p>
        </div>
        <Link className="animals-secondary-action" to={dashboardPath}>
          Назад
        </Link>
      </section>

      <form className="page-content-admin-layout" onSubmit={handleSave}>
        <aside className="page-content-admin-sidebar">
          <label className="page-content-admin-field">
            <span>Страница</span>
            <select value={selectedPage} onChange={(event) => handlePageChange(event.target.value)}>
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
          <button type="button" className="page-content-admin-secondary-action" onClick={handleResetDefaults}>
            Върни началните стойности
          </button>

          {statusMessage ? <p className="form-success-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="form-error-message">{errorMessage}</p> : null}
        </aside>

        <div className="page-content-admin-editor">
          {isLoading ? <p className="route-card">Зареждане на съдържанието...</p> : renderEditor()}
        </div>
      </form>
    </main>
  );
}
