import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

export interface AgentGatewayPort {
  execute(action: AgentAction, context: Record<string, unknown>): Promise<AgentDecision>;
}
