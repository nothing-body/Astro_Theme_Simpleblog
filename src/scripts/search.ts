const PAGEFIND_MODULE_PATH = '/pagefind/pagefind.js';
const RESULTS_PER_PAGE = 8;
const MAX_QUERY_LENGTH = 120;

interface PagefindResultData {
  url: string;
  plain_excerpt: string;
  meta: Record<string, string | undefined>;
}

interface PagefindResultReference {
  data(): Promise<PagefindResultData>;
}

interface PagefindSearchResponse {
  results: PagefindResultReference[];
}

interface PagefindSearchOptions {
  filters?: Record<string, string>;
}

interface PagefindApi {
  init(): Promise<void>;
  options(options: {
    ranking: {
      termFrequency: number;
      termSimilarity: number;
      pageLength: number;
      termSaturation: number;
      metaWeights: Record<string, number>;
    };
  }): Promise<void>;
  filters(): Promise<Record<string, Record<string, number>>>;
  search(query: string, options?: PagefindSearchOptions): Promise<PagefindSearchResponse>;
  debouncedSearch(
    query: string,
    options: PagefindSearchOptions,
    debounceMs: number
  ): Promise<PagefindSearchResponse | null>;
}

interface SearchElements {
  root: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  filters: HTMLElement;
  category: HTMLSelectElement;
  tag: HTMLSelectElement;
  status: HTMLElement;
  results: HTMLOListElement;
  pagination: HTMLElement;
  previous: HTMLButtonElement;
  next: HTMLButtonElement;
  page: HTMLElement;
}

