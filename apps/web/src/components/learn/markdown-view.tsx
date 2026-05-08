'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@levelup/ui';
import { CodeCopyButton } from './code-copy-button';

interface MarkdownViewProps {
  content: string;
  className?: string;
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
export function MarkdownView({ content, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(
        // Prose-like typography without pulling in @tailwindcss/typography
        'max-w-prose space-y-4 text-base leading-relaxed text-paper-100',
        '[&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-paper-100',
        '[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-paper-100',
        '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-paper-100',
        '[&_p]:leading-7',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1',
        '[&_li]:leading-relaxed',
        // Pre blocks — relative so the copy button can be absolutely positioned
        '[&_pre]:relative [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ink-700 [&_pre]:border [&_pre]:border-t [&_pre]:border-signal/10 [&_pre]:p-4 [&_pre]:pt-8',
        // Inline code — oxblood-tinted, mono
        '[&_code]:rounded [&_code]:bg-signal/8 [&_code]:px-[0.4em] [&_code]:py-[0.15em] [&_code]:text-sm [&_code]:font-mono [&_code]:text-signal',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-paper-100',
        // Links — oxblood, transition on hover
        '[&_a]:text-signal [&_a]:no-underline [&_a]:transition-[color,text-decoration-color] [&_a]:duration-150 [&_a]:hover:underline [&_a]:hover:underline-offset-2',
        '[&_strong]:font-semibold',
        '[&_em]:italic',
        '[&_hr]:border-ink-600',
        '[&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border [&_th]:border-ink-600 [&_th]:bg-ink-700 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-ink-600 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm',
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
                  borderLeft: '3px solid hsl(var(--primary))',
                  paddingLeft: '1rem',
                  margin: '1.25rem 0',
                }}
                className="font-serif italic text-paper-300"
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
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
