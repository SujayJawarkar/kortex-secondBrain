import { QdrantClient } from "@qdrant/js-client-rest";
const qdrantUrl = process.env.QDRANT_URL!;
const parsed = new URL(qdrantUrl);

export const qdrant = new QdrantClient({
  host: parsed.hostname,
  port: 443,
  apiKey: process.env.QDRANT_API_KEY!,
  https: true,
  checkCompatibility: false,
});
