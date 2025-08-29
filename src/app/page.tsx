import { promises as fs } from 'fs'
import path from 'path'
import Sidebar from './components/Sidebar'
import MarkdownRenderer from './components/MarkdownRenderer'
import Header from './components/Header'
import PageHeader from './components/PageHeader'
import { ScrollArea } from '@/components/ui/scroll-area'

export default async function Home() {
  const docsPath = path.join(process.cwd(), 'src', 'docs')
  const indexContent = await fs.readFile(path.join(docsPath, 'saros-docs-index.md'), 'utf8')

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header currentDoc="saros-docs-index" />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentDoc="saros-docs-index" />
        
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="w-full max-w-4xl mx-auto p-6">
              <PageHeader content={indexContent} pageSlug="saros-docs-index" />
              <MarkdownRenderer content={indexContent} hideFirstH1={true} />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}
