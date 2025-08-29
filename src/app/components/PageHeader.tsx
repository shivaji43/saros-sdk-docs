'use client'

import { useMemo } from 'react'
import { Separator } from '@/components/ui/separator'
import AIPageActions from './AIPageActions'

interface PageHeaderProps {
  content: string
  pageSlug?: string
}

export default function PageHeader({ content, pageSlug }: PageHeaderProps) {
  // Extract the first H1 title from content
  const pageTitle = useMemo(() => {
    const h1Match = content.match(/^# (.+)$/m)
    return h1Match ? h1Match[1] : 'Documentation'
  }, [content])

  if (!pageSlug) return null

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {pageTitle}
        </h1>
        <AIPageActions 
          pageSlug={pageSlug} 
          pageTitle={pageTitle} 
        />
      </div>
      <Separator />
    </div>
  )
} 