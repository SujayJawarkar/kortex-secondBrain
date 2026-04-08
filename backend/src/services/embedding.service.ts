import { aiConfig } from "../config/ai";

let pipeline: any = null;

async function getLocalPipeline() {
  if (!pipeline) {
    const { pipeline: createPipeline } = await import("@xenova/transformers");
    pipeline = await createPipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
    console.log("✅ Local embedding model loaded");
  }
  return pipeline;
}

export class EmbeddingService {
  async embed(texts: string[]): Promise<number[][]> {
    if (aiConfig.embedModel === "openai") {
      return this.embedOpenAI(texts);
    }
    return this.embedLocal(texts);
  }

  private async embedLocal(texts: string[]): Promise<number[][]> {
    const pipe = await getLocalPipeline();
    const results: number[][] = [];

    for (const text of texts) {
      const output = await pipe(text, {
        pooling: "mean",
        normalize: true,
      });
      results.push(Array.from(output.data) as number[]);
    }

    return results;
  }

  private async embedOpenAI(texts: string[]): Promise<number[][]> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return res.data.map((d) => d.embedding);
  }
}

export const embeddingService = new EmbeddingService();
