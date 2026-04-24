import {
  AgentContextByAction,
  AgentGatewayPort,
} from "@/src/core/application/ports/AgentGatewayPort";
import { REQUIRED_GEMINI_SPECIALIZED_ACTIONS } from "@/src/core/application/ports/AgentActionScopes";
import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { InMemoryHistoricalOutcomesReadAdapter } from "@/src/core/infrastructure/adapters/InMemoryHistoricalOutcomesReadAdapter";
import { PostgresHistoricalOutcomesReadAdapter } from "@/src/core/infrastructure/adapters/PostgresHistoricalOutcomesReadAdapter";
import { ApolloAdapter } from "@/src/core/infrastructure/adapters/enrichment/ApolloAdapter";
import { CachedEnrichmentProvider } from "@/src/core/infrastructure/adapters/enrichment/CachedEnrichmentProvider";
import { ClearbitAdapter } from "@/src/core/infrastructure/adapters/enrichment/ClearbitAdapter";
import { EnrichmentAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/enrichment/EnrichmentAgentGatewayAdapter";
import { GeminiInferenceAdapter } from "@/src/core/infrastructure/adapters/enrichment/GeminiInferenceAdapter";
import { IEnrichmentProvider } from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";
import { WebScraperAdapter } from "@/src/core/infrastructure/adapters/enrichment/WebScraperAdapter";
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
import { ScoringAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/scoring/ScoringAgentGatewayAdapter";

export class LlmAgentGatewayAdapter implements AgentGatewayPort {
  private readonly agents = new Map<AgentAction, AgentGatewayPort>();
  private readonly historicalOutcomesReader: HistoricalOutcomesReadPort;

  constructor(deps?: { historicalOutcomesReader?: HistoricalOutcomesReadPort }) {
    this.historicalOutcomesReader =
      deps?.historicalOutcomesReader ?? this.buildHistoricalOutcomesReader();
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
      new EnrichmentAgentGatewayAdapter(
        this.buildEnrichmentProviders(geminiApiKey, model),
        new GeminiEnrichmentAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.EnrichLead)),
      ),
    );
    this.agents.set(
      AgentAction.ScoreLead,
      new ScoringAgentGatewayAdapter(
        new GeminiScoringAgent(geminiApiKey, model, this.readGenerationConfig(AgentAction.ScoreLead)),
        this.historicalOutcomesReader,
      ),
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

  private buildEnrichmentProviders(apiKey: string, model: string | undefined): IEnrichmentProvider[] {
    const providers: IEnrichmentProvider[] = [];
    const clearbitKey = process.env.CLEARBIT_API_KEY;
    const apolloKey = process.env.APOLLO_API_KEY;
    const ttlMs = this.readEnvNumber("ALE_ENRICHMENT_CACHE_TTL_MS") ?? 5 * 60 * 1000;

    if (clearbitKey) {
      providers.push(new CachedEnrichmentProvider(new ClearbitAdapter(clearbitKey), ttlMs));
    }
    if (apolloKey) {
      providers.push(new CachedEnrichmentProvider(new ApolloAdapter(apolloKey), ttlMs));
    }
    providers.push(new CachedEnrichmentProvider(new WebScraperAdapter(), ttlMs));
    providers.push(
      new CachedEnrichmentProvider(new GeminiInferenceAdapter(apiKey, model), ttlMs),
    );
    return providers;
  }

  private buildHistoricalOutcomesReader(): HistoricalOutcomesReadPort {
    const usePostgresReader = process.env.ALE_SCORING_USE_POSTGRES_OUTCOMES === "true";
    if (usePostgresReader) {
      return new PostgresHistoricalOutcomesReadAdapter();
    }
    const adapter = new InMemoryHistoricalOutcomesReadAdapter();
    const seed = process.env.ALE_SCORING_HISTORICAL_SEED;
    if (!seed) {
      return adapter;
    }
    try {
      const parsed = JSON.parse(seed) as Array<{
        tenantId: string;
        segmentKey: string;
        conversionRate: number;
      }>;
      for (const item of parsed) {
        adapter.upsert(item);
      }
    } catch {
      // Ignore malformed seed values and continue with defaults.
    }
    return adapter;
  }
}
