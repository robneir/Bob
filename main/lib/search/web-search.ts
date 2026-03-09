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

/**
 * Search DuckDuckGo and return simplified results.
 *
 * @param query   The search query string
 * @param maxResults  Maximum number of results to return (default 10)
 * @returns An array of search results (empty if none found)
 */
export async function searchWeb(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
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
}
