import { redis } from "../config/redis";
import { db } from "../db";
import { items } from "../db/schema";
import { eq } from "drizzle-orm";
import { tagService } from "../services/tag.service";

const STREAM = "tag";
const GROUP = "tag-workers";
const CONSUMER = `worker-${process.pid}`;
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
  const { itemId } = data;
  console.log(`Tagging item ${itemId}`);

  try {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item) throw new Error(`Item ${itemId} not found`);

    const result = await tagService.extractTags(itemId, item.contentMd);
    await tagService.saveTags(itemId, result);

    console.log(`✅ Tagged item ${itemId} → tags: ${result.tags.join(", ")}`);
  } catch (err: any) {
    console.error(`❌ Tagging failed for ${itemId}:`, err.message);
  }
}

export async function startWorker() {
  await setupGroup();
  console.log(`🚀 Tag worker started (PID ${process.pid})`);

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
      console.error("Tag worker error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

