/** Preserve only the state meaningful across translated routes. */
export function initLanguageLinks(): void {
  const fragmentLinks = document.querySelectorAll<HTMLAnchorElement>('a[data-preserve-fragment="true"]');
  const updateFragments = () => {
    const fragment = /^#to=[^#]+$/.test(window.location.hash) ? window.location.hash : '';
    for (const link of fragmentLinks) {
      const target = new URL(link.href, window.location.origin);
      if (target.origin !== window.location.origin) continue;
      target.hash = fragment;
      link.href = target.href;
    }
  };
  if (fragmentLinks.length) {
    updateFragments();
    window.addEventListener('hashchange', updateFragments);
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-preserve-query="true"]')) {
    link.addEventListener('click', () => {
      const query = new URLSearchParams(window.location.search).get('q')?.slice(0, 120);
      const target = new URL(link.href, window.location.origin);
      if (target.origin !== window.location.origin) return;
      if (query) target.searchParams.set('q', query);
      else target.searchParams.delete('q');
      link.href = target.href;
    });
  }
}
