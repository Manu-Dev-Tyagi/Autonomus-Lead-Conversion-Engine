import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

export interface AgentDecisionRepositoryPort {
  save(input: {
    tenantId: string;
    leadId: string;
    decision: AgentDecision;
    occurredAt: string;
  }): Promise<void>;
}
