import Groq from "groq-sdk";
import { db } from "../db";
import { itemTags, items } from "../db/schema";
import { eq, and } from "drizzle-orm";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface TagResult {
  tags: string[];
  summary: string;
}

export class TagService {
  async extractTags(itemId: string, content: string): Promise<TagResult> {
    const prompt = `Analyze the following text and extract:
1. 3-7 topic tags (single words or short phrases, lowercase)
2. A 2-3 sentence summary

Respond ONLY with valid JSON in this exact format, no other text:
{
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Your summary here."
}

Text to analyze:
${content.slice(0, 3000)}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message?.content || "{}";

    try {
      // Strip markdown code blocks if present
      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned) as TagResult;
      return {
        tags: parsed.tags || [],
        summary: parsed.summary || "",
      };
    } catch {
      console.error("Failed to parse tag response:", raw);
      return { tags: [], summary: "" };
    }
  }

  async saveTags(itemId: string, result: TagResult) {
    if (result.tags.length > 0) {
      await db
        .insert(itemTags)
        .values(
          result.tags.map((tag, i) => ({
            itemId,
            tag: tag.toLowerCase().trim(),
            score: 1 - i * 0.1, // score by order of extraction
          })),
        )
        .onConflictDoNothing();
    }

    if (result.summary) {
      await db
        .update(items)
        .set({ summary: result.summary })
        .where(eq(items.id, itemId));
    }
  }

  async addManualTags(itemId: string, tags: string[]) {
    if (tags.length === 0) return;
    await db
      .insert(itemTags)
      .values(
        tags.map((tag) => ({
          itemId,
          tag: tag.toLowerCase().trim(),
          score: 1.0,
        }))
      )
      .onConflictDoNothing();
  }

  async removeTag(itemId: string, tag: string) {
    await db
      .delete(itemTags)
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tag, tag)));
  }
}

export const tagService = new TagService();
