/* ── CARD POINTER EFFECTS ── */
(() => {
  const cards = document.querySelectorAll('.halo-card, .projects-card');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!cards.length || reduceMotion.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let animationFrame = null;
  let activeCard;
  let x, y;
  const positionPill = card => {
    const rect = card.getBoundingClientRect();
    const cta = card.querySelector('.card-cta');
    const localX = x - rect.left;
    const localY = y - rect.top;
    card.style.setProperty('--mx', `${localX}px`);
    card.style.setProperty('--my', `${localY}px`);
    if (cta) {
      card.style.setProperty('--cta-x', `${Math.max(8, Math.min(localX + 12, rect.width - cta.offsetWidth - 8))}px`);
      card.style.setProperty('--cta-y', `${Math.max(8, Math.min(localY + 12, rect.height - cta.offsetHeight - 8))}px`);
    }
  };
  cards.forEach(card => {
    card.classList.add('card-pointer-enabled');
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || reduceMotion.matches) return;
      activeCard = card;
      x = event.clientX;
      y = event.clientY;
      // Establish the cursor position before starting the pill's fade-in.
      positionPill(card);
      card.classList.add('card-pointer-active');
    }, { passive: true });
    card.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || reduceMotion.matches) return;
      activeCard = card;
      x = event.clientX;
      y = event.clientY;
      if (animationFrame !== null) return;
      animationFrame = requestAnimationFrame(() => {
        if (!activeCard) { animationFrame = null; return; }
        positionPill(activeCard);
        activeCard.classList.add('card-pointer-active');
        animationFrame = null;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('card-pointer-active');
      if (activeCard === card) activeCard = null;
    });
  });
})();
