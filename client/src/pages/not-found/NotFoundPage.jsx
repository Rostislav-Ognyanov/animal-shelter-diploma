export function NotFoundPage() {
  return (
    <section className="route-shell">
      <div className="route-card">
        <p className="route-meta">404</p>
        <h1>Страницата не е намерена</h1>
        <p>Адресът не съществува или вече не е част от текущата навигация на приложението.</p>

        <ul className="route-list">
          <li>провери URL адреса</li>
          <li>върни се към началната страница</li>
          <li>използвай наличните менюта и страници</li>
        </ul>

        <p className="route-note">
          Ако си стигнал дотук чрез стар линк, той вероятно вече е премахнат от активния интерфейс.
        </p>
      </div>
    </section>
  );
}
