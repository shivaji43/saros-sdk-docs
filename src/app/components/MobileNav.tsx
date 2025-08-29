'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Menu, ChevronDown, ChevronRight, FileText } from 'lucide-react'

interface MobileNavProps {
  currentDoc?: string
}

const docItems = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Documentation Hub', slug: 'saros-docs-index', file: 'saros-docs-index.md' },
      { name: 'Quick Start Guide', slug: 'saros-docs-quickstart', file: 'saros-docs-quickstart.md' },
      { name: 'SDK Comparison', slug: 'saros-sdk-comparison', file: 'saros-sdk-comparison.md' },
    ]
  },
  {
    title: 'Tutorials',
    items: [
      { name: 'Token Swap Tutorial', slug: 'saros-tutorial-swap', file: 'saros-tutorial-swap.md' },
      { name: 'Liquidity Tutorial', slug: 'saros-tutorial-liquidity', file: 'saros-tutorial-liquidity.md' },
      { name: 'Farming Tutorial', slug: 'saros-tutorial-farming', file: 'saros-tutorial-farming.md' },
    ]
  },
  {
    title: 'Reference',
    items: [
      { name: 'API Reference', slug: 'saros-api-reference', file: 'saros-api-reference.md' },
      { name: 'Code Examples', slug: 'saros-code-examples', file: 'saros-code-examples.md' },
      { name: 'Troubleshooting', slug: 'saros-troubleshooting', file: 'saros-troubleshooting.md' },
    ]
  },
  {
    title: 'Analysis',
    items: [
      { name: 'SDK Analysis', slug: 'saros-sdk-analysis', file: 'saros-sdk-analysis.md' },
    ]
  }
]

export default function MobileNav({ currentDoc }: MobileNavProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(false)

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>
            <Link href="/" onClick={() => setOpen(false)}>
              Saros SDK Docs
            </Link>
          </SheetTitle>
        </SheetHeader>
        
        <Separator className="my-4" />
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-4">
            {docItems.map((section) => (
              <div key={section.title} className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(section.title)}
                  className="w-full justify-between h-auto p-2 font-semibold"
                >
                  {section.title}
                  {collapsed[section.title] ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                
                {!collapsed[section.title] && (
                  <div className="space-y-1 ml-4">
                    {section.items.map((item) => (
                      <Button
                        key={item.slug}
                        variant={currentDoc === item.slug ? "secondary" : "ghost"}
                        asChild
                        className="w-full justify-start h-auto p-2 text-sm"
                      >
                        <Link href={`/docs/${item.slug}`} onClick={() => setOpen(false)}>
                          <FileText className="h-4 w-4 mr-2" />
                          {item.name}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 