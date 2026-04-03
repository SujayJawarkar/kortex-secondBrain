import { db } from "../db";
import { items } from "../db/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

export class ParserService {
  async parseUrl(url: string): Promise<{ title: string; content: string }> {
    const jinaUrl = `https://r.jina.ai/${url}`;

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
  }

  async parsePdf(buffer: Buffer): Promise<{ title: string; content: string }> {
    const data = await pdfParse(buffer);
    return {
      title: data.info?.Title || "PDF Document",
      content: data.text,
    };
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
