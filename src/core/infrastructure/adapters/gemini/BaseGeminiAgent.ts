import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

export interface FewShotExample {
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
}

export interface GeminiGenerationConfig {
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly topP?: number;
  readonly topK?: number;
}

export abstract class BaseGeminiAgent {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-2.0-flash",
    private readonly generationConfig: GeminiGenerationConfig = {},
  ) {}

  protected abstract buildPrompt(context: Record<string, unknown>): string;
  protected abstract validateDecision(decision: AgentDecision): boolean;
  protected abstract getFewShotExamples(): FewShotExample[];

  protected async callGemini(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const prompt = this.buildPrompt(context);
    const examples = this.getFewShotExamples();
    const fullPrompt = [
      "Return ONLY JSON.",
      examples.length > 0 ? this.renderFewShotExamples(examples) : "",
      prompt,
    ]
      .filter(Boolean)
      .join("\n\n");
    this.enforceUsageBudgets(fullPrompt);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: this.resolveGenerationConfig(),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = this.extractJson(text);
    if (!parsed) {
      throw new Error("Gemini returned non-JSON output.");
    }
    return parsed;
  }

  protected normalizeDecision(
    action: AgentDecision["action"],
    parsed: Record<string, unknown>,
    fallbackReasoning: string,
  ): AgentDecision {
    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : this.normalizeScoreToConfidence(parsed.score);
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((value): value is string => typeof value === "string")
      : [];
    const decision: AgentDecision = {
      action,
      confidence: this.clamp(confidence ?? 0.5),
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : fallbackReasoning,
      alternatives,
      metadata: {
        ...parsed,
        model: this.model,
      },
    };

    if (!this.validateDecision(decision)) {
      throw new Error("Agent decision failed validation.");
    }

    return decision;
  }

  private renderFewShotExamples(examples: FewShotExample[]): string {
    return examples
      .map(
        (example, index) =>
          `Example ${index + 1}\nInput: ${JSON.stringify(example.input)}\nOutput: ${JSON.stringify(example.output)}`,
      )
      .join("\n\n");
  }

  private extractJson(text: string): Record<string, unknown> | null {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return null;
    }

    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeScoreToConfidence(score: unknown): number | null {
    if (typeof score !== "number") {
      return null;
    }
    if (score > 1) {
      return this.clamp(score / 100);
    }
    return this.clamp(score);
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, value));
  }

  private enforceUsageBudgets(prompt: string): void {
    const maxPromptChars = Number(process.env.ALE_LLM_MAX_PROMPT_CHARS ?? 12000);
    if (prompt.length > maxPromptChars) {
      throw new Error("Prompt exceeds ALE_LLM_MAX_PROMPT_CHARS budget.");
    }

    const estimatedTokens = Math.ceil(prompt.length / 4);
    const maxEstimatedTokens = Number(process.env.ALE_LLM_MAX_ESTIMATED_TOKENS ?? 3000);
    if (estimatedTokens > maxEstimatedTokens) {
      throw new Error("Prompt exceeds ALE_LLM_MAX_ESTIMATED_TOKENS budget.");
    }

    const costPer1kTokens = Number(process.env.ALE_LLM_USD_PER_1K_TOKENS ?? 0.001);
    const estimatedUsd = (estimatedTokens / 1000) * costPer1kTokens;
    const maxUsdPerRequest = Number(process.env.ALE_LLM_MAX_USD_PER_REQUEST ?? 0.02);
    if (estimatedUsd > maxUsdPerRequest) {
      throw new Error("Prompt exceeds ALE_LLM_MAX_USD_PER_REQUEST budget.");
    }
  }

  private resolveGenerationConfig(): GeminiGenerationConfig {
    const fromEnv = {
      temperature:
        process.env.ALE_GEMINI_DEFAULT_TEMPERATURE !== undefined
          ? Number(process.env.ALE_GEMINI_DEFAULT_TEMPERATURE)
          : 0.2,
      maxOutputTokens:
        process.env.ALE_GEMINI_DEFAULT_MAX_OUTPUT_TOKENS !== undefined
          ? Number(process.env.ALE_GEMINI_DEFAULT_MAX_OUTPUT_TOKENS)
          : undefined,
      topP:
        process.env.ALE_GEMINI_DEFAULT_TOP_P !== undefined
          ? Number(process.env.ALE_GEMINI_DEFAULT_TOP_P)
          : undefined,
      topK:
        process.env.ALE_GEMINI_DEFAULT_TOP_K !== undefined
          ? Number(process.env.ALE_GEMINI_DEFAULT_TOP_K)
          : undefined,
    };

    return {
      ...fromEnv,
      ...this.generationConfig,
    };
  }
}
