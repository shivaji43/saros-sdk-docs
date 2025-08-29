'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Separator } from '@/components/ui/separator'
import { ExternalLink } from 'lucide-react'
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
  hideFirstH1?: boolean
}

export default function MarkdownRenderer({ content, hideFirstH1 = false }: MarkdownRendererProps) {
  // Pre-process content to remove first H1 if needed
  const processedContent = hideFirstH1 
    ? content.replace(/^#\s+.*$/m, '') // Remove the first H1 line
    : content;
  
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom component styling with shadcn aesthetic
            h1: ({ children }) => (
              <div className="space-y-4">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  {children}
                </h1>
                <Separator />
              </div>
            ),
            h2: ({ children }) => (
              <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="leading-7 [&:not(:first-child)]:mt-6">
                {children}
              </p>
            ),
            code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
              const isInline = !className?.includes('language-')
              if (isInline) {
                return (
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold" {...props}>
                    {children}
                  </code>
                )
              }
              return (
                <code className="block text-gray-100" {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 py-4 dark:bg-zinc-900 [&>*]:!text-gray-100">
                <div className="px-4 text-gray-100">
                  {children}
                </div>
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mt-6 border-l-2 pl-6 italic">
                {children}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li>
                {children}
              </li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="font-medium text-primary underline underline-offset-4 hover:no-underline inline-flex items-center gap-1"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
                {href?.startsWith('http') && <ExternalLink className="h-3 w-3" />}
              </a>
            ),
            table: ({ children }) => (
              <div className="my-6 w-full overflow-y-auto">
                <table className="w-full">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="[&_tr]:border-b">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="[&_tr:last-child]:border-0">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                {children}
              </td>
            ),
            hr: () => <Separator className="my-6" />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
    </div>
  )
} 