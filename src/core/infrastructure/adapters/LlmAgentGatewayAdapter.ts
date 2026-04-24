import {
  AgentContextByAction,
  AgentGatewayPort,
} from "@/src/core/application/ports/AgentGatewayPort";
import { REQUIRED_GEMINI_SPECIALIZED_ACTIONS } from "@/src/core/application/ports/AgentActionScopes";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { GeminiBookingAgent } from "@/src/core/infrastructure/adapters/gemini/BookingAgent";
import { GeminiComposerAgent } from "@/src/core/infrastructure/adapters/gemini/ComposerAgent";
import { GeminiEnrichmentAgent } from "@/src/core/infrastructure/adapters/gemini/EnrichmentAgent";
import { GeminiIntakeAgent } from "@/src/core/infrastructure/adapters/gemini/IntakeAgent";
import { GeminiOrchestratorAgent } from "@/src/core/infrastructure/adapters/gemini/OrchestratorAgent";
import { GeminiResponseAgent } from "@/src/core/infrastructure/adapters/gemini/ResponseAgent";
import { GeminiGenerationConfig } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";
import { GeminiScoringAgent } from "@/src/core/infrastructure/adapters/gemini/GeminiScoringAgent";
import { GeminiStrategyAgent } from "@/src/core/infrastructure/adapters/gemini/StrategyAgent";
import { GeminiTimingAgent } from "@/src/core/infrastructure/adapters/gemini/TimingAgent";

export class LlmAgentGatewayAdapter implements AgentGatewayPort {
  private readonly agents = new Map<AgentAction, AgentGatewayPort>();

  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return;
    }

    const model = process.env.GEMINI_MODEL;
    this.agents.set(
      AgentAction.CreateLead,
      new GeminiIntakeAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.CreateLead)),
    );
    this.agents.set(
      AgentAction.EnrichLead,
      new GeminiEnrichmentAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.EnrichLead)),
    );
    this.agents.set(
      AgentAction.ScoreLead,
      new GeminiScoringAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.ScoreLead)),
    );
    this.agents.set(
      AgentAction.PlanSequence,
      new GeminiStrategyAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.PlanSequence)),
    );
    this.agents.set(
      AgentAction.ComposeMessage,
      new GeminiComposerAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.ComposeMessage)),
    );
    this.agents.set(
      AgentAction.OptimizeTiming,
      new GeminiTimingAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.OptimizeTiming)),
    );
    this.agents.set(
      AgentAction.InterpretResponse,
      new GeminiResponseAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.InterpretResponse)),
    );
    this.agents.set(
      AgentAction.ScheduleMeeting,
      new GeminiBookingAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.ScheduleMeeting)),
    );
    this.agents.set(
      AgentAction.OrchestrateWorkflow,
      new GeminiOrchestratorAgent(
        geminiApiKey,
        model,
        this.readGenerationConfig(AgentAction.OrchestrateWorkflow),
      ),
    );
    this.assertRequiredSpecializedActions();
  }

  async execute<TAction extends AgentAction>(
    action: TAction,
    context: AgentContextByAction[TAction] & Record<string, unknown>,
  ): Promise<AgentDecision> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is missing for LLM agent execution.");
    }

    const specializedAgent = this.agents.get(action);
    if (specializedAgent) {
      try {
        return await specializedAgent.execute(action, context);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Agent decision failed validation")
        ) {
          throw error;
        }
        // Fall back to generic prompt path to preserve resilient behavior.
      }
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

  private readGenerationConfig(action: AgentAction): GeminiGenerationConfig {
    const prefix = `ALE_GEMINI_${action}`;
    return {
      temperature: this.readEnvNumber(`${prefix}_TEMPERATURE`),
      maxOutputTokens: this.readEnvNumber(`${prefix}_MAX_OUTPUT_TOKENS`),
      topP: this.readEnvNumber(`${prefix}_TOP_P`),
      topK: this.readEnvNumber(`${prefix}_TOP_K`),
    };
  }

  private readEnvNumber(name: string): number | undefined {
    const value = process.env[name];
    if (value === undefined || value.trim() === "") {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private assertRequiredSpecializedActions(): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const missing = REQUIRED_GEMINI_SPECIALIZED_ACTIONS.filter((action) => !this.agents.has(action));
    if (missing.length > 0) {
      throw new Error(`Missing specialized Gemini agents for actions: ${missing.join(", ")}`);
    }
  }
}
