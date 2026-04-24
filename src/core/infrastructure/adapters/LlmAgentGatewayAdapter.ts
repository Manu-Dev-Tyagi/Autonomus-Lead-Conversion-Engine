import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

export class LlmAgentGatewayAdapter implements AgentGatewayPort {
  async execute(action: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is missing for LLM agent execution.");
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      geminiApiKey,
    )}`;

    const prompt = [
      "Return ONLY JSON with keys: confidence (0..1), reasoning (string), alternatives (string[]), metadata (object).",
      `Action: ${action}`,
      `Context: ${JSON.stringify(context)}`,
    ].join("\n");
    this.enforceUsageBudgets(prompt);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = this.tryParseDecision(text);
    return {
      action,
      confidence: parsed?.confidence ?? 0.5,
      reasoning: parsed?.reasoning ?? "Fallback reasoning due to model output parsing.",
      alternatives: parsed?.alternatives ?? [],
      metadata: {
        ...(parsed?.metadata ?? {}),
        model,
      },
    };
  }

  private tryParseDecision(text: string):
    | {
        confidence?: number;
        reasoning?: string;
        alternatives?: string[];
        metadata?: Record<string, unknown>;
      }
    | null {
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        return null;
      }
      const json = text.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(json) as {
        confidence?: number;
        reasoning?: string;
        alternatives?: string[];
        metadata?: Record<string, unknown>;
      };
    } catch {
      return null;
    }
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
}
