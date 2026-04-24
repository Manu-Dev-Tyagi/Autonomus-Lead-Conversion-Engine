export interface EmailValidationResult {
  readonly valid: boolean;
  readonly score: number;
  readonly reasons: string[];
}

const SPAM_TERMS = ["free money", "guaranteed", "risk-free", "act now", "limited time"];

export class EmailValidator {
  validate(input: { subject: string; body: string; maxWords?: number }): EmailValidationResult {
    const reasons: string[] = [];
    const maxWords = input.maxWords ?? 150;
    const bodyWordCount = input.body.trim().split(/\s+/).filter(Boolean).length;

    if (!input.subject.trim()) {
      reasons.push("missing_subject");
    }
    if (!input.body.trim()) {
      reasons.push("missing_body");
    }
    if (bodyWordCount > maxWords) {
      reasons.push("body_too_long");
    }

    const lower = `${input.subject} ${input.body}`.toLowerCase();
    for (const term of SPAM_TERMS) {
      if (lower.includes(term)) {
        reasons.push(`spam_term:${term}`);
      }
    }

    const hasCta = /\b(call|chat|meeting|schedule|15[- ]?min)\b/i.test(input.body);
    if (!hasCta) {
      reasons.push("missing_cta");
    }

    const penalty = reasons.length * 0.15;
    const score = Math.max(0, Math.min(1, 1 - penalty));
    return {
      valid: reasons.length === 0,
      score,
      reasons,
    };
  }
}
