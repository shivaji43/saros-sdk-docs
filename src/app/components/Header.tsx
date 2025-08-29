'use client'

import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import MobileNav from './MobileNav'

interface HeaderProps {
  currentDoc?: string
}

export default function Header({ currentDoc }: HeaderProps) {
  return (
    <header className="border-b bg-background md:hidden">
      <div className="flex h-16 items-center px-4 gap-4">
        <MobileNav currentDoc={currentDoc} />
        
        <Link href="/" className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            Saros SDK Docs
          </h1>
        </Link>
      </div>
    </header>
  )
} 