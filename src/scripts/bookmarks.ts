const panels = document.querySelectorAll<HTMLElement>('.bookmark-panel');

for (const panel of panels) {
  const rows = panel.querySelector<HTMLElement>('.bookmark-rows');
  const up = panel.querySelector<HTMLButtonElement>('.scroll-arrow-up');
  const down = panel.querySelector<HTMLButtonElement>('.scroll-arrow-down');
  if (!rows || !up || !down) continue;

  let framePending = false;
  const update = () => {
    const hasScroll = rows.scrollHeight > rows.clientHeight + 2;
    up.classList.toggle('is-visible', hasScroll && rows.scrollTop > 2);
    down.classList.toggle(
      'is-visible',
      hasScroll && rows.scrollTop + rows.clientHeight < rows.scrollHeight - 2
    );
    framePending = false;
  };
  const scheduleUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(update);
  };
  const scrollBy = (top: number) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rows.scrollBy({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  up.addEventListener('click', () => scrollBy(-80));
  down.addEventListener('click', () => scrollBy(80));
  rows.addEventListener('scroll', scheduleUpdate, { passive: true });
  panel.addEventListener('mouseenter', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  update();
}
