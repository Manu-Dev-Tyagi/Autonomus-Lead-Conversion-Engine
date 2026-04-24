import { writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";
import { LlmAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/LlmAgentGatewayAdapter";

dotenv.config({ path: ".env.local" });

type AgentRun = {
  agent: string;
  action: string;
  decision: AgentDecision;
};

const tenantIdValue = "11111111-1111-4111-8111-111111111111";
const leadIdValue = "22222222-2222-4222-8222-222222222222";
const targetEmail = "manudevtyagi049@gmail.com";
const useRealLlm = (process.env.E2E_USE_REAL_LLM ?? "false").toLowerCase() === "true";

function simulatedDecision(action: AgentAction): AgentDecision {
  const map: Record<AgentAction, AgentDecision> = {
    [AgentAction.CreateLead]: {
      action,
      confidence: 0.97,
      reasoning: "Lead intake validation passed.",
      alternatives: [],
      metadata: { normalized: true },
    },
    [AgentAction.EnrichLead]: {
      action,
      confidence: 0.88,
      reasoning: "Enriched profile using available project context.",
      alternatives: [],
      metadata: { providers: ["internal"] },
    },
    [AgentAction.ScoreLead]: {
      action,
      confidence: 0.84,
      reasoning: "High fit against ICP and intent baseline.",
      alternatives: ["disqualify"],
      metadata: { scoreModel: "v1" },
    },
    [AgentAction.QualifyLead]: {
      action,
      confidence: 0.83,
      reasoning: "Qualification threshold reached.",
      alternatives: ["disqualify"],
      metadata: { threshold: 0.7 },
    },
    [AgentAction.DisqualifyLead]: {
      action,
      confidence: 0.2,
      reasoning: "Not selected in this path.",
      alternatives: [],
      metadata: {},
    },
    [AgentAction.PlanSequence]: {
      action,
      confidence: 0.81,
      reasoning: "Selected concise outbound sequence.",
      alternatives: ["long_sequence"],
      metadata: { sequenceId: "seq-e2e-01", stepCount: 3 },
    },
    [AgentAction.ComposeMessage]: {
      action,
      confidence: 0.86,
      reasoning: "Composed project-relevant intro message.",
      alternatives: ["short_message"],
      metadata: {
        subject: "Quick idea to accelerate your project pipeline",
        body: [
          "Hi Manu,",
          "",
          "We reviewed your current setup and identified 3 quick gains:",
          "1) tighter lead qualification loops",
          "2) response-priority orchestration",
          "3) confidence-gated booking automation",
          "",
          "Happy to share a short walkthrough if useful.",
          "",
          "Best,",
          "ALE Agent",
        ].join("\n"),
      },
    },
    [AgentAction.OptimizeTiming]: {
      action,
      confidence: 0.78,
      reasoning: "Next available high-probability send slot selected.",
      alternatives: ["send_now"],
      metadata: { sendAt: new Date().toISOString() },
    },
    [AgentAction.InterpretResponse]: {
      action,
      confidence: 0.89,
      reasoning: "Inbound response classified as positive intent.",
      alternatives: ["neutral"],
      metadata: { intent: ResponseIntent.Positive },
    },
    [AgentAction.SendEmail]: {
      action,
      confidence: 0.9,
      reasoning: "Message approved and ready for SMTP send.",
      alternatives: ["hold_for_review"],
      metadata: {},
    },
    [AgentAction.ScheduleMeeting]: {
      action,
      confidence: 0.82,
      reasoning: "Positive reply and policy checks allow booking.",
      alternatives: ["request_more_times"],
      metadata: { meetingId: "meeting-e2e-all-01" },
    },
    [AgentAction.OrchestrateWorkflow]: {
      action,
      confidence: 0.8,
      reasoning: "Workflow orchestration selected the expected next action path.",
      alternatives: [],
      metadata: { nextAction: AgentAction.PlanSequence },
    },
  };
  return map[action];
}

async function getDecision(
  gateway: LlmAgentGatewayAdapter,
  action: AgentAction,
  context: Record<string, unknown>,
): Promise<AgentDecision> {
  if (!useRealLlm) return simulatedDecision(action);
  return gateway.execute(action, context);
}

async function sendEmail(subject: string, body: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !port || !user || !pass || !from) {
    return { sent: false, reason: "Missing SMTP env vars." as string };
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
    subject,
    text: body,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;">${body}</pre>`,
    headers: {
      "X-ALE-Run-Id": `ale-e2e-all-${Date.now()}`,
      "X-ALE-Mode": useRealLlm ? "real-llm" : "simulated",
    },
  });

  return {
    sent: true,
    messageId: info.messageId,
    smtpResponse: info.response,
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

  const llmGateway = new LlmAgentGatewayAdapter();
  const runs: AgentRun[] = [];

  // 1) Intake Agent
  runs.push({
    agent: "Intake Agent",
    action: AgentAction.CreateLead,
    decision: await getDecision(llmGateway, AgentAction.CreateLead, { leadId: lead.id.value }),
  });

  // 2) Enrichment Agent
  lead.transitionTo(LeadState.Enriching);
  runs.push({
    agent: "Enrichment Agent",
    action: AgentAction.EnrichLead,
    decision: await getDecision(llmGateway, AgentAction.EnrichLead, { leadId: lead.id.value }),
  });
  lead.transitionTo(LeadState.Enriched);

  // 3) Scoring Agent
  lead.transitionTo(LeadState.Scoring);
  const scoreDecision = await getDecision(llmGateway, AgentAction.ScoreLead, { leadId: lead.id.value });
  runs.push({ agent: "Scoring Agent", action: AgentAction.ScoreLead, decision: scoreDecision });
  const score = Math.round(scoreDecision.confidence * 100);
  lead.updateScore(score);

  // 4) Qualification Step (orchestration decision)
  const qualifyDecision = await getDecision(llmGateway, AgentAction.QualifyLead, { score });
  runs.push({ agent: "Orchestrator Agent", action: AgentAction.QualifyLead, decision: qualifyDecision });
  if (score >= 70) {
    lead.transitionTo(LeadState.Qualified);
  } else {
    lead.transitionTo(LeadState.Disqualified);
  }

  // 5) Strategy Agent
  const strategy = await getDecision(llmGateway, AgentAction.PlanSequence, { leadId: lead.id.value });
  runs.push({ agent: "Strategy Agent", action: AgentAction.PlanSequence, decision: strategy });

  // 6) Composer Agent
  const compose = await getDecision(llmGateway, AgentAction.ComposeMessage, { leadId: lead.id.value });
  runs.push({ agent: "Composer Agent", action: AgentAction.ComposeMessage, decision: compose });
  const subject = String(compose.metadata.subject ?? "ALE follow-up");
  const body = String(compose.metadata.body ?? "Hello from ALE");

  // 7) Timing Agent
  const timing = await getDecision(llmGateway, AgentAction.OptimizeTiming, { leadId: lead.id.value });
  runs.push({ agent: "Timing Agent", action: AgentAction.OptimizeTiming, decision: timing });

  // 8) Response Agent (simulated positive intent)
  lead.transitionTo(LeadState.Outreach);
  const response = await getDecision(llmGateway, AgentAction.InterpretResponse, {
    inboundText: "Yes, interested.",
  });
  runs.push({ agent: "Response Agent", action: AgentAction.InterpretResponse, decision: response });
  lead.transitionTo(LeadState.Replied);

  // 9) Booking Agent
  const booking = await getDecision(llmGateway, AgentAction.ScheduleMeeting, { leadId: lead.id.value });
  runs.push({ agent: "Booking Agent", action: AgentAction.ScheduleMeeting, decision: booking });
  lead.transitionTo(LeadState.Booked);

  // 10) Learning Agent (simulated as feedback capture decision)
  runs.push({
    agent: "Learning Agent",
    action: AgentAction.ScoreLead,
    decision: {
      action: AgentAction.ScoreLead,
      confidence: 0.92,
      reasoning: "Captured outcome feedback for model improvement.",
      alternatives: [],
      metadata: { signal: "positive_reply_booked" },
    },
  });

  const emailSend = await sendEmail(subject, body);
  const mode = useRealLlm ? "REAL_LLM" : "SIMULATED";

  const markdown = [
    "# E2E All Agents Report",
    `Mode: ${mode}`,
    `Lead ID: ${lead.id.value}`,
    `Tenant ID: ${lead.tenantId.value}`,
    `Final lead state: ${lead.state}`,
    `Final score: ${lead.score ?? "n/a"}`,
    "",
    "## Agent Decisions",
    ...runs.map(
      (run, idx) =>
        `${idx + 1}. ${run.agent} (${run.action}) -> confidence=${run.decision.confidence}, reasoning="${run.decision.reasoning}"`,
    ),
    "",
    "## Drafted Email",
    `To: ${targetEmail}`,
    `Subject: ${subject}`,
    "",
    body,
    "",
    `## Send Status: ${emailSend.sent ? "SENT" : "NOT SENT"}`,
    emailSend.sent ? `Message-Id: ${emailSend.messageId}` : `Reason: ${emailSend.reason}`,
    emailSend.sent ? `SMTP response: ${emailSend.smtpResponse}` : "",
  ].join("\n");

  const json = {
    generatedAt: new Date().toISOString(),
    mode,
    tenantId: lead.tenantId.value,
    leadId: lead.id.value,
    finalState: lead.state,
    score: lead.score,
    email: {
      to: targetEmail,
      subject,
      sent: emailSend.sent,
      messageId: (emailSend as { messageId?: string }).messageId,
      smtpResponse: (emailSend as { smtpResponse?: string }).smtpResponse,
      reason: (emailSend as { reason?: string }).reason,
    },
    agents: runs,
  };

  await writeFile("artifacts/e2e-all-agents-report.md", markdown, "utf8");
  await writeFile("artifacts/e2e-all-agents-report.json", JSON.stringify(json, null, 2), "utf8");
  console.log(markdown);
}

main().catch((error) => {
  console.error("E2E all-agents failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
