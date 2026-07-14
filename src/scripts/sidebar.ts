type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

const links = Array.from(
  document.querySelectorAll<HTMLAnchorElement>('[data-sidebar-filter-link]')
);
const toggles = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-category-tree-toggle]')
);
const prefetched = new Set<string>();

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function markPending(link: HTMLAnchorElement): void {
  const kind = link.dataset.filterKind;
  const returnsToAllPosts = link.dataset.filterActive === 'true';
  for (const item of links) {
    item.classList.remove('cat-link--active', 'category-tree-link--active', 'tag-box--active');
    item.removeAttribute('aria-current');
  }
  if (!returnsToAllPosts && kind === 'category') {
    link.classList.add('cat-link--active', 'category-tree-link--active');
    link.setAttribute('aria-current', 'page');
  }
  if (!returnsToAllPosts && kind === 'tag') {
    link.classList.add('tag-box--active');
    link.setAttribute('aria-current', 'page');
  }
  document.querySelector<HTMLElement>('#main-content')?.setAttribute('aria-busy', 'true');
}

function canPrefetch(): boolean {
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };
  const connection = nav.connection;
  return !(
    document.visibilityState !== 'visible' ||
    connection?.saveData ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) ||
    (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2)
  );
}

function prefetch(link: HTMLAnchorElement): void {
  if (!canPrefetch()) return;
  const target = new URL(link.href, window.location.href);
  if (target.origin !== window.location.origin || prefetched.has(target.href)) return;
  const hint = document.createElement('link');
  hint.rel = 'prefetch';
  hint.href = target.href;
  document.head.append(hint);
  prefetched.add(target.href);
}

for (const link of links) {
  link.addEventListener('click', event => {
    if (isPlainLeftClick(event)) markPending(link);
  });
  link.addEventListener('pointerenter', () => prefetch(link), { passive: true });
  link.addEventListener('focus', () => prefetch(link), { passive: true });
}

for (const toggle of toggles) {
  toggle.addEventListener('click', () => {
    const controls = toggle.getAttribute('aria-controls');
    const children = controls ? document.getElementById(controls) : null;
    if (!children) return;
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(willOpen));
    children.hidden = !willOpen;
  });
}
