import {
  search,
  SafeSearchType,
  SearchResult as DDGSearchResult,
} from 'duck-duck-scrape';

/** A simplified web search result. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

/**
 * Search DuckDuckGo with retry logic for rate limits.
 * Returns an empty array on failure instead of throwing.
 */
export async function searchWeb(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await search(query, {
        safeSearch: SafeSearchType.MODERATE,
      });

      if (response.noResults || !response.results.length) {
        return [];
      }

      return response.results.slice(0, maxResults).map(
        (r: DDGSearchResult): SearchResult => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        })
      );
    } catch (err) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('anomaly') || err.message.includes('202'));

      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        console.warn(`[Bob] DDG rate limited, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      console.error('[Bob] Web search failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  return [];
}
