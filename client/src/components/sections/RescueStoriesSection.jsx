const RESCUE_STORIES = [
  {
    title: 'Лили отново се чувства спокойна',
    text: 'Лили пристига след уличен инцидент и период на силен стрес. След лечение и търпелива грижа вече е по-спокойна, социална и готова за нов дом.',
  },
  {
    title: 'Гарфийлд свикна отново с домашна среда',
    text: 'След живот навън и дълъг период на несигурност, Гарфийлд постепенно възстановява доверие към хората и рутина в по-защитена среда.',
  },
  {
    title: 'Сидни е пример за внимателна дива помощ',
    text: 'При Сидни фокусът е върху безопасното възстановяване след контакт с рискова среда. Това е случай, в който преценката и спокойното възстановяване са решаващи.',
  },
];

export function RescueStoriesSection() {
  return (
    <section className="rescue-stories" id="rescue-stories-section">
      <div className="section-container rescue-stories-container">
        <div className="section-heading rescue-stories-heading">
          <div>
            <h2>Истории за спасявания</h2>
            <p>Някои от животните ни стигат до приюта след трудни ситуации, но с лечение, грижа и време успяват да започнат отначало.</p>
          </div>
        </div>

        <div className="rescue-stories-grid">
          {RESCUE_STORIES.map((story) => (
            <article key={story.title} className="rescue-story-card">
              <h3>{story.title}</h3>
              <p>{story.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
