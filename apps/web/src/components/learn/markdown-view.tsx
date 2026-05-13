'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@levelup/ui';
import { CodeCopyButton } from './code-copy-button';

interface MarkdownViewProps {
  content: string;
  className?: string;
  /**
   * Pre-rendered images for `[image] <prompt>` directives in the content. The
   * `slot` is the zero-based occurrence index of the directive in the body.
   * Missing slots fall through to a "preparing…" placeholder.
   */
  imageAssets?: Array<{ slot: number; blobUrl: string }>;
}

/**
 * Replace `[image] <prompt>` directive lines with a markdown image whose `src`
 * uses our internal `lesson-image:<slot>` scheme. The custom `img` renderer
 * below resolves that scheme against the caller-supplied `imageAssets` map.
 */
function expandImageDirectives(content: string): string {
  let slot = 0;
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^\[image\]\s+(.+)$/i);
      if (!match) return line;
      const alt = (match[1] ?? '').trim().replace(/[\]\[]/g, '');
      const out = `![${alt}](lesson-image:${slot})`;
      slot += 1;
      return out;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively extracts all text content from React children (string or
 * nested arrays/elements).  Used to build the string we pass to the copy
 * button without pulling in any extra dependency.
 */
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (typeof children === 'object' && 'props' in (children as object)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return '';
}

// ---------------------------------------------------------------------------
// MarkdownView
// ---------------------------------------------------------------------------

/**
 * MarkdownView — renders Markdown using react-markdown ^9 + remark-gfm ^4.
 *
 * XSS mitigation:
 *   - react-markdown does NOT use dangerouslySetInnerHTML; it converts AST nodes
 *     to React elements, so raw HTML in the source is not rendered by default.
 *   - We explicitly disable HTML passthrough by keeping the default
 *     `allowElement` / `unwrapDisallowed` behaviour (html nodes are stripped).
 *   - We override the `a` renderer to ensure all external links open with
 *     rel="noopener noreferrer" and never use javascript: hrefs.
 *   - Custom `code` renderer uses <pre><code> with plain className only.
 */
