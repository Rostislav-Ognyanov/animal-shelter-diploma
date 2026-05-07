export function FilterRail({
  filterPanel,
  filters,
  isOpen,
  onFilterChange,
  onSubmit,
  onToggle,
}) {
  const selectedSpecies = filters.species ?? filters.type ?? '';

  return (
    <aside className="filter-rail" aria-label="Филтриране на животни">
      <button
        id="filter-toggle"
        className="filter-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="filter-panel"
        onClick={onToggle}
      >
        <span></span>
        <span></span>
        <span></span>
        <span className="filter-toggle-label">Филтър</span>
      </button>

      <aside id="filter-panel" className="filter-panel" aria-hidden={!isOpen}>
        <div className="filter-card">
          <div className="filter-card-header">
            <h2>{filterPanel.title}</h2>
            <p>{filterPanel.description}</p>
          </div>

          <form className="filter-form" onSubmit={onSubmit}>
            <label>
              Вид животно
              <select
                name="species"
                value={selectedSpecies}
                onChange={(event) => onFilterChange('species', event.target.value)}
              >
                {filterPanel.types.map((option) => (
                  <option key={`type-${option.value || 'all'}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Големина
              <select
                name="size"
                value={filters.size}
                onChange={(event) => onFilterChange('size', event.target.value)}
              >
                {filterPanel.sizes.map((option) => (
                  <option key={`size-${option.value || 'all'}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">{filterPanel.submitLabel}</button>
          </form>
        </div>
      </aside>
    </aside>
  );
}

