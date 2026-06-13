"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CopyButton } from "./copy-button";
import "highlight.js/styles/github-dark.css";

/**
 * Renders assistant markdown with GFM tables, syntax-highlighted code blocks
 * (with a copy button), and styles tuned for chat density. Memoized — every
 * streamed token re-renders the message, so the previous markdown tree must
 * be cheap to skip.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: {
  content: string;
}) {
  return (
    <div className="prose-chat text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: (props) => <h2 className="mt-5 mb-2 text-lg font-semibold" {...props} />,
          h2: (props) => <h3 className="mt-5 mb-2 text-base font-semibold" {...props} />,
          h3: (props) => <h4 className="mt-4 mb-1.5 text-sm font-semibold" {...props} />,
          p: (props) => <p className="my-2.5" {...props} />,
          ul: (props) => <ul className="my-2.5 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="my-2.5 list-decimal space-y-1 pl-5" {...props} />,
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-muted-foreground/30 text-muted-foreground my-3 border-l-2 pl-3 italic"
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="bg-muted/60 border-b px-3 py-2 font-medium" {...props} />
          ),
          td: (props) => <td className="border-b px-3 py-2 last:border-0" {...props} />,
          pre: ({ children, ...props }) => {
            // extract raw text for the copy button
            let code = "";
            const child = Array.isArray(children) ? children[0] : children;
            if (
              child &&
              typeof child === "object" &&
              "props" in child &&
              child.props &&
              typeof (child.props as { children?: unknown }).children === "string"
            ) {
              code = (child.props as { children: string }).children;
            }
            return (
              <div className="group relative my-3">
                <pre
                  className="overflow-x-auto rounded-lg bg-[#0d1117] p-3 text-xs leading-relaxed"
                  {...props}
                >
                  {children}
                </pre>
                <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyButton text={code} variant="dark" />
                </div>
              </div>
            );
          },
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