export function MarkdownView({ content, className, imageAssets }: MarkdownViewProps) {
  const expandedContent = expandImageDirectives(content);
  const blobBySlot = new Map<number, string>((imageAssets ?? []).map((a) => [a.slot, a.blobUrl]));
  return (
    <div
      className={cn(
        // Editorial prose — Instrument Serif headings, Geist Sans body, Geist Mono code.
        'max-w-reading space-y-5 text-body-lg leading-7 text-paper-100',
        '[&_h1]:mb-4 [&_h1]:mt-10 [&_h1]:font-serif [&_h1]:italic [&_h1]:text-display-md [&_h1]:text-paper-100',
        '[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:italic [&_h2]:text-h1 [&_h2]:text-paper-100',
        '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-sans [&_h3]:font-medium [&_h3]:text-h2 [&_h3]:text-paper-100',
        '[&_p]:leading-7',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5',
        '[&_li]:leading-relaxed',
        // Pre blocks
        '[&_pre]:relative [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-ink-800 [&_pre]:border [&_pre]:border-ink-600 [&_pre]:p-4 [&_pre]:pt-9 [&_pre]:font-mono [&_pre]:text-mono',
        // Inline code
        '[&_code]:rounded-sm [&_code]:bg-ink-700 [&_code]:px-[0.4em] [&_code]:py-[0.15em] [&_code]:text-mono [&_code]:font-mono [&_code]:text-paper-100',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-paper-100',
        // Links — signal amber, restrained underline
        '[&_a]:text-signal [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-signal-dim [&_a]:transition-colors [&_a]:hover:text-paper-100 [&_a]:hover:decoration-paper-100',
        '[&_strong]:font-semibold [&_strong]:text-paper-100',
        '[&_em]:italic',
        '[&_hr]:my-8 [&_hr]:border-ink-600',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:font-mono [&_table]:text-mono-sm',
        '[&_th]:border [&_th]:border-ink-600 [&_th]:bg-ink-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-mono-sm [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:text-paper-500',
        '[&_td]:border [&_td]:border-ink-600 [&_td]:px-3 [&_td]:py-2 [&_td]:text-body-sm',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ------------------------------------------------------------------
          // Sanitize anchor elements: block javascript: URIs and enforce rel.
          // Destructure `node` to prevent it being forwarded to the DOM.
          // ------------------------------------------------------------------
          a({ href, children, node: _node, ...rest }) {
            const safeSrc = href?.startsWith('javascript:') ? '#' : href;
            const isExternal = safeSrc?.startsWith('http://') || safeSrc?.startsWith('https://');
            return (
              <a
                href={safeSrc}
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...rest}
              >
                {children}
              </a>
            );
          },

          // ------------------------------------------------------------------
          // Code block container — adds CodeCopyButton top-right.
          // The <pre> is `position: relative` via the Tailwind class above.
          // ------------------------------------------------------------------
          pre({ children, node: _node, ...rest }) {
            // Extract all text from the nested <code> element for the copy button
            const codeText = extractText(children as React.ReactNode);
            return (
              <pre {...rest}>
                <CodeCopyButton code={codeText} />
                {children}
              </pre>
            );
          },

          // ------------------------------------------------------------------
          // Inline / block code renderer — strip node prop to keep DOM clean.
          // ------------------------------------------------------------------
          code({ children, className: codeClassName, node: _node, ...rest }) {
            return (
              <code className={codeClassName} {...rest}>
                {children}
              </code>
            );
          },

          // ------------------------------------------------------------------
          // Blockquote — 3px oxblood left bar + italic Fraunces display font.
          // We render a custom element so we can escape the Tailwind bracket
          // selector limitation for border-left specifically.
          // ------------------------------------------------------------------
          blockquote({ children, node: _node, ...rest }) {
            return (
              <blockquote
                style={{
                  borderLeft: '2px solid rgb(255 179 0)',
                  paddingLeft: '1rem',
                  margin: '1.5rem 0',
                }}
                className="font-serif text-body-lg italic text-paper-300"
                {...rest}
              >
                {children}
              </blockquote>
            );
          },

          // ------------------------------------------------------------------
          // Images: block external URLs from rendering as <img> to avoid
          // potential tracking pixels and mixed-content issues.
          // ------------------------------------------------------------------
          img({ src, alt, node: _node }) {
            if (!src) return null;
            // Internal scheme emitted by expandImageDirectives — resolve to a
            // pre-rendered blob URL from the caller-supplied imageAssets map.
            if (src.startsWith('lesson-image:')) {
              const slot = parseInt(src.slice('lesson-image:'.length), 10);
              const resolved = Number.isFinite(slot) ? blobBySlot.get(slot) : undefined;
              if (!resolved) {
                return (
                  <span className="my-6 block rounded-md border border-dashed border-ink-600 bg-ink-700/40 px-4 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    Image being prepared…
                  </span>
                );
              }
               
              return (
                <img
                  src={resolved}
                  alt={alt ?? ''}
                  className="my-6 w-full rounded-lg border border-ink-600"
                />
              );
            }
            const isAbsolute = src.startsWith('http://') || src.startsWith('https://');
            if (isAbsolute) {
              return (
                <span className="block rounded border border-ink-600 bg-ink-700 px-3 py-2 text-xs text-paper-300">
                  [Image: {alt ?? src}]
                </span>
              );
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ''} className="max-w-full rounded-lg" />;
          },
        }}
        // Disallow raw HTML in markdown source (default false in react-markdown v9 — explicit)
        allowedElements={undefined}
        disallowedElements={['script', 'iframe', 'object', 'embed', 'form', 'input', 'button']}
        unwrapDisallowed
        urlTransform={(url) => url}
      >
        {expandedContent}
      </ReactMarkdown>
    </div>
  );
}
