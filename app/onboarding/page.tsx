"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    industry: "",
    companySize: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "companyName" && !form.slug) {
      setForm((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      }));
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed.");
      // Reload to pick up the new tenant_id claim
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-container">
        {/* Header */}
        <div className="onboarding-header">
          <div className="logo-mark">ALE</div>
          <h1>Welcome to the Autonomous Lead Engine</h1>
          <p>Let&apos;s set up your workspace in under 60 seconds.</p>
        </div>

        {/* Progress */}
        <div className="progress-bar">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
          <span className="progress-label">Step {step} of 2</span>
        </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <div className="step-card">
            <h2>Your Company</h2>
            <p className="step-sub">This helps our AI agents tailor outreach to your industry.</p>

            <div className="field">
              <label>Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Acme Corporation"
              />
            </div>

            <div className="field">
              <label>Workspace URL</label>
              <div className="slug-row">
                <span className="slug-prefix">ale.app/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="acme-corp"
                />
              </div>
            </div>

            <div className="field">
              <label>Industry</label>
              <select
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
              >
                <option value="">Select your industry</option>
                <option value="saas">Software / SaaS</option>
                <option value="fintech">FinTech</option>
                <option value="healthcare">Healthcare</option>
                <option value="ecommerce">E-commerce</option>
                <option value="agency">Agency / Consulting</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label>Company Size</label>
              <select
                value={form.companySize}
                onChange={(e) => update("companySize", e.target.value)}
              >
                <option value="">Select team size</option>
                <option value="1-10">1-10 people</option>
                <option value="11-50">11-50 people</option>
                <option value="51-200">51-200 people</option>
                <option value="201-500">201-500 people</option>
                <option value="500+">500+ people</option>
              </select>
            </div>

            <button
              className="btn-next"
              onClick={() => setStep(2)}
              disabled={!form.companyName || !form.slug}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Review & Launch */}
        {step === 2 && (
          <div className="step-card">
            <h2>Review & Launch</h2>
            <p className="step-sub">Everything look right? Hit launch to provision your workspace.</p>

            <div className="review-grid">
              <div className="review-item">
                <span className="review-label">Company</span>
                <span className="review-value">{form.companyName}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Workspace</span>
                <span className="review-value">ale.app/{form.slug}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Industry</span>
                <span className="review-value">{form.industry || "Not set"}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Size</span>
                <span className="review-value">{form.companySize || "Not set"}</span>
              </div>
            </div>

            <div className="what-happens">
              <h4>What happens next:</h4>
              <ul>
                <li>✅ Your isolated workspace is created</li>
                <li>✅ You become the <strong>Owner</strong> with full admin access</li>
                <li>✅ 10 AI agents are activated and ready to work</li>
                <li>✅ You get a webhook URL to start ingesting leads</li>
              </ul>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="btn-row">
              <button className="btn-back" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn-launch"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Provisioning..." : "🚀 Launch Workspace"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: #050608;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
        }
        .onboarding-container {
          width: 100%;
          max-width: 560px;
        }
        .onboarding-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .logo-mark {
          display: inline-block;
          background: linear-gradient(135deg, #0052cc, #6c5ce7);
          color: white;
          font-weight: 900;
          font-size: 18px;
          padding: 8px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          letter-spacing: 2px;
        }
        .onboarding-header h1 {
          font-size: 28px;
          margin: 0 0 8px;
          background: linear-gradient(135deg, #fff, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .onboarding-header p {
          color: rgba(255,255,255,0.5);
          margin: 0;
        }
        .progress-bar {
          margin-bottom: 32px;
        }
        .progress-track {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          height: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0052cc, #6c5ce7);
          border-radius: 10px;
          transition: width 0.4s ease;
        }
        .progress-label {
          display: block;
          text-align: right;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-top: 6px;
        }
        .step-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 32px;
        }
        .step-card h2 {
          margin: 0 0 4px;
          font-size: 22px;
        }
        .step-sub {
          color: rgba(255,255,255,0.5);
          margin: 0 0 28px;
          font-size: 14px;
        }
        .field {
          margin-bottom: 20px;
        }
        .field label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }
        .field input, .field select {
          width: 100%;
          padding: 12px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: white;
          font-size: 15px;
          transition: border-color 0.2s;
        }
        .field input:focus, .field select:focus {
          outline: none;
          border-color: #0052cc;
          background: rgba(255,255,255,0.08);
        }
        .slug-row {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          overflow: hidden;
        }
        .slug-prefix {
          padding: 0 14px;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
          white-space: nowrap;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .slug-row input {
          border: none;
          background: transparent;
          border-radius: 0;
        }
        .review-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 20px;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .review-label {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .review-value {
          font-weight: 600;
          font-size: 15px;
        }
        .what-happens {
          padding: 16px 20px;
          background: rgba(0,82,204,0.08);
          border: 1px solid rgba(0,82,204,0.2);
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .what-happens h4 {
          margin: 0 0 8px;
          font-size: 14px;
          color: #4c9aff;
        }
        .what-happens ul {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
        }
        .what-happens li {
          margin-bottom: 4px;
        }
        .btn-next, .btn-launch {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #0052cc, #6c5ce7);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 8px;
        }
        .btn-next:disabled, .btn-launch:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-next:hover:not(:disabled), .btn-launch:hover:not(:disabled) {
          opacity: 0.9;
        }
        .btn-row {
          display: flex;
          gap: 12px;
        }
        .btn-back {
          padding: 14px 24px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-back:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-row .btn-launch {
          flex: 1;
        }
        .error-msg {
          padding: 12px 16px;
          background: rgba(255,86,48,0.1);
          border: 1px solid rgba(255,86,48,0.2);
          border-radius: 8px;
          color: #ff5630;
          font-size: 13px;
          margin-bottom: 16px;
        }
      `}</style>
    </main>
  );
}
