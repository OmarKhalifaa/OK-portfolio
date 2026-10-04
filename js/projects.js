(() => {
  const grid = document.getElementById('projectsGrid');
  const filters = document.getElementById('projectsFilters');
  if (!grid || !filters) return;

  const cards = [...grid.querySelectorAll('.projects-card')];
  const buttons = [...filters.querySelectorAll('[data-project-filter]')];
  const status = document.getElementById('projectsFilterStatus');

  const selectFilter = value => {
    const visible = [];
    cards.forEach(card => {
      const matches = value === 'all' || card.dataset.projectCategory === value;
      card.hidden = !matches;
      if (matches) visible.push(card);
    });
    visible.forEach((card, index) => {
      card.dataset.gridColumn = String(index % 2 + 1);
      card.dataset.gridRow = String(Math.floor(index / 2) + 1);
    });
    grid.dataset.hasEmptyCell = String(visible.length % 2 === 1);
    grid.dataset.visibleCount = String(visible.length);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectFilter === value)));
    if (status) status.textContent = `${visible.length} ${visible.length === 1 ? 'project' : 'projects'} shown`;
  };

  buttons.forEach(button => button.addEventListener('click', () => selectFilter(button.dataset.projectFilter)));
  selectFilter('all');
  filters.hidden = false;
})();
