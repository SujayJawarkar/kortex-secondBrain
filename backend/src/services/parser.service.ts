import { db } from "../db";
import { items } from "../db/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import * as cheerio from "cheerio";

export class ParserService {
  async parseUrl(url: string): Promise<{ title: string; content: string }> {
    const jinaUrl = `https://r.jina.ai/${url}`;

    try {
      const res = await fetch(jinaUrl, {
        headers: { Accept: "text/plain" },
      });

      if (!res.ok) {
        throw new Error(`Jina Reader failed: ${res.status}`);
      }

      const text = await res.text();

      // Jina returns "Title: ...\nURL: ...\n\n{content}"
      // Extract title from first line if present
      const lines = text.split("\n");
      const titleLine = lines.find((l) => l.startsWith("Title:"));
      const title = titleLine ? titleLine.replace("Title:", "").trim() : url;

      // Remove Jina metadata lines at the top
      const contentStart = lines.findIndex((l) => l.trim() === "");
      const content =
        contentStart > -1 ? lines.slice(contentStart).join("\n").trim() : text;

      return { title, content };
    } catch (err: any) {
      console.error(`Jina reader failed for ${url}, falling back to basic fetch:`, err.message);
      return this.fallbackParseUrl(url);
    }
  }

  private async fallbackParseUrl(url: string): Promise<{ title: string; content: string }> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) {
        throw new Error(`Fallback fetch failed: ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Try to get title
      const title = $('title').text() || $('h1').first().text() || url;

      // Remove scripts, styles, nav, footer
      $('script, style, nav, footer, header, aside, .ad, .advertisement, iframe, noscript').remove();

      // Try to extract main content
      let content = '';
      const article = $('article');
      if (article.length > 0) {
        const paras = article.find('p, h1, h2, h3, h4, li');
        if (paras.length > 0) {
          content = paras.map((i, el) => $(el).text()).get().join('\n\n');
        } else {
          content = article.text();
        }
      } else {
        const main = $('main');
        if (main.length > 0) {
          const paras = main.find('p, h1, h2, h3, h4, li');
          if (paras.length > 0) {
            content = paras.map((i, el) => $(el).text()).get().join('\n\n');
          } else {
            content = main.text();
          }
        } else {
          const paras = $('body').find('p, h1, h2, h3, h4, li');
          if (paras.length > 0) {
            content = paras.map((i, el) => $(el).text()).get().join('\n\n');
          } else {
            content = $('body').text();
          }
        }
      }

      // Clean up whitespace
      content = content.replace(/\n\s*\n/g, '\n\n').trim();

      return { title: title.trim(), content };
    } catch (fallbackErr: any) {
      throw new Error(`Parsing failed completely. Jina error + Fallback error: ${fallbackErr.message}`);
    }
  }

  async parsePdf(buffer: Buffer): Promise<{ title: string; content: string }> {
    try {
      const data = await pdfParse(buffer);
      return {
        title: data.info?.Title || "PDF Document",
        content: data.text,
      };
    } catch (err: any) {
      throw new Error(
        `Could not parse PDF — the file may be corrupted, password-protected, or in an unsupported format. (${err.message})`
      );
    }
  }

  chunkText(text: string, maxTokens = 512, overlapTokens = 64): string[] {
    // Approximate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    const overlapChars = overlapTokens * 4;
    const minChars = 10 * 4; // 10 token minimum
    
    // If text is short enough, return it as a single chunk to prevent skipping short notes
    if (text.trim().length > 0 && text.length <= maxChars) {
      return [text.trim()];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxChars;

      if (end < text.length) {
        // Try to break at paragraph boundary
        const paraBreak = text.lastIndexOf("\n\n", end);
        if (paraBreak > start + maxChars * 0.5) {
          end = paraBreak;
        } else {
          // Fall back to sentence boundary
          const sentBreak = text.lastIndexOf(". ", end);
          if (sentBreak > start + maxChars * 0.5) {
            end = sentBreak + 1;
          }
        }
      }

      const chunk = text.slice(start, end).trim();

      // Skip chunks that are too short
      if (chunk.length >= minChars) {
        chunks.push(chunk);
      }

      start = end - overlapChars;
    }

    return chunks;
  }

  async updateItemContent(itemId: string, title: string, content: string) {
    await db
      .update(items)
      .set({ title, contentMd: content, status: "processing" })
      .where(eq(items.id, itemId));
  }

  async markFailed(itemId: string) {
    await db
      .update(items)
      .set({ status: "failed" })
      .where(eq(items.id, itemId));
  }
}

export const parserService = new ParserService();
