import { promises as fs } from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import Header from '../../components/Header'
import PageHeader from '../../components/PageHeader'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DocsPageProps {
  params: Promise<{
    slug: string
  }>
}

// Define all available documentation files
const docFiles = [
  'saros-docs-index',
  'saros-docs-quickstart', 
  'saros-tutorial-swap',
  'saros-tutorial-liquidity',
  'saros-tutorial-farming',
  'saros-api-reference',
  'saros-code-examples',
  'saros-troubleshooting',
  'saros-sdk-analysis',
  'saros-sdk-comparison'
]

export function generateStaticParams() {
  return docFiles.map((slug) => ({
    slug,
  }))
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params

  // Check if the slug is valid
  if (!docFiles.includes(slug)) {
    notFound()
  }

  try {
    const docsPath = path.join(process.cwd(), 'src', 'docs')
    const filePath = path.join(docsPath, `${slug}.md`)
    const content = await fs.readFile(filePath, 'utf8')

    return (
      <div className="flex flex-col h-screen bg-background">
        <Header currentDoc={slug} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar currentDoc={slug} />
          
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="w-full max-w-4xl mx-auto p-6">
                <PageHeader content={content} pageSlug={slug} />
                <MarkdownRenderer content={content} hideFirstH1={true} />
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error reading documentation file:', error)
    notFound()
  }
} 