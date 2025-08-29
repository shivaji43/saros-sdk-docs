import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  
  if (!docFiles.includes(slug)) {
    return new NextResponse('Documentation not found', { status: 404 })
  }

  try {
    const docsPath = path.join(process.cwd(), 'src', 'docs')
    const filePath = path.join(docsPath, `${slug}.md`)
    const content = await fs.readFile(filePath, 'utf8')

    // Extract title from content
    const titleMatch = content.match(/^# (.+)$/m)
    const title = titleMatch ? titleMatch[1] : 'Saros SDK Documentation'

    const llmText = `# ${title}
URL: /docs/${slug}
Source: ${request.nextUrl.origin}/docs/${slug}

${title} documentation from Saros SDK Docs.
        
***

${content}`

    return new NextResponse(llmText, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Error reading documentation file:', error)
    return new NextResponse('Error reading documentation', { status: 500 })
  }
}

export function generateStaticParams() {
  return docFiles.map((slug) => ({
    slug,
  }))
} 