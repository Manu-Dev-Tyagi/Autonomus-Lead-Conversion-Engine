import { describe, expect, it } from "vitest";

import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

describe("Lead aggregate", () => {
  it("creates lead with default new state", () => {
    const lead = Lead.create({
      id: new LeadId("11111111-1111-4111-8111-111111111111"),
      tenantId: new TenantId("22222222-2222-4222-8222-222222222222"),
      email: "lead@example.com",
    });

    expect(lead.state).toBe(LeadState.New);
    expect(lead.score).toBeNull();
  });

  it("rejects invalid state transition", () => {
    const lead = Lead.create({
      id: new LeadId("11111111-1111-4111-8111-111111111111"),
      tenantId: new TenantId("22222222-2222-4222-8222-222222222222"),
      email: "lead@example.com",
    });

    expect(() => lead.transitionTo(LeadState.Qualified)).toThrowError(
      "Invalid lead transition: new -> qualified",
    );
  });

  it("accepts valid transition chain", () => {
    const lead = Lead.create({
      id: new LeadId("11111111-1111-4111-8111-111111111111"),
      tenantId: new TenantId("22222222-2222-4222-8222-222222222222"),
      email: "lead@example.com",
    });

    lead.transitionTo(LeadState.Enriching);
    lead.transitionTo(LeadState.Enriched);
    lead.transitionTo(LeadState.Scoring);
    lead.transitionTo(LeadState.Qualified);

    expect(lead.state).toBe(LeadState.Qualified);
  });
});
