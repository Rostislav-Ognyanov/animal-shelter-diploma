export function AboutSection({ about }) {
  return (
    <section className="about" id="about-section">
      <div className="section-container about-content">
        <h2>{about.title}</h2>
        <div className="about-copy">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
