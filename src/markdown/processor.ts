import { unified } from '@astrojs/markdown-remark';
import { fileURLToPath } from 'node:url';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import {
  ARTICLE_IMAGE_OUTPUT_QUALITY,
  imageLoadingAttributes,
  validateArticleImage,
} from './image-policy';
import { getLeavingNoticeHref, normalizeExternalHttpUrl } from '../lib/external-links';
import type { Lang } from '../i18n/ui';

type Tree = Parameters<typeof visit>[0];
type VFile = { path?: string; history?: string[] } | null | undefined;
type NodeData = { hName?: string; hProperties?: Record<string, unknown> };
type DirectiveNode = {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  data?: NodeData;
};
type LinkNode = { type: 'link'; url: string; data?: NodeData };
type ImageNode = {
  type: 'image';
  url: string;
  alt?: string | null;
};
type HtmlNode = { type: 'html'; value?: string };
type ElementNode = {
  type: 'element';
  tagName?: string;
  properties?: Record<string, unknown>;
  position?: { start?: { line?: number } };
};

function isDirectiveNode(node: unknown): node is DirectiveNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as { type?: unknown; name?: unknown };
  return (
    typeof candidate.name === 'string' &&
    ['containerDirective', 'leafDirective', 'textDirective'].includes(String(candidate.type))
  );
}

function isLinkNode(node: unknown): node is LinkNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as { type?: unknown; url?: unknown };
  return candidate.type === 'link' && typeof candidate.url === 'string';
}

function isImageNode(node: unknown): node is ImageNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as { type?: unknown; url?: unknown };
  return candidate.type === 'image' && typeof candidate.url === 'string';
}

function rejectRawHtml() {
  return (tree: Tree) => {
    visit(tree, node => {
      if ((node as HtmlNode).type === 'html') {
        throw new Error(
          'Raw HTML is not allowed in Markdown articles; use Markdown syntax instead.'
        );
      }
    });
  };
}

function isElementNode(node: unknown): node is ElementNode {
  return (
    typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'element'
  );
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

function markdownFilePath(file: VFile): string {
  const value = String(file?.path ?? file?.history?.[0] ?? '');
  return value.startsWith('file:') ? fileURLToPath(value) : value;
}

function validateArticleImages() {
  return (tree: Tree, file: VFile) => {
    const sourceFile = markdownFilePath(file);
    if (!sourceFile) return;

    visit(tree, node => {
      if ((node as { type?: unknown }).type === 'imageReference') {
        throw new Error(
          'Reference-style Markdown images are not supported; use ![alt](../_assets/file).'
        );
      }
      if (!isImageNode(node)) return;
      validateArticleImage(sourceFile, node.url, node.alt);
    });
  };
}

function optimizeImageLoading() {
  return (tree: Tree) => {
    let firstImage = true;
    visit(tree, node => {
      if (!isElementNode(node) || node.tagName !== 'img') return;
      const properties = node.properties ?? (node.properties = {});
      const sourceLine = node.position?.start?.line ?? Number.POSITIVE_INFINITY;
      const attributes = imageLoadingAttributes(firstImage, sourceLine);
      Object.assign(properties, attributes);
      properties.quality = ARTICLE_IMAGE_OUTPUT_QUALITY;
      if (!attributes.fetchPriority) delete properties.fetchPriority;
      firstImage = false;
    });
  };
}

function appendRel(existing: unknown, additions: string[]): string {
  const values = new Set(
    String(existing ?? '')
      .split(/\s+/)
      .filter(Boolean)
  );
  additions.forEach(value => values.add(value));
  return [...values].join(' ');
}

function markdownLanguage(file: VFile): Lang {
  const sourceFile = markdownFilePath(file).replaceAll('\\', '/');
  if (sourceFile.includes('src/content/blog/zh-tw/')) return 'zh-tw';
  if (sourceFile.includes('src/content/blog/zh-cn/')) return 'zh-cn';
  return 'en';
}

function secureExternalLinks() {
  return (tree: Tree, file: VFile) => {
    const lang = markdownLanguage(file);
    visit(tree, node => {
      if (!isLinkNode(node)) return;
      let parsedTarget: URL;
      try {
        parsedTarget = new URL(node.url);
      } catch {
        return;
      }
      if (!['http:', 'https:'].includes(parsedTarget.protocol)) return;
      const target = normalizeExternalHttpUrl(node.url);
      node.url = getLeavingNoticeHref(lang, target.href);
      const data = node.data ?? (node.data = {});
      const properties = data.hProperties ?? {};
      data.hProperties = {
        ...properties,
        rel: appendRel(properties.rel, ['noopener', 'noreferrer']),
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
        : node.properties.className
          ? [String(node.properties.className)]
          : [];
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
      const styles = node.properties.style
        .split(';')
        .map(value => value.trim())
        .filter(Boolean);
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

export function createMarkdownProcessor() {
  return unified({
    remarkPlugins: [
      remarkGfm,
      remarkDirective,
      rejectRawHtml,
      directiveToDiv,
      secureExternalLinks,
      validateArticleImages,
    ],
    rehypePlugins: [noInlineStyles, optimizeImageLoading],
  });
}
