import { describe, expect, it } from "vitest";

import { Campaign } from "@/src/core/domain/campaign/Campaign";
import { CampaignId, TenantId } from "@/src/core/domain/shared/ids";

describe("Campaign aggregate", () => {
  it("requires sequential step ordering", () => {
    expect(() =>
      Campaign.create({
        id: new CampaignId("33333333-3333-4333-8333-333333333333"),
        tenantId: new TenantId("22222222-2222-4222-8222-222222222222"),
        name: "Outbound A",
        steps: [
          { order: 1, delayHours: 0, templateId: "intro" },
          { order: 3, delayHours: 24, templateId: "follow-up" },
        ],
      }),
    ).toThrowError("Campaign step orders must be sequential starting at 1.");
  });
});
