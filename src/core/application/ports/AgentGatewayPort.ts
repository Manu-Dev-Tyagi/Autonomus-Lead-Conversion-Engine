import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import {
  LifecycleAgentActions,
  OutreachAgentActions,
} from "@/src/core/application/ports/AgentActionScopes";

export type AgentContextByAction = {
  [AgentAction.CreateLead]: {
    tenantId: string;
    leadId: string;
    email?: string;
  };
  [AgentAction.EnrichLead]: {
    tenantId: string;
    leadId: string;
    email?: string;
  };
  [AgentAction.ScoreLead]: {
    tenantId: string;
    leadId: string;
    email?: string;
    tenantConfig?: Record<string, unknown>;
    historicalPatterns?: unknown[];
  };
  [AgentAction.QualifyLead]: {
    tenantId?: string;
    outcomes?: number;
  };
  [AgentAction.DisqualifyLead]: {
    tenantId?: string;
    reason?: string;
  };
  [AgentAction.PlanSequence]: {
    tenantId: string;
    leadId: string;
    segment?: string;
    score?: number;
  };
  [AgentAction.ComposeMessage]: {
    tenantId: string;
    leadId: string;
    sequenceId?: string;
    leadName?: string;
    company?: string;
    tone?: string;
  };
  [AgentAction.OptimizeTiming]: {
    tenantId: string;
    leadId: string;
    timezone?: string;
    role?: string;
  };
  [AgentAction.InterpretResponse]: {
    tenantId?: string;
    leadId?: string;
    inboundText?: string;
    replyText?: string;
  };
  [AgentAction.SendEmail]: {
    tenantId: string;
    leadId: string;
    subject?: string;
  };
  [AgentAction.ScheduleMeeting]: {
    tenantId?: string;
    leadId?: string;
    proposedSlots?: string[];
  };
  [AgentAction.OrchestrateWorkflow]: {
    tenantId?: string;
    leadId?: string;
    currentState?: string;
    availableAgents?: string[];
  };
};

export type ExecuteAgentFn<TAllowedActions extends AgentAction> = <TAction extends TAllowedActions>(
  action: TAction,
  context: AgentContextByAction[TAction] & Record<string, unknown>,
) => Promise<AgentDecision>;

export interface AgentGatewayPort {
  execute: ExecuteAgentFn<AgentAction>;
}

export interface LifecycleAgentGatewayPort {
  execute: ExecuteAgentFn<LifecycleAgentActions>;
}

export interface OutreachAgentGatewayPort {
  execute: ExecuteAgentFn<OutreachAgentActions>;
}

export type { LifecycleAgentActions, OutreachAgentActions };
