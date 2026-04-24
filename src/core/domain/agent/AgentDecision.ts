import { AgentAction } from "@/src/core/domain/agent/AgentAction";

export interface AgentDecision {
  readonly action: AgentAction;
  readonly confidence: number;
  readonly reasoning: string;
  readonly alternatives: string[];
  readonly metadata: Record<string, unknown>;
}
