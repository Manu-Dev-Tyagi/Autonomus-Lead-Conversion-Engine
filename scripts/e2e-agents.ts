import { writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config({ path: ".env.local" });

import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { BookingCoordinatorPort } from "@/src/core/application/ports/BookingCoordinatorPort";
import { ConfidenceGatePort } from "@/src/core/application/ports/ConfidenceGatePort";
import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";
import { EmailDeliveryPort } from "@/src/core/application/ports/EmailDeliveryPort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { HumanApprovalPort } from "@/src/core/application/ports/HumanApprovalPort";
import { IdempotencyPort, IdempotencyResult } from "@/src/core/application/ports/IdempotencyPort";
import { InteractionTrackerPort } from "@/src/core/application/ports/InteractionTrackerPort";
import { KpiTrackerPort } from "@/src/core/application/ports/KpiTrackerPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { LearningFeedbackPort } from "@/src/core/application/ports/LearningFeedbackPort";
import { MessageComposerPort } from "@/src/core/application/ports/MessageComposerPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";
import { PolicyEnginePort } from "@/src/core/application/ports/PolicyEnginePort";
import { ResponseInterpreterPort } from "@/src/core/application/ports/ResponseInterpreterPort";
import { SendTimingPort } from "@/src/core/application/ports/SendTimingPort";
import { StrategyPlannerPort } from "@/src/core/application/ports/StrategyPlannerPort";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { TemplateLibraryPort } from "@/src/core/application/ports/TemplateLibraryPort";
import { TemplatePerformancePort } from "@/src/core/application/ports/TemplatePerformancePort";
import { RetryExecutor } from "@/src/core/application/services/RetryExecutor";
import { ExecuteOutreachBookingLoopUseCase } from "@/src/core/application/use-cases/ExecuteOutreachBookingLoopUseCase";
import { OrchestrateLeadLifecycleUseCase } from "@/src/core/application/use-cases/OrchestrateLeadLifecycleUseCase";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

const tenantIdValue = "11111111-1111-4111-8111-111111111111";
const leadIdValue = "22222222-2222-4222-8222-222222222222";
const targetEmail = "manudevtyagi049@gmail.com";

class InMemoryLeadRepository implements LeadRepositoryPort {
  constructor(private readonly lead: Lead) {}
  async save(lead: Lead): Promise<void> {
    this.lead.state = lead.state;
    this.lead.score = lead.score;
  }
  async findById(tenantId: TenantId, leadId: LeadId): Promise<Lead | null> {
    if (!this.lead.tenantId.equals(tenantId) || !this.lead.id.equals(leadId)) return null;
    return this.lead;
  }
  async findByEmail(tenantId: TenantId, email: string): Promise<Lead | null> {
    if (this.lead.tenantId.equals(tenantId) && this.lead.email === email) return this.lead;
    return null;
  }
}
class InMemoryEventBus implements EventBusPort {
  events: Array<Record<string, unknown>> = [];
  async publish<TPayload>(event: {
    type: string; aggregateId: string; tenantId: string; occurredAt: string; payload: TPayload;
  }): Promise<void> {
    this.events.push(event as Record<string, unknown>);
  }
}
class InMemoryAgentGateway implements AgentGatewayPort {
  async execute(action: AgentAction): Promise<AgentDecision> {
    if (action === AgentAction.ScoreLead) {
      return { action, confidence: 0.86, reasoning: "High fit project", alternatives: [], metadata: {} };
    }
    return { action, confidence: 0.9, reasoning: "Completed", alternatives: [], metadata: {} };
  }
}
class InMemoryDecisionRepo implements AgentDecisionRepositoryPort {
  rows: Array<Record<string, unknown>> = [];
  async save(input: { tenantId: string; leadId: string; decision: AgentDecision; occurredAt: string }): Promise<void> {
    this.rows.push(input as Record<string, unknown>);
  }
}
class InMemoryIdempotency implements IdempotencyPort {
  map = new Map<string, IdempotencyResult>();
  async tryStart(key: string): Promise<{ started: boolean; existingResult?: IdempotencyResult }> {
    return this.map.has(key) ? { started: false, existingResult: this.map.get(key) } : { started: true };
  }
  async complete(key: string, result: IdempotencyResult): Promise<void> {
    this.map.set(key, result);
  }
}
class NoopDlq implements DeadLetterQueuePort {
  async enqueue(): Promise<void> {}
}
class NoopPipeline implements PipelineReadModelPort {
  async upsert(): Promise<void> {}
}
class ConsoleObs implements ObservabilityPort {
  info(message: string, data?: Record<string, unknown>) { console.log("[info]", message, data ?? {}); }
  error(message: string, data?: Record<string, unknown>) { console.log("[error]", message, data ?? {}); }
  metric(name: string, value: number, tags?: Record<string, string>) { console.log("[metric]", name, value, tags ?? {}); }
}
class InMemoryOpsMetrics implements TenantOpsMetricsPort {
  async incrementSuccess(): Promise<void> {}
  async incrementFailure(): Promise<void> {}
  async getByTenant(tenantId: string) { return { tenantId, successCount: 1, failureCount: 0 }; }
}

const strategyPlanner: StrategyPlannerPort = { async plan() { return { sequenceId: "seq-project-x", step: 1, channel: "email" }; } };
const templateLibrary: TemplateLibraryPort = {
  async getBestPerforming() {
    return [
      {
        id: "tpl-e2e-1",
        name: "E2E Intro",
        segment: "default",
        sequenceStep: 1,
        subjectTemplate: "Quick idea for {{company}}",
        bodyTemplate: "Hi {{firstName}}, open to a short walkthrough?",
        replyRate: 0.12,
        bookingRate: 0.04,
      },
    ];
  },
};
const templatePerformance: TemplatePerformancePort = { async recordOutcome() {} };
let draftedSubject = "";
let draftedBody = "";
const draftedHtml = () =>
  `<p>Hi Manu,</p>
<p>We mapped your current project and found 3 immediate optimizations:</p>
<ol>
  <li>automated lead qualification routing</li>
  <li>response-priority based follow-up</li>
  <li>meeting-booking confidence gates</li>
</ol>
<p>If useful, I can share a 15-minute implementation walkthrough.</p>
<p>Best,<br/>ALE Agent</p>`;
const composer: MessageComposerPort = {
  async compose() {
    draftedSubject = "Quick idea to accelerate your project pipeline";
    draftedBody = [
      "Hi Manu,",
      "",
      "We mapped your current project and found 3 immediate optimizations:",
      "1) automated lead qualification routing",
      "2) response-priority based follow-up",
      "3) meeting-booking confidence gates",
      "",
      "If useful, I can share a 15-minute implementation walkthrough.",
      "",
      "Best,",
      "ALE Agent",
    ].join("\n");
    return { subject: draftedSubject, body: draftedBody };
  },
};
const timing: SendTimingPort = { async nextSendAt() { return new Date().toISOString(); } };
const confidenceGate: ConfidenceGatePort = { async requiresApproval() { return false; } };
const approvals: HumanApprovalPort = { async request() {} };
const interpreter: ResponseInterpreterPort = { async interpret() { return ResponseIntent.Positive; } };
const booking: BookingCoordinatorPort = { async book() { return { booked: true, meetingId: "meeting-e2e" }; } };
const interaction: InteractionTrackerPort = { async record() {} };
const policy: PolicyEnginePort = { async assertAllowed() {} };
const learning: LearningFeedbackPort = { async capture() {} };
const kpi: KpiTrackerPort = { async increment() {} };

async function trySendEmail(): Promise<{
  sent: boolean;
  reason?: string;
  messageId?: string;
  smtpResponse?: string;
  envelope?: { from: string; to: string[] };
}> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const templateMode = (process.env.E2E_MAIL_MODE ?? "rich").toLowerCase();
  const runId = `ale-e2e-${Date.now()}`;

  if (!host || !port || !user || !pass || !from) {
    return { sent: false, reason: "Missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM env vars." };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to: targetEmail,
    subject: templateMode === "minimal" ? "ALE deliverability test" : draftedSubject,
    text:
      templateMode === "minimal"
        ? "ALE deliverability test message. If you received this, SMTP delivery path is working."
        : draftedBody,
    html:
      templateMode === "minimal"
        ? "<p>ALE deliverability test message.</p><p>If you received this, SMTP delivery path is working.</p>"
        : draftedHtml(),
    headers: {
      "X-ALE-Run-Id": runId,
      "X-ALE-Flow": "e2e-agents",
      "X-ALE-Tenant": tenantIdValue,
      "X-ALE-Lead": leadIdValue,
    },
  });
  return {
    sent: true,
    messageId: info.messageId,
    smtpResponse: info.response,
    envelope: info.envelope
      ? {
          from: typeof info.envelope.from === "string" ? info.envelope.from : "",
          to: Array.isArray(info.envelope.to) ? (info.envelope.to as string[]) : [],
        }
      : undefined,
  };
}

