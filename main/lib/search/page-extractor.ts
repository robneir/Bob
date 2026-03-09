import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

/** Extracted page content in clean Markdown form. */
export interface ExtractedPage {
  url: string;
  title: string;
  content: string;
  byline?: string;
}

const MAX_CONTENT_LENGTH = 4000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetch a URL and extract its main content as clean Markdown.
 *
 * Pipeline: fetch → linkedom parse → Readability extract → Turndown to Markdown
 *
 * @param url  The page URL to fetch and extract
 * @returns    Extracted page content, or null on any failure
 */
export async function extractPage(
  url: string
): Promise<ExtractedPage | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Parse HTML with linkedom (lightweight DOM for Node.js)
    const { document } = parseHTML(html);

    // Extract main article content with Readability
    const article = new Readability(document as unknown as Document).parse();
    if (!article || !article.content) return null;

    // Convert HTML article content to Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // Strip media elements — we only want text content
    turndown.remove(['img', 'iframe', 'video', 'audio', 'svg', 'canvas']);

    let content = turndown.turndown(article.content);

    // Truncate to max length
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]';
    }

    return {
      url,
      title: article.title ?? '',
      content,
      byline: article.byline ?? undefined,
    };
  } catch {
    return null;
  }
}
