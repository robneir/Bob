import React, { useDeferredValue } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface StreamingMarkdownProps {
  content: string
  streaming?: boolean
}

function StreamingMarkdown({
  content,
  streaming = false,
}: StreamingMarkdownProps) {
  const deferredContent = useDeferredValue(content)

  if (streaming) {
    return (
      <div className="max-w-none whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground">
        {content}
      </div>
    )
  }

  return (
    <div className="prose prose-sm prose-invert max-w-none break-words text-[13px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Compact styling overrides for the widget
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 last:mb-0 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 last:mb-0 pl-4">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-0.5">{children}</li>,
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="px-1 py-0.5 rounded bg-muted text-[12px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="mb-2 last:mb-0 rounded-lg bg-muted/50 p-3 overflow-x-auto text-[12px]">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-bold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1">{children}</h3>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {deferredContent}
      </ReactMarkdown>
    </div>
  )
}

export default React.memo(StreamingMarkdown)
