'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Copy, Bot, ExternalLink, Check, ChevronDown, FileText, MessageCircle, Sparkles } from 'lucide-react'

interface AIPageActionsProps {
  pageSlug: string
  pageTitle: string
}

export default function AIPageActions({ pageSlug, pageTitle }: AIPageActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyPage = async () => {
    try {
      // Fetch the LLM-formatted content from our API
      const response = await fetch(`/api/llm/${pageSlug}`)
      if (response.ok) {
        const llmText = await response.text()
        await navigator.clipboard.writeText(llmText)
      } else {
        // Fallback to basic format if API fails
        const llmText = `# ${pageTitle}
URL: /docs/${pageSlug}
Source: ${window.location.origin}/docs/${pageSlug}

${pageTitle} documentation from Saros SDK Docs.

***

This is documentation for the Saros SDK. For the most up-to-date information, visit: ${window.location.href}`
        await navigator.clipboard.writeText(llmText)
      }
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleViewMarkdown = () => {
    // Open the LLM API endpoint to view raw markdown
    window.open(`/api/llm/${pageSlug}`, '_blank')
  }

  const handleOpenInChatGPT = () => {
    const prompt = `Please help me understand this documentation: ${window.location.href}`
    const chatGPTUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`
    window.open(chatGPTUrl, '_blank')
  }

  const handleOpenInClaude = () => {
    const prompt = `Please help me understand this documentation: ${window.location.href}`
    const claudeUrl = `https://claude.ai/chat?q=${encodeURIComponent(prompt)}`
    window.open(claudeUrl, '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyPage} className="gap-2">
          <Copy className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Copy page</span>
            <span className="text-xs text-muted-foreground">Copy page as Markdown for LLMs</span>
          </div>
          {copied && <Check className="h-4 w-4 text-green-600 ml-auto" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleViewMarkdown} className="gap-2">
          <FileText className="h-4 w-4" />
          <div className="flex flex-col">
            <span>View as Markdown</span>
            <span className="text-xs text-muted-foreground">View this page as plain text</span>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleOpenInChatGPT} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Open in ChatGPT</span>
            <span className="text-xs text-muted-foreground">Ask ChatGPT about this page</span>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenInClaude} className="gap-2">
          <Sparkles className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Open in Claude</span>
            <span className="text-xs text-muted-foreground">Ask Claude about this page</span>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 