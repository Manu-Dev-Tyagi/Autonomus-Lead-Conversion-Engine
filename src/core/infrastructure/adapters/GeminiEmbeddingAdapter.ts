import { EmbeddingPort } from "@/src/core/application/ports/EmbeddingPort";

export class GeminiEmbeddingAdapter implements EmbeddingPort {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "text-embedding-004"
  ) {}

  async generate(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini Embedding failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      embedding: { values: number[] };
    };

    return payload.embedding.values;
  }
}
