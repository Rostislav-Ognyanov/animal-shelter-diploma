export function PagePlaceholder({
  title,
  description,
  items = [],
  note = '',
  kicker = 'Информация',
}) {
  return (
    <section className="route-shell">
      <div className="route-card">
        <p className="route-meta">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>

        {items.length > 0 ? (
          <ul className="route-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {note ? <p className="route-note">{note}</p> : null}
      </div>
    </section>
  );
}
