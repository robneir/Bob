// main/lib/search/search-pipeline.ts
import { WebContents } from 'electron'
import { searchWeb } from './web-search'
import { extractPage } from './page-extractor'
import { createStatusEmitter } from '../status'

export const SEARCH_SYSTEM_PROMPT = `You are Bob, a search-powered answer engine. The user spoke their question aloud and it was transcribed.

Your job: search the web, read the results, and give the user a grounded answer.

Rules:
- ALWAYS use the webSearch tool before answering. Never answer from memory alone.
- After getting search results, use fetchPage to read the most relevant ones.
- Read as many pages as you need to give a thorough answer (usually 2-5).
- If results aren't good enough, search again with a refined query.
- Base your answer ONLY on what you read from the search results.
- Include source URLs at the end of your answer in this format:
  Sources:
  - [Title](url)
  - [Title](url)
- Be concise and direct. Use markdown formatting when helpful.
- If the search results don't contain the answer, say so honestly.`

export function createSearchTools(
  sender: WebContents,
  importNodeLlama: () => Promise<typeof import('node-llama-cpp')>
) {
  const status = createStatusEmitter(sender)
  const sources: { title: string; url: string }[] = []
  let searchCount = 0
  let pageCount = 0

  return {
    sources,
    getTools: async () => {
      const { defineChatSessionFunction } = await importNodeLlama()

      return {
        webSearch: defineChatSessionFunction({
          description: 'Search the web for current information. Use this to find answers to any factual question.',
          params: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to look up',
              },
            },
          },
          async handler({ query }: { query: string }) {
            searchCount++
            status(searchCount === 1 ? 'searching' : 'searching-again')

            const results = await searchWeb(query)
            if (results.length === 0) {
              return 'No results found. Try a different search query.'
            }

            status('scanning-results')
            return results
              .map((r, i) => `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet}`)
              .join('\n\n')
          },
        }),

        fetchPage: defineChatSessionFunction({
          description: 'Fetch and read the full content of a web page. Use this after searching to read pages that look relevant.',
          params: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL of the page to read',
              },
            },
          },
          async handler({ url }: { url: string }) {
            pageCount++
            status(
              pageCount <= 1 ? 'reading-page' : 'reading-more',
              pageCount > 2 ? `Reading source ${pageCount}...` : undefined
            )

            const page = await extractPage(url)
            if (!page) {
              return 'Could not fetch this page. Try a different URL.'
            }

            sources.push({ title: page.title, url: page.url })
            return `# ${page.title}\n\n${page.content}`
          },
        }),
      }
    },
  }
}
