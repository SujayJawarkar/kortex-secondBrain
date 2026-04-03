import { eq, and, count, inArray } from "drizzle-orm";
import { db } from "../db";
import { items, itemTags } from "../db/schema";
import { enqueue } from "../utils/queue";

const FREE_ITEM_LIMIT = 100;

export class ItemService {
  async save(
    userId: string,
    plan: "free" | "pro",
    payload: {
      url?: string;
      note?: string;
      sourceType: "url" | "pdf" | "note";
      title?: string;
      fileBuffer?: Buffer;
      fileName?: string;
    },
  ) {
    // Enforce free tier limit
    if (plan === "free") {
      const [{ value }] = await db
        .select({ value: count() })
        .from(items)
        .where(eq(items.userId, userId));

      if (Number(value) >= FREE_ITEM_LIMIT) {
        throw new Error(
          "Free plan limit reached. Upgrade to Pro for unlimited items.",
        );
      }
    }

    // Deduplicate URLs
    if (payload.url) {
      const existing = await db
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.url, payload.url)))
        .limit(1);

      if (existing.length > 0) {
        return { item: existing[0], duplicate: true };
      }
    }

    // Insert item with placeholder content (workers fill this in)
    const [item] = await db
      .insert(items)
      .values({
        userId,
        url: payload.url || null,
        title: payload.title || payload.url || "Untitled",
        contentMd: payload.note || "",
        sourceType: payload.sourceType,
        status: "queued",
      })
      .returning();

    // Push to ingest queue
    await enqueue("ingest", {
      itemId: item.id,
      userId,
      sourceType: payload.sourceType,
      url: payload.url || "",
      note: payload.note || "",
    });

    return { item, duplicate: false };
  }

  async list(userId: string) {
    const results = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        summary: items.summary,
        sourceType: items.sourceType,
        status: items.status,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(eq(items.userId, userId))
      .orderBy(items.createdAt);

    if (results.length === 0) return [];

    const itemIds = results.map((i) => i.id);
    const tagsResult = await db
      .select({ itemId: itemTags.itemId, tag: itemTags.tag })
      .from(itemTags)
      .where(inArray(itemTags.itemId, itemIds));

    const tagMap: Record<string, string[]> = {};
    for (const t of tagsResult) {
      if (!tagMap[t.itemId]) tagMap[t.itemId] = [];
      tagMap[t.itemId].push(t.tag);
    }

    return results.map(item => ({ ...item, tags: tagMap[item.id] || [] }));
  }

  async getById(itemId: string, userId: string) {
    const [item] = await db
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.userId, userId)))
      .limit(1);

    if (!item) return null;

    const tagsResult = await db
      .select({ tag: itemTags.tag })
      .from(itemTags)
      .where(eq(itemTags.itemId, itemId));

    return { ...item, tags: tagsResult.map(t => t.tag) };
  }

  async delete(itemId: string, userId: string) {
    const [deleted] = await db
      .delete(items)
      .where(and(eq(items.id, itemId), eq(items.userId, userId)))
      .returning({ id: items.id });

    return deleted || null;
  }

  async markViewed(itemId: string) {
    await db
      .update(items)
      .set({
        viewCount: items.viewCount,
        lastViewed: new Date(),
      })
      .where(eq(items.id, itemId));
  }
}

export const itemService = new ItemService();
