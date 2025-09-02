'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CodeCopyButtonProps {
  code: string
}

export default function CodeCopyButton({ code }: CodeCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400 hover:text-gray-200" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : 'Copy code'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 