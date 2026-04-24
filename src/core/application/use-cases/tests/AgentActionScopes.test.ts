import { describe, expect, it } from "vitest";

import {
  AGENT_ACTION_OWNER_MAP,
  LifecycleAgentActions,
  OutreachAgentActions,
  assertActionOwner,
} from "@/src/core/application/ports/AgentActionScopes";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";

describe("AgentActionScopes", () => {
  it("marks lifecycle actions with lifecycle owner", () => {
    const lifecycleActions: LifecycleAgentActions[] = [AgentAction.EnrichLead, AgentAction.ScoreLead];
    for (const action of lifecycleActions) {
      expect(AGENT_ACTION_OWNER_MAP[action]).toBe("lifecycle");
    }
  });

  it("marks outreach actions with outreach owner", () => {
    const outreachActions: OutreachAgentActions[] = [
      AgentAction.PlanSequence,
      AgentAction.ComposeMessage,
      AgentAction.OptimizeTiming,
      AgentAction.InterpretResponse,
      AgentAction.SendEmail,
      AgentAction.ScheduleMeeting,
    ];
    for (const action of outreachActions) {
      expect(AGENT_ACTION_OWNER_MAP[action]).toBe("outreach");
    }
  });

  it("keeps non-orchestration actions as other", () => {
    expect(AGENT_ACTION_OWNER_MAP[AgentAction.CreateLead]).toBe("other");
    expect(AGENT_ACTION_OWNER_MAP[AgentAction.QualifyLead]).toBe("other");
    expect(AGENT_ACTION_OWNER_MAP[AgentAction.DisqualifyLead]).toBe("other");
  });

  it("throws when action owner expectation is wrong", () => {
    expect(() => assertActionOwner(AgentAction.CreateLead, "lifecycle")).toThrowError(
      "Action ownership mismatch",
    );
  });
});
