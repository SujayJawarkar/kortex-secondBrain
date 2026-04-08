import { redis } from "../config/redis";
import { db } from "../db";
import { items, itemLinks, itemTags } from "../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { qdrantService } from "../services/qdrant.service";
import { embeddingService } from "../services/embedding.service";

const STREAM = "link";
const GROUP = "link-workers";
const CONSUMER = `worker-${process.pid}`;
const BLOCK_MS = 5000;
const MIN_SIMILARITY = 0.25;

async function setupGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
    console.log(`✅ Consumer group "${GROUP}" created`);
  } catch (err: any) {
    if (!err.message.includes("BUSYGROUP")) throw err;
  }
}

async function processMessage(data: Record<string, string>) {
  const { itemId, userId } = data;
  console.log(`Computing links for item ${itemId}`);

  try {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item) throw new Error(`Item ${itemId} not found`);

    const queryText = `${item.title} ${item.summary || item.contentMd.slice(0, 500)}`;
    const [queryVec] = await embeddingService.embed([queryText]);

    const hits = await qdrantService.search(userId, queryVec, 50);
    const itemScores: Record<string, number> = {};
    for (const hit of hits) {
      const hitItemId = hit.payload?.item_id as string;
      if (!hitItemId || hitItemId === itemId) continue;
      if (!itemScores[hitItemId] || hit.score > itemScores[hitItemId]) {
        itemScores[hitItemId] = hit.score;
      }
    }

    const strongLinks = Object.entries(itemScores)
      .filter(([, score]) => score >= MIN_SIMILARITY)
      .slice(0, 10);

    if (strongLinks.length === 0) {
      console.log(`No strong links found for item ${itemId}`);
      return;
    }

    for (const [targetId, similarity] of strongLinks) {
      await db
        .insert(itemLinks)
        .values([
          {
            userId,
            sourceId: itemId,
            targetId,
            similarity,
            linkType: "semantic",
          },
          {
            userId,
            sourceId: targetId,
            targetId: itemId,
            similarity,
            linkType: "semantic",
          },
        ])
        .onConflictDoNothing();
    }

    console.log(`✅ Created ${strongLinks.length} links for item ${itemId}`);
  } catch (err: any) {
    console.error(`❌ Linking failed for ${itemId}:`, err.message);
  }
}

export async function startWorker() {
  await setupGroup();
  console.log(`🚀 Link worker started (PID ${process.pid})`);

  while (true) {
    try {
      const results = (await redis.xreadgroup(
        "GROUP",
        GROUP,
        CONSUMER,
        "COUNT",
        5,
        "BLOCK",
        BLOCK_MS,
        "STREAMS",
        STREAM,
        ">",
      )) as [string, [string, string[]][]][] | null;

      if (!results) continue;

      for (const [, messages] of results) {
        await Promise.all(
          messages.map(async ([msgId, fields]) => {
            try {
              const data: Record<string, string> = {};
              for (let i = 0; i < fields.length; i += 2) {
                data[fields[i]] = fields[i + 1];
              }
              await processMessage(data);
              await redis.xack(STREAM, GROUP, msgId);
            } catch (err: any) {
              console.error(`Error processing message ${msgId}:`, err.message);
            }
          })
        );
      }
    } catch (err: any) {
      console.error("Link worker error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