async function main() {
  const lead = Lead.create({
    id: new LeadId(leadIdValue),
    tenantId: new TenantId(tenantIdValue),
    email: "manu.project@example.com",
    state: LeadState.New,
    score: null,
  });

  const leadRepo = new InMemoryLeadRepository(lead);
  const eventBus = new InMemoryEventBus();
  const decisionRepo = new InMemoryDecisionRepo();
  const idempotency = new InMemoryIdempotency();
  const obs = new ConsoleObs();

  const lifecycle = new OrchestrateLeadLifecycleUseCase(
    leadRepo,
    eventBus,
    new InMemoryAgentGateway(),
    decisionRepo,
    idempotency,
    new RetryExecutor(),
    new NoopDlq(),
    new NoopPipeline(),
    obs,
    new InMemoryOpsMetrics(),
  );

  const lifecycleResult = await lifecycle.execute({
    idempotencyKey: "e2e-lifecycle",
    tenantId: tenantIdValue,
    leadId: leadIdValue,
  });

  const outreach = new ExecuteOutreachBookingLoopUseCase(
    leadRepo,
    eventBus,
    idempotency,
    strategyPlanner,
    templateLibrary,
    templatePerformance,
    composer,
    timing,
    confidenceGate,
    approvals,
    interpreter,
    booking,
    interaction,
    policy,
    learning,
    kpi,
    decisionRepo,
    obs,
    { sendEmail: async () => ({ messageId: "e2e-test" }) } as EmailDeliveryPort,
  );

  const outreachResult = await outreach.execute({
    idempotencyKey: "e2e-outreach",
    tenantId: tenantIdValue,
    leadId: leadIdValue,
    inboundReplyText: "Yes, let's schedule.",
  });

  const emailAttempt = await trySendEmail();
  const report = [
    "# E2E Agent Run Report",
    `Lifecycle status: ${lifecycleResult.status}`,
    `Outreach status: ${outreachResult.status}`,
    `Lead final state: ${lead.state}`,
    "",
    "## Drafted email",
    `To: ${targetEmail}`,
    `Subject: ${draftedSubject}`,
    "",
    draftedBody,
    "",
    `## Send status: ${emailAttempt.sent ? "SENT" : "NOT SENT"}`,
    emailAttempt.reason ? `Reason: ${emailAttempt.reason}` : "",
    emailAttempt.messageId ? `Message-Id: ${emailAttempt.messageId}` : "",
    emailAttempt.smtpResponse ? `SMTP response: ${emailAttempt.smtpResponse}` : "",
    emailAttempt.envelope ? `Envelope: ${JSON.stringify(emailAttempt.envelope)}` : "",
  ].join("\n");

  await writeFile("artifacts/e2e-last-email.md", report, "utf8");
  await writeFile(
    "artifacts/e2e-last-email-metadata.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lifecycleStatus: lifecycleResult.status,
        outreachStatus: outreachResult.status,
        finalLeadState: lead.state,
        recipient: targetEmail,
        subject: draftedSubject,
        send: emailAttempt,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(report);
}

main().catch((error) => {
  console.error("E2E run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
