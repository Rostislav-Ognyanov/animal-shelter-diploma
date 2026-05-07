import { PagePlaceholder } from '../../components/layout/PagePlaceholder.jsx';

export function NotFoundPage() {
  return (
    <PagePlaceholder
      kicker="404"
      title="Страницата не е намерена"
      description="Адресът не съществува или вече не е част от текущата навигация на приложението."
      items={[
        'провери URL адреса',
        'върни се към началната страница',
        'използвай наличните менюта и страници',
      ]}
      note="Ако си стигнал дотук чрез стар линк, той вероятно вече е премахнат от активния интерфейс."
    />
  );
}
