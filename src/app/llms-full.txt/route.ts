import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

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

// Cache forever for static content
export const revalidate = false

export async function GET() {
  try {
    const docsPath = path.join(process.cwd(), 'src', 'docs')
    
    const allDocs = await Promise.all(
      docFiles.map(async (slug) => {
        try {
          const filePath = path.join(docsPath, `${slug}.md`)
          const content = await fs.readFile(filePath, 'utf8')
          
          // Extract title from content
          const titleMatch = content.match(/^# (.+)$/m)
          const title = titleMatch ? titleMatch[1] : 'Saros SDK Documentation'
          
          return `# ${title}
URL: /docs/${slug}
Source: https://saros-sdk-docs.vercel.app/docs/${slug}

${content}`
        } catch (error) {
          console.error(`Error reading ${slug}:`, error)
          return `# Error loading ${slug}\nFailed to load documentation for ${slug}`
        }
      })
    )

    const combinedContent = allDocs.join('\n\n---\n\n')

    return new NextResponse(combinedContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400' // Cache for 1 day
      }
    })
  } catch (error) {
    console.error('Error generating full LLM docs:', error)
    return new NextResponse('Error generating documentation', { status: 500 })
  }
} 