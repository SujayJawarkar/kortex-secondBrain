import { redis } from "../config/redis";
import { db } from "../db";
import { items, chunks, itemTags } from "../db/schema";
import { eq } from "drizzle-orm";
import { embeddingService } from "../services/embedding.service";
import { qdrantService } from "../services/qdrant.service";
// import { chromaService } from "../services/chroma.service";
import { enqueue } from "../utils/queue";
import { sse } from "../utils/sse";

const STREAM = "embed";
const GROUP = "embed-workers";
const CONSUMER = `worker-${process.pid}`;
const BATCH = 3; // keep low — HuggingFace rate limits
const BLOCK_MS = 5000;

async function setupGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
    console.log(`✅ Consumer group "${GROUP}" created`);
  } catch (err: any) {
    if (!err.message.includes("BUSYGROUP")) throw err;
  }
}

/* async function processMessage(data: Record<string, string>) {
  const { itemId, userId } = data;

  console.log(`Embedding item ${itemId}`);

  try {
    // Step 1 — fetch item
    console.log("Step 1: Fetching item from DB...");
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item) throw new Error(`Item ${itemId} not found`);
    console.log("Step 1 OK:", item.title, item.status);

    // Step 2 — fetch chunks
    console.log("Step 2: Fetching chunks...");
    const itemChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.itemId, itemId))
      .orderBy(chunks.chunkIdx);

    if (itemChunks.length === 0)
      throw new Error(`No chunks found for item ${itemId}`);
    console.log("Step 2 OK: chunk count =", itemChunks.length);

    // Step 3 — ensure Qdrant collection
    console.log("Step 3: Ensuring Qdrant collection...");
    await qdrantService.ensureCollection(userId);
    console.log("Step 3 OK");

    // Step 4 — embed chunks
    console.log("Step 4: Embedding chunks...");
    const EMBED_BATCH = 32;
    const allVectors: number[][] = [];

    for (let i = 0; i < itemChunks.length; i += EMBED_BATCH) {
      const batch = itemChunks.slice(i, i + EMBED_BATCH);
      const texts = batch.map((c) => c.text);
      console.log(
        `  Embedding batch ${i / EMBED_BATCH + 1}, size=${texts.length}`,
      );
      const vectors = await embeddingService.embed(texts);
      allVectors.push(...vectors);
    }
    console.log("Step 4 OK: vectors =", allVectors.length);

    // Step 5 — upsert to Qdrant
    console.log("Step 5: Upserting to Qdrant...");
    await qdrantService.upsertChunks(userId, itemChunks, allVectors, {
      itemId,
      title: item.title,
      sourceType: item.sourceType,
      tags: [],
      createdAt: item.createdAt.toISOString(),
    });
    console.log("Step 5 OK");

    // Step 6 — mark ready
    console.log("Step 6: Marking item ready...");
    await db.update(items).set({ status: "ready" }).where(eq(items.id, itemId));
    console.log("Step 6 OK");
    sse.send(userId, "item:ready", {
      itemId,
      status: "ready",
      title: item.title,
      summary: item.summary,
    });

    console.log(
      `✅ Embedded item ${itemId} → ${itemChunks.length} vectors in Qdrant`,
    );

    await enqueue("tag", { itemId, userId });
    await enqueue("link", { itemId, userId });
  } catch (err: any) {
    console.error(`❌ Embed failed for ${itemId}`);
    console.error("  message:", err.message);
    console.error("  stack:", err.stack);
    console.error("  cause:", err.cause);
    await db
      .update(items)
      .set({ status: "failed" })
      .where(eq(items.id, itemId));
  }
} */

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

