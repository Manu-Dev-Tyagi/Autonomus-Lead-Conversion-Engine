import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiComposerAgent } from "@/src/core/infrastructure/adapters/gemini/ComposerAgent";
import { EmailValidator } from "@/src/core/infrastructure/adapters/templates/EmailValidator";
import { PersonalizationExtractor } from "@/src/core/infrastructure/adapters/templates/PersonalizationExtractor";
import { TemplateDrivenComposerAdapter } from "@/src/core/infrastructure/adapters/templates/TemplateDrivenComposerAdapter";

describe("TemplateDrivenComposerAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("composes valid email using selected template and extracted personalizations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      confidence: 0.86,
                      reasoning: "ok",
                      metadata: {
                        subject: "Quick idea for Acme growth",
                        emailBody: "Hi Alex, I was looking at Acme's recent expansion into the European market and was really impressed by your approach to localized payments. I have a few thoughts on how we could potentially streamline your checkout process to increase conversion rates by another 5-10%. Would you be open to a quick 15-minute introductory call next Tuesday or Wednesday afternoon to discuss this further? Best, Manu.",
                        ctaCount: 1,
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const adapter = new TemplateDrivenComposerAdapter(
      new GeminiComposerAgent("test-key"),
      new EmailValidator(),
      new PersonalizationExtractor(),
    );
    const message = await adapter.compose({
      tenantId: "t1",
      leadId: "l1",
      sequenceId: "s1",
      leadAttributes: { firstName: "Alex", company: "Acme" },
      selectedTemplateId: "tpl-1",
      templateCandidates: [
        {
          id: "tpl-1",
          subjectTemplate: "Quick idea for {{company}}",
          bodyTemplate: "Hi {{firstName}}",
          replyRate: 0.2,
          bookingRate: 0.1,
        },
      ],
    });

    expect(message.subject).toContain("Acme");
    expect(message.templateId).toBe("tpl-1");
  });

  it("retries generation when first attempt fails validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        confidence: 0.75,
                        reasoning: "first try",
                        metadata: {
                          subject: "Quick idea for Acme growth",
                          emailBody: "Hi Alex, I was sharing a short note regarding your recent growth. I think we have some interesting synergies that could help you scale even faster. Are you free for a chat?",
                          ctaCount: 1,
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        confidence: 0.86,
                        reasoning: "second try",
                        metadata: {
                          subject: "Quick idea for Acme growth",
                          emailBody: "Hi Alex, I was looking at Acme's recent expansion into the European market and was really impressed by your approach to localized payments. I have a few thoughts on how we could potentially streamline your checkout process to increase conversion rates by another 5-10%. Would you be open to a quick 15-minute introductory call next Tuesday or Wednesday afternoon to discuss this further? Best, Manu.",
                          ctaCount: 1,
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        }),
    );

    const adapter = new TemplateDrivenComposerAdapter(
      new GeminiComposerAgent("test-key"),
      new EmailValidator(),
      new PersonalizationExtractor(),
      0.7,
      2,
    );

    const message = await adapter.compose({
      tenantId: "t1",
      leadId: "l1",
      sequenceId: "s1",
      leadAttributes: { firstName: "Alex", company: "Acme" },
      selectedTemplateId: "tpl-1",
      templateCandidates: [
        {
          id: "tpl-1",
          subjectTemplate: "Quick idea for {{company}}",
          bodyTemplate: "Hi {{firstName}}",
          replyRate: 0.2,
          bookingRate: 0.1,
        },
      ],
    });

    expect(message.body).toContain("15-minute introductory call");
  });

  it("fails after max attempts when validation does not pass", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      confidence: 0.6,
                      reasoning: "bad",
                      metadata: {
                        subject: "Guaranteed outcome",
                        emailBody: "This is risk-free and limited time.",
                        ctaPresent: false,
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const adapter = new TemplateDrivenComposerAdapter(
      new GeminiComposerAgent("test-key"),
      new EmailValidator(),
      new PersonalizationExtractor(),
      0.7,
      2,
    );

    await expect(
      adapter.compose({
        tenantId: "t1",
        leadId: "l1",
        sequenceId: "s1",
      }),
    ).rejects.toThrowError("Generated email failed validation after 2 attempt(s)");
  });
});