let pagefindPromise: Promise<PagefindApi> | undefined;

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing search element: ${selector}`);
  return element;
}

async function loadPagefind(): Promise<PagefindApi> {
  pagefindPromise ??= (async () => {
    const module = (await import(/* @vite-ignore */ PAGEFIND_MODULE_PATH)) as PagefindApi;
    await module.options({
      ranking: {
        termFrequency: 1,
        termSimilarity: 1,
        pageLength: 0.75,
        termSaturation: 1.4,
        metaWeights: { title: 5, description: 2, category: 1.5 },
      },
    });
    await module.init();
    return module;
  })().catch(error => {
    pagefindPromise = undefined;
    throw error;
  });
  return pagefindPromise;
}

function safeResultUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function option(select: HTMLSelectElement, value: string, count: number): void {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = `${value} (${count})`;
  select.append(item);
}

function message(
  root: HTMLElement,
  key: string,
  replacements: Record<string, number> = {}
): string {
  let value = root.dataset[key] ?? '';
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
}

class SearchController {
  readonly #elements: SearchElements;
  #initialization: Promise<PagefindApi> | undefined;
  #references: PagefindResultReference[] = [];
  #currentPage = 1;
  #request = 0;

  constructor(root: HTMLElement) {
    this.#elements = {
      root,
      form: requiredElement(root, '[data-search-form]'),
      input: requiredElement(root, '[data-search-input]'),
      filters: requiredElement(root, '[data-search-filters]'),
      category: requiredElement(root, '[data-search-category]'),
      tag: requiredElement(root, '[data-search-tag]'),
      status: requiredElement(root, '[data-search-status]'),
      results: requiredElement(root, '[data-search-results]'),
      pagination: requiredElement(root, '[data-search-pagination]'),
      previous: requiredElement(root, '[data-search-previous]'),
      next: requiredElement(root, '[data-search-next]'),
      page: requiredElement(root, '[data-search-page]'),
    };
  }

  start(): void {
    const params = new URLSearchParams(window.location.search);
    this.#elements.input.value = (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH);

    this.#elements.input.addEventListener('focus', () => void this.#initialize());
    this.#elements.input.addEventListener('input', () => void this.#search(true));
    this.#elements.form.addEventListener('submit', event => {
      event.preventDefault();
      void this.#search(false);
    });
    this.#elements.category.addEventListener('change', () => void this.#search(false));
    this.#elements.tag.addEventListener('change', () => void this.#search(false));
    this.#elements.previous.addEventListener('click', () => this.#showPage(this.#currentPage - 1));
    this.#elements.next.addEventListener('click', () => this.#showPage(this.#currentPage + 1));

    if (this.#elements.input.value.trim()) void this.#search(false);
  }

  async #initialize(): Promise<PagefindApi> {
    this.#initialization ??= (async () => {
      const api = await loadPagefind();
      await this.#loadFilters(api);
      return api;
    })().catch(error => {
      this.#initialization = undefined;
      throw error;
    });
    return this.#initialization;
  }

  async #loadFilters(api: PagefindApi): Promise<void> {
    const available = await api.filters();
    const params = new URLSearchParams(window.location.search);
    this.#appendFilterOptions(this.#elements.category, available.category ?? {});
    this.#appendFilterOptions(this.#elements.tag, available.tag ?? {});
    this.#restoreFilter(this.#elements.category, params.get('category'));
    this.#restoreFilter(this.#elements.tag, params.get('tag'));

    const hasFilters =
      this.#elements.category.options.length > 1 || this.#elements.tag.options.length > 1;
    this.#elements.filters.hidden = !hasFilters;
  }

  #appendFilterOptions(select: HTMLSelectElement, values: Record<string, number>): void {
    for (const [value, count] of Object.entries(values).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      option(select, value, count);
    }
    select.disabled = select.options.length <= 1;
  }

  #restoreFilter(select: HTMLSelectElement, value: string | null): void {
    if (value && [...select.options].some(item => item.value === value)) select.value = value;
  }

  #searchOptions(): PagefindSearchOptions {
    const filters: Record<string, string> = {};
    if (this.#elements.category.value) filters.category = this.#elements.category.value;
    if (this.#elements.tag.value) filters.tag = this.#elements.tag.value;
    return Object.keys(filters).length > 0 ? { filters } : {};
  }

  async #search(debounced: boolean): Promise<void> {
    const query = this.#elements.input.value.trim().slice(0, MAX_QUERY_LENGTH);
    if (!query) {
      this.#updateUrl(query);
      this.#request += 1;
      this.#references = [];
      this.#elements.results.replaceChildren();
      this.#elements.pagination.hidden = true;
      this.#elements.status.textContent = message(this.#elements.root, 'messageIdle');
      return;
    }

    const request = ++this.#request;
    this.#elements.status.textContent = message(this.#elements.root, 'messageLoading');

    try {
      const api = await this.#initialize();
      this.#updateUrl(query);
      const options = this.#searchOptions();
      const response = debounced
        ? await api.debouncedSearch(query, options, 180)
        : await api.search(query, options);
      if (!response || request !== this.#request) return;

      this.#references = response.results;
      this.#currentPage = 1;
      await this.#renderCurrentPage(request);
    } catch {
      if (request !== this.#request) return;
      this.#elements.results.replaceChildren();
      this.#elements.pagination.hidden = true;
      this.#elements.status.textContent = message(this.#elements.root, 'messageError');
    }
  }

  #updateUrl(query: string): void {
    const url = new URL(window.location.href);
    const values = {
      q: query,
      category: this.#elements.category.value,
      tag: this.#elements.tag.value,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  #showPage(page: number): void {
    const total = Math.max(1, Math.ceil(this.#references.length / RESULTS_PER_PAGE));
    const nextPage = Math.min(Math.max(page, 1), total);
    if (nextPage === this.#currentPage) return;
    this.#currentPage = nextPage;
    const request = ++this.#request;
    void this.#renderCurrentPage(request);
    this.#elements.root.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  async #renderCurrentPage(request: number): Promise<void> {
    const totalResults = this.#references.length;
    if (totalResults === 0) {
      this.#elements.results.replaceChildren();
      this.#elements.pagination.hidden = true;
      this.#elements.status.textContent = message(this.#elements.root, 'messageEmpty');
      return;
    }

    const start = (this.#currentPage - 1) * RESULTS_PER_PAGE;
    const references = this.#references.slice(start, start + RESULTS_PER_PAGE);
    const data = await Promise.all(references.map(reference => reference.data()));
    if (request !== this.#request) return;

    const fragment = document.createDocumentFragment();
    for (const result of data) {
      const href = safeResultUrl(result.url);
      if (!href) continue;

      const item = document.createElement('li');
      item.className = 'search-result';
      const link = document.createElement('a');
      link.className = 'search-result-title';
      link.href = href;
      link.textContent = result.meta.title?.trim() || href;
      item.append(link);

      const excerpt = result.plain_excerpt.trim();
      if (excerpt) {
        const paragraph = document.createElement('p');
        paragraph.className = 'search-result-excerpt';
        paragraph.textContent = excerpt;
        item.append(paragraph);
      }

      const metadata = [result.meta.category, result.meta.date].filter(Boolean).join(' / ');
      if (metadata) {
        const meta = document.createElement('p');
        meta.className = 'search-result-meta';
        meta.textContent = metadata;
        item.append(meta);
      }
      fragment.append(item);
    }
    this.#elements.results.replaceChildren(fragment);
    this.#elements.status.textContent = message(this.#elements.root, 'messageCount', {
      count: totalResults,
    });

    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    this.#elements.pagination.hidden = totalPages <= 1;
    this.#elements.previous.disabled = this.#currentPage <= 1;
    this.#elements.next.disabled = this.#currentPage >= totalPages;
    this.#elements.page.textContent = message(this.#elements.root, 'messagePage', {
      current: this.#currentPage,
      total: totalPages,
    });
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-search-root]')) {
  new SearchController(root).start();
}
