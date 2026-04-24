import { describe, expect, it } from "vitest";

import { EmailValidator } from "@/src/core/infrastructure/adapters/templates/EmailValidator";

describe("EmailValidator", () => {
  it("accepts concise email with CTA and no spam terms", () => {
    const validator = new EmailValidator();
    const result = validator.validate({
      subject: "Quick idea for your team",
      body: "Hi Alex, open to a 15-min call next week to discuss this approach?",
    });
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("flags spam terms and missing CTA", () => {
    const validator = new EmailValidator();
    const result = validator.validate({
      subject: "Guaranteed results",
      body: "This is risk-free and limited time.",
    });
    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.startsWith("spam_term:"))).toBe(true);
    expect(result.reasons).toContain("missing_cta");
  });
});
