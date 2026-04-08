import { redis } from "../config/redis";
import { db } from "../db";
import { items, chunks, itemTags } from "../db/schema";
import { eq } from "drizzle-orm";
import { embeddingService } from "../services/embedding.service";
import { qdrantService } from "../services/qdrant.service";
import { enqueue } from "../utils/queue";
import { sse } from "../utils/sse";

const STREAM = "embed";
const GROUP = "embed-workers";
const CONSUMER = `worker-${process.pid}`;
const BATCH = 3;
const BLOCK_MS = 5000;

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
  console.log(`Embedding item ${itemId}`);

  try {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item) throw new Error(`Item ${itemId} not found`);

    const itemChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.itemId, itemId))
      .orderBy(chunks.chunkIdx);

    if (itemChunks.length === 0) throw new Error(`No chunks found`);

    await qdrantService.ensureCollection(userId);

    const EMBED_BATCH = 32;
    const allVectors: number[][] = [];

    for (let i = 0; i < itemChunks.length; i += EMBED_BATCH) {
      const batch = itemChunks.slice(i, i + EMBED_BATCH);
      const vectors = await embeddingService.embed(batch.map((c) => c.text));
      allVectors.push(...vectors);
    }

    await qdrantService.upsertChunks(userId, itemChunks, allVectors, {
      itemId,
      title: item.title,
      sourceType: item.sourceType,
      tags: [],
      createdAt: item.createdAt.toISOString(),
    });

    await db.update(items).set({ status: "ready" }).where(eq(items.id, itemId));

    await sse.publish(userId, "item:ready", {
      itemId,
      status: "ready",
      title: item.title,
      summary: item.summary,
    });

    console.log(`✅ Embedded item ${itemId} → ${itemChunks.length} vectors`);

    await enqueue("tag", { itemId, userId });
    await enqueue("link", { itemId, userId });
  } catch (err: any) {
    console.error(`❌ Embed failed for ${itemId}:`, err.message);
    await db
      .update(items)
      .set({ status: "failed" })
      .where(eq(items.id, itemId));
  }
}

export async function startWorker() {
  await setupGroup();
  console.log(`🚀 Embed worker started (PID ${process.pid})`);

  while (true) {
    try {
      const results = (await redis.xreadgroup(
        "GROUP",
        GROUP,
        CONSUMER,
        "COUNT",
        BATCH,
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
          }),
        );
      }
    } catch (err: any) {
      console.error("Embed worker error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

