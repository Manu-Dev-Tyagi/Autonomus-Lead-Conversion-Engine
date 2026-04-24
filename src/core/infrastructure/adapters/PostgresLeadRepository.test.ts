import { describe, expect, it, vi } from "vitest";

import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";
import { PostgresLeadRepository } from "@/src/core/infrastructure/adapters/PostgresLeadRepository";

describe("PostgresLeadRepository", () => {
  it("maps row into domain lead", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        tenant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "lead@example.com",
        state: "qualified",
        score: 88,
      },
      error: null,
    });
    const eq = vi.fn();
    eq.mockReturnValue({ eq, maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const fakeClient = { from } as any;

    const repo = new PostgresLeadRepository(fakeClient);
    const lead = await repo.findById(
      new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    );

    expect(lead?.state).toBe(LeadState.Qualified);
    expect(lead?.score).toBe(88);
  });

  it("upserts lead row on save", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const fakeClient = { from } as any;

    const repo = new PostgresLeadRepository(fakeClient);
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    await repo.save(lead);

    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
