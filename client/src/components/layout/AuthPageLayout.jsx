export function AuthPageLayout({ kicker, title, description, children, supportLinks }) {
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-form-panel auth-form-panel-left">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {children}

          <div className="auth-support-links">{supportLinks}</div>
        </div>

        <div className="auth-side-panel">
          <div className="auth-side-panel-inner auth-shelter-note">
            <h2>Спасените животни получават нов шанс</h2>
            <p>
              Приютът осигурява временен дом, медицинска грижа и спокойна среда за спасени
              животни, докато намерят своите осиновители.
            </p>
            <p>
              Всяко постъпило животно преминава през наблюдение, възстановяване и подготовка
              за ново начало.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
