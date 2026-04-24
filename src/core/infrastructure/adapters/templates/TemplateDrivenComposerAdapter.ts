import { MessageComposerPort } from "@/src/core/application/ports/MessageComposerPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiComposerAgent } from "@/src/core/infrastructure/adapters/gemini/ComposerAgent";
import { EmailValidator } from "@/src/core/infrastructure/adapters/templates/EmailValidator";
import { PersonalizationExtractor } from "@/src/core/infrastructure/adapters/templates/PersonalizationExtractor";

export class TemplateDrivenComposerAdapter implements MessageComposerPort {
  constructor(
    private readonly composerAgent: GeminiComposerAgent,
    private readonly emailValidator: EmailValidator = new EmailValidator(),
    private readonly personalizationExtractor: PersonalizationExtractor = new PersonalizationExtractor(),
    private readonly minValidationScore: number = Number(process.env.ALE_COMPOSER_MIN_VALIDATION_SCORE ?? 0.7),
    private readonly maxGenerationAttempts: number = Number(process.env.ALE_COMPOSER_MAX_GENERATION_ATTEMPTS ?? 2),
  ) {}

  async compose(input: {
    tenantId: string;
    leadId: string;
    sequenceId: string;
    leadAttributes?: Record<string, string | number | boolean>;
    templateCandidates?: Array<{
      id: string;
      subjectTemplate: string;
      bodyTemplate: string;
      replyRate: number;
      bookingRate: number;
    }>;
    selectedTemplateId?: string;
  }): Promise<{ subject: string; body: string; templateId?: string }> {
    const selected = this.selectTemplate(input);
    const personalizations = selected
      ? this.personalizationExtractor.extract({
          subjectTemplate: selected.subjectTemplate,
          bodyTemplate: selected.bodyTemplate,
          leadAttributes: input.leadAttributes,
        })
      : {};

    let lastValidation: { score: number; reasons: string[] } | null = null;
    const attempts = Math.max(1, this.maxGenerationAttempts);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const decision = await this.composerAgent.execute(AgentAction.ComposeMessage, {
        tenantId: input.tenantId,
        leadId: input.leadId,
        sequenceId: input.sequenceId,
        selectedTemplateId: selected?.id,
        templateCandidates: input.templateCandidates ?? [],
        personalizations,
        constraints: {
          maxWords: 150,
          includeCTA: true,
          validationRetry: attempt > 1,
          previousFailureReasons: lastValidation?.reasons ?? [],
        },
      });
      const payload = this.readMetadata(decision.metadata);
      const subject = typeof payload.subject === "string" ? payload.subject : "";
      const body = typeof payload.emailBody === "string" ? payload.emailBody : "";

      const validation = this.emailValidator.validate({ subject, body, maxWords: 150 });
      lastValidation = { score: validation.score, reasons: validation.reasons };
      if (validation.valid && validation.score >= this.minValidationScore) {
        return {
          subject,
          body,
          templateId: selected?.id,
        };
      }
    }
    throw new Error(
      `Generated email failed validation after ${attempts} attempt(s): ` +
        `${lastValidation?.reasons.join(", ") ?? "unknown"} (score=${lastValidation?.score ?? 0})`,
    );
  }

  private selectTemplate(input: {
    selectedTemplateId?: string;
    templateCandidates?: Array<{ id: string; subjectTemplate: string; bodyTemplate: string }>;
  }) {
    const candidates = input.templateCandidates ?? [];
    if (candidates.length === 0) {
      return undefined;
    }
    if (!input.selectedTemplateId) {
      return candidates[0];
    }
    return candidates.find((candidate) => candidate.id === input.selectedTemplateId) ?? candidates[0];
  }

  private readMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    if (typeof metadata.metadata === "object" && metadata.metadata) {
      return metadata.metadata as Record<string, unknown>;
    }
    return metadata;
  }
}
