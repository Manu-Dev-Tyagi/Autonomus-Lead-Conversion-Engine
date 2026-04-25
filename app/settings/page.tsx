"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/src/components/shared/AppShell";
import { useWorkspace } from "@/src/core/presentation/context/WorkspaceContext";

export default function SettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const [copied, setCopied] = useState<string | null>(null);

  const tenantId = currentWorkspace?.tenantId || "loading...";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const webhookUrl = `${baseUrl}/api/webhooks/forms`;
  const emailWebhookUrl = `${baseUrl}/api/webhooks/email`;
  const apiLeadsUrl = `${baseUrl}/api/leads`;

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenantId": "${tenantId}",
    "email": "prospect@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "companyName": "Acme Corp"
  }'`;

  const zapierPayload = JSON.stringify(
    {
      tenantId: tenantId,
      email: "{{email}}",
      firstName: "{{first_name}}",
      lastName: "{{last_name}}",
      companyName: "{{company}}",
    },
    null,
    2
  );

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppShell
      title="Settings"
      subtitle="Configure integrations, API keys, and lead ingestion."
    >
      {/* Lead Ingestion Section */}
      <section className="settings-section">
        <h2 className="section-title">Lead Ingestion</h2>
        <p className="section-desc">
          Use these endpoints to push leads into your ALE workspace automatically.
        </p>

        <div className="config-card">
          <div className="config-header">
            <div className="config-icon">🔗</div>
            <div>
              <h3>Webhook URL (Forms / Zapier / Make)</h3>
              <p>POST leads from any form builder, CRM, or automation tool.</p>
            </div>
          </div>
          <div className="config-value">
            <code>{webhookUrl}</code>
            <button
              className="copy-btn"
              onClick={() => copy(webhookUrl, "webhook")}
            >
              {copied === "webhook" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="config-card">
          <div className="config-header">
            <div className="config-icon">🏷️</div>
            <div>
              <h3>Your Tenant ID</h3>
              <p>Include this in every webhook payload to route leads to your workspace.</p>
            </div>
          </div>
          <div className="config-value">
            <code>{tenantId}</code>
            <button
              className="copy-btn"
              onClick={() => copy(tenantId, "tenant")}
            >
              {copied === "tenant" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="config-card">
          <div className="config-header">
            <div className="config-icon">📩</div>
            <div>
              <h3>Email Event Webhook (SendGrid / Mailgun)</h3>
              <p>Receive delivery, open, and reply events from your email provider.</p>
            </div>
          </div>
          <div className="config-value">
            <code>{emailWebhookUrl}</code>
            <button
              className="copy-btn"
              onClick={() => copy(emailWebhookUrl, "emailwebhook")}
            >
              {copied === "emailwebhook" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="settings-section">
        <h2 className="section-title">Quick Start Examples</h2>

        <div className="config-card">
          <div className="config-header">
            <div className="config-icon">💻</div>
            <div>
              <h3>cURL Example</h3>
              <p>Test lead ingestion from your terminal.</p>
            </div>
          </div>
          <pre className="code-block">{curlExample}</pre>
          <button className="copy-btn" onClick={() => copy(curlExample, "curl")}>
            {copied === "curl" ? "✓ Copied" : "Copy command"}
          </button>
        </div>

        <div className="config-card">
          <div className="config-header">
            <div className="config-icon">⚡</div>
            <div>
              <h3>Zapier / Make Payload</h3>
              <p>Use this JSON structure in your automation builder&apos;s webhook action.</p>
            </div>
          </div>
          <pre className="code-block">{zapierPayload}</pre>
          <button className="copy-btn" onClick={() => copy(zapierPayload, "zap")}>
            {copied === "zap" ? "✓ Copied" : "Copy payload"}
          </button>
        </div>
      </section>

      {/* Team Members Placeholder */}
      <section className="settings-section">
        <h2 className="section-title">Team</h2>
        <p className="section-desc">Invite team members to collaborate in this workspace.</p>
        <div className="config-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Team management coming soon.
          </p>
        </div>
      </section>

      <style jsx>{`
        .settings-section {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 18px;
          margin: 0 0 4px;
        }
        .section-desc {
          color: var(--muted);
          margin: 0 0 20px;
          font-size: 14px;
        }
        .config-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 12px;
        }
        .config-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .config-icon {
          font-size: 24px;
          flex-shrink: 0;
        }
        .config-header h3 {
          margin: 0;
          font-size: 15px;
        }
        .config-header p {
          margin: 2px 0 0;
          font-size: 13px;
          color: var(--muted);
        }
        .config-value {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .config-value code {
          flex: 1;
          background: rgba(0,0,0,0.3);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          color: #4c9aff;
          border: 1px solid rgba(255,255,255,0.06);
          overflow-x: auto;
          white-space: nowrap;
        }
        .copy-btn {
          padding: 8px 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-btn:hover {
          background: rgba(255,255,255,0.12);
        }
        .code-block {
          background: rgba(0,0,0,0.4);
          padding: 16px;
          border-radius: 8px;
          font-size: 12px;
          color: #a5b4fc;
          overflow-x: auto;
          margin: 0 0 12px;
          border: 1px solid rgba(255,255,255,0.06);
          line-height: 1.5;
        }
      `}</style>
    </AppShell>
  );
}
