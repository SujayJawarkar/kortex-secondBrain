import { db } from "../db";
import { items, itemLinks, itemTags } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export class GraphService {
  async getGraph(userId: string) {
    // Fetch all ready items for user
    const userItems = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        sourceType: items.sourceType,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.status, "ready")));

    if (userItems.length === 0) return { nodes: [], edges: [] };

    const itemIds = userItems.map((i) => i.id);

    // Fetch tags
    const tagMap: Record<string, string[]> = {};

    if (itemIds.length > 0) {
      const tags = await db
        .select()
        .from(itemTags)
        .where(inArray(itemTags.itemId, itemIds));

      for (const tag of tags) {
        if (!tagMap[tag.itemId]) tagMap[tag.itemId] = [];
        tagMap[tag.itemId].push(tag.tag);
      }
    }

    // Fetch edges
    const edges =
      itemIds.length > 0
        ? await db
          .select({
            sourceId: itemLinks.sourceId,
            targetId: itemLinks.targetId,
            similarity: itemLinks.similarity,
            linkType: itemLinks.linkType,
          })
          .from(itemLinks)
          .where(eq(itemLinks.userId, userId))
        : [];

    // Build nodes
    const nodes = userItems.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      sourceType: item.sourceType,
      tags: tagMap[item.id] || [],
      createdAt: item.createdAt,
    }));

    return { nodes, edges };
  }

  async getRelated(itemId: string, userId: string, limit = 5) {
    // Get semantic links
    const links = await db
      .select({
        targetId: itemLinks.targetId,
        similarity: itemLinks.similarity,
        linkType: itemLinks.linkType,
      })
      .from(itemLinks)
      .where(and(eq(itemLinks.sourceId, itemId), eq(itemLinks.userId, userId)))
      .orderBy(itemLinks.similarity)
      .limit(limit);

    if (links.length === 0) return [];

    // Fetch item details for each related item
    const related = await Promise.all(
      links.map(async (link) => {
        const [item] = await db
          .select({
            id: items.id,
            title: items.title,
            url: items.url,
            summary: items.summary,
            sourceType: items.sourceType,
          })
          .from(items)
          .where(eq(items.id, link.targetId))
          .limit(1);

        // Get shared tags
        const sourceTags = await db
          .select({ tag: itemTags.tag })
          .from(itemTags)
          .where(eq(itemTags.itemId, itemId));

        const targetTags = await db
          .select({ tag: itemTags.tag })
          .from(itemTags)
          .where(eq(itemTags.itemId, link.targetId));

        const sourceTagSet = new Set(sourceTags.map((t) => t.tag));
        const sharedTags = targetTags
          .map((t) => t.tag)
          .filter((t) => sourceTagSet.has(t));

        return {
          ...item,
          similarity: link.similarity,
          linkType: link.linkType,
          sharedTags,
        };
      }),
    );

    return related.filter(Boolean);
  }
}

export const graphService = new GraphService();
