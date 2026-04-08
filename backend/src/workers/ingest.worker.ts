import { redis } from "../config/redis";
import { db } from "../db";
import { items } from "../db/schema";
import { eq } from "drizzle-orm";
import { parserService } from "../services/parser.service";
import { chunkService } from "../services/chunk.service";
import { enqueue } from "../utils/queue";
import { sse } from "../utils/sse";

const STREAM = "ingest";
const GROUP = "ingest-workers";
const CONSUMER = `worker-${process.pid}`;
const BATCH = 5;
const BLOCK_MS = 5000;
const MAX_RETRY = 3;

async function setupGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
    console.log(`✅ Consumer group "${GROUP}" created`);
  } catch (err: any) {
    // Group already exists — that's fine
    if (!err.message.includes("BUSYGROUP")) throw err;
  }
}

async function processMessage(id: string, data: Record<string, string>) {
  const { itemId, sourceType, url, note } = data;

  console.log(`Processing item ${itemId} (${sourceType})`);

  try {
    let title = "Untitled";
    let content = "";

    if (sourceType === "url" && url) {
      const parsed = await parserService.parseUrl(url);
      title = parsed.title;
      content = parsed.content;
    } else if (sourceType === "note" && note) {
      title = note.slice(0, 60) + (note.length > 60 ? "..." : "");
      content = note;
    }
    // Note: PDF items are parsed at upload time and enqueued directly to embed — they never arrive here.

    if (!content) {
      throw new Error("No content extracted");
    }

    // Update item with parsed content
    await parserService.updateItemContent(itemId, title, content);
    // Fire SSE events from workers
    await sse.publish(data.userId, "item:processing", {
      itemId,
      status: "processing",
    });
    // Chunk the content
    const chunkTexts = parserService.chunkText(content);
    await chunkService.saveChunks(itemId, chunkTexts);

    console.log(`✅ Parsed item ${itemId} → ${chunkTexts.length} chunks`);

    // Push to embed queue
    await enqueue("embed", {
      itemId,
      userId: data.userId,
      chunkCount: String(chunkTexts.length),
    });
  } catch (err: any) {
    console.error(`❌ Failed to process item ${itemId}:`, err.message);
    await parserService.markFailed(itemId);
  }
}

export async function startWorker() {
  await setupGroup();
  console.log(`🚀 Ingest worker started (PID ${process.pid})`);

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
              // Convert flat array to object
              const data: Record<string, string> = {};
              for (let i = 0; i < fields.length; i += 2) {
                data[fields[i]] = fields[i + 1];
              }

              await processMessage(msgId, data);

              // Acknowledge message
              await redis.xack(STREAM, GROUP, msgId);
            } catch (err: any) {
              console.error(`Error processing message ${msgId}:`, err.message);
            }
          }),
        );
      }
    } catch (err: any) {
      console.error("Worker error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

