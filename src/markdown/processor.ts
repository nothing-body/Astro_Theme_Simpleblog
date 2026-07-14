import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

type Tree = Parameters<typeof visit>[0];
type VFile = { path?: string; history?: string[] } | null | undefined;
type NodeData = { hName?: string; hProperties?: Record<string, unknown> };
type DirectiveNode = {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  data?: NodeData;
};
type LinkNode = { type: 'link'; url: string; data?: NodeData };
type ElementNode = {
  type: 'element';
  tagName?: string;
  properties?: Record<string, unknown>;
};

function isDirectiveNode(node: unknown): node is DirectiveNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as { type?: unknown; name?: unknown };
  return typeof candidate.name === 'string' &&
    ['containerDirective', 'leafDirective', 'textDirective'].includes(String(candidate.type));
}

function isLinkNode(node: unknown): node is LinkNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as { type?: unknown; url?: unknown };
  return candidate.type === 'link' && typeof candidate.url === 'string';
}

function isElementNode(node: unknown): node is ElementNode {
  return typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'element';
}

function directiveToDiv() {
  return (tree: Tree) => {
    visit(tree, node => {
      if (!isDirectiveNode(node)) return;
      const data = node.data ?? (node.data = {});
      data.hName = 'div';
      data.hProperties = {
        ...data.hProperties,
        'data-directive': node.name,
        class: `directive-${node.name}`,
      };
    });
  };
}

function appendRel(existing: unknown, additions: string[]): string {
  const values = new Set(String(existing ?? '').split(/\s+/).filter(Boolean));
  additions.forEach(value => values.add(value));
  return [...values].join(' ');
}

function leavingPath(file: VFile): string {
  const filename = String(file?.path ?? file?.history?.[0] ?? '').replaceAll('\\', '/');
  if (/(?:^|\/)src\/content\/blog\/zh-tw\//.test(filename)) return '/zh-tw/leaving';
  if (/(?:^|\/)src\/content\/blog\/zh-cn\//.test(filename)) return '/zh-cn/leaving';
  return '/leaving';
}

function externalNotice(siteOrigin: string) {
  return () => (tree: Tree, file: VFile) => {
    const noticePath = leavingPath(file);
    visit(tree, node => {
      if (!isLinkNode(node)) return;
      let target: URL;
      try {
        target = new URL(node.url);
      } catch {
        return;
      }
      if (target.username || target.password) {
        throw new Error('Markdown links must not contain URL credentials.');
      }
      if (!['http:', 'https:'].includes(target.protocol) || target.origin === siteOrigin) return;
      node.url = `${noticePath}?to=${encodeURIComponent(target.href)}`;
      const data = node.data ?? (node.data = {});
      const properties = data.hProperties ?? {};
      data.hProperties = {
        ...properties,
        rel: appendRel(properties.rel, ['noopener', 'noreferrer']),
        'data-external-notice': 'true',
      };
    });
  };
}

function noInlineStyles() {
  return (tree: Tree) => {
    visit(tree, node => {
      if (!isElementNode(node) || !node.properties) return;
      const classes = Array.isArray(node.properties.className)
        ? node.properties.className.map(String)
        : node.properties.className ? [String(node.properties.className)] : [];
      if (['th', 'td'].includes(node.tagName ?? '') && typeof node.properties.align === 'string') {
        if (!['left', 'center', 'right'].includes(node.properties.align)) {
          throw new Error(`Unsupported Markdown table alignment: ${node.properties.align}`);
        }
        classes.push(`text-align-${node.properties.align}`);
        delete node.properties.align;
      }
      if (typeof node.properties.style !== 'string') {
        if (classes.length) node.properties.className = classes;
        return;
      }
      const styles = node.properties.style.split(';').map(value => value.trim()).filter(Boolean);
      for (const style of styles) {
        const match = style.match(/^text-align:\s*(left|center|right)$/);
        if (!match) throw new Error(`Unsupported inline Markdown style: ${style}`);
        classes.push(`text-align-${match[1]}`);
      }
      node.properties.className = classes;
      delete node.properties.style;
    });
  };
}

export function createMarkdownProcessor(siteOrigin: string) {
  return unified({
    remarkPlugins: [remarkGfm, remarkDirective, directiveToDiv, externalNotice(siteOrigin)],
    rehypePlugins: [noInlineStyles],
  });
}
