import { AgentAction } from "@/src/core/domain/agent/AgentAction";

export type LifecycleAgentActions = AgentAction.EnrichLead | AgentAction.ScoreLead;
export const LIFECYCLE_AGENT_ACTIONS: LifecycleAgentActions[] = [
  AgentAction.EnrichLead,
  AgentAction.ScoreLead,
];

export type OutreachAgentActions =
  | AgentAction.PlanSequence
  | AgentAction.ComposeMessage
  | AgentAction.OptimizeTiming
  | AgentAction.InterpretResponse
  | AgentAction.SendEmail
  | AgentAction.ScheduleMeeting;
export const OUTREACH_AGENT_ACTIONS: OutreachAgentActions[] = [
  AgentAction.PlanSequence,
  AgentAction.ComposeMessage,
  AgentAction.OptimizeTiming,
  AgentAction.InterpretResponse,
  AgentAction.SendEmail,
  AgentAction.ScheduleMeeting,
];

// Actions that must always have specialized Gemini implementations wired.
export const REQUIRED_GEMINI_SPECIALIZED_ACTIONS: AgentAction[] = [
  AgentAction.CreateLead,
  AgentAction.EnrichLead,
  AgentAction.ScoreLead,
  AgentAction.PlanSequence,
  AgentAction.ComposeMessage,
  AgentAction.OptimizeTiming,
  AgentAction.InterpretResponse,
  AgentAction.ScheduleMeeting,
  AgentAction.OrchestrateWorkflow,
  AgentAction.UpdateStrategy,
];

export type AgentActionOwner = "lifecycle" | "outreach" | "other";

export const AGENT_ACTION_OWNER_MAP: Record<AgentAction, AgentActionOwner> = {
  [AgentAction.CreateLead]: "other",
  [AgentAction.EnrichLead]: "lifecycle",
  [AgentAction.ScoreLead]: "lifecycle",
  [AgentAction.QualifyLead]: "other",
  [AgentAction.DisqualifyLead]: "other",
  [AgentAction.PlanSequence]: "outreach",
  [AgentAction.ComposeMessage]: "outreach",
  [AgentAction.OptimizeTiming]: "outreach",
  [AgentAction.InterpretResponse]: "outreach",
  [AgentAction.SendEmail]: "outreach",
  [AgentAction.ScheduleMeeting]: "outreach",
  [AgentAction.OrchestrateWorkflow]: "other",
  [AgentAction.UpdateStrategy]: "other",
};

export function assertActionOwner(
  action: AgentAction,
  expectedOwner: Exclude<AgentActionOwner, "other">,
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const actualOwner = AGENT_ACTION_OWNER_MAP[action];
  if (actualOwner !== expectedOwner) {
    throw new Error(
      `Action ownership mismatch for ${action}: expected ${expectedOwner}, got ${actualOwner}.`,
    );
  }
}
