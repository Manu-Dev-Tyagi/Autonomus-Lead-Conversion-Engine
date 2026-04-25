"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/src/components/shared/AppShell";
import { createAdminWorkspace } from "@/lib/api/admin-workspaces";

export default function NewWorkspaceWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerUserId: "",
    industry: "",
    companySize: "",
    template: "default",
  });

  const updateForm = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "name" && !formData.slug) {
      setFormData((prev) => ({ 
        ...prev, 
        slug: value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") 
      }));
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await createAdminWorkspace({
        ...formData,
        idempotencyKey: `wizard:${formData.slug}-${Date.now()}`,
      });
      router.push("/admin/workspaces");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell 
      title="Provision New Workspace" 
      subtitle="Follow the steps to bootstrap a new client environment."
      showAdminLinks
    >
      <div className="wizard-container">
        <div className="wizard-stepper">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`step-indicator ${step >= s ? "active" : ""}`}>
              <div className="step-number">{s}</div>
              <div className="step-label">
                {s === 1 ? "Identity" : s === 2 ? "Company" : "Provision"}
              </div>
            </div>
          ))}
        </div>

        <div className="wizard-card">
          {step === 1 && (
            <div className="wizard-step">
              <h3>Workspace Identity</h3>
              <p className="step-description">Define how the workspace will be identified by the system and users.</p>
              
              <div className="form-group">
                <label>Client Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              <div className="form-group">
                <label>Slug (URL Identifier)</label>
                <div className="slug-input-wrapper">
                  <span className="slug-prefix">ale.app/</span>
                  <input 
                    type="text" 
                    value={formData.slug}
                    onChange={(e) => updateForm("slug", e.target.value)}
                    placeholder="acme-corp"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Primary Owner ID (UUID)</label>
                <input 
                  type="text" 
                  value={formData.ownerUserId}
                  onChange={(e) => updateForm("ownerUserId", e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <h3>Company Profile</h3>
              <p className="step-description">Context for AI agents to tailor their outreach strategy.</p>
              
              <div className="form-group">
                <label>Industry</label>
                <select 
                  value={formData.industry}
                  onChange={(e) => updateForm("industry", e.target.value)}
                >
                  <option value="">Select Industry</option>
                  <option value="saas">Software / SaaS</option>
                  <option value="fintech">FinTech</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="ecommerce">E-commerce</option>
                </select>
              </div>

              <div className="form-group">
                <label>Company Size</label>
                <select 
                  value={formData.companySize}
                  onChange={(e) => updateForm("companySize", e.target.value)}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="500+">500+ Employees</option>
                </select>
              </div>

              <div className="form-group">
                <label>Configuration Template</label>
                <div className="template-selector">
                  <div className={`template-option ${formData.template === "default" ? "active" : ""}`} onClick={() => updateForm("template", "default")}>
                    <div className="template-icon">⚡</div>
                    <div className="template-info">
                      <strong>Standard SaaS</strong>
                      <p>Full-cycle outbound & inbound qualification.</p>
                    </div>
                  </div>
                  <div className={`template-option ${formData.template === "enterprise" ? "active" : ""}`} onClick={() => updateForm("template", "enterprise")}>
                    <div className="template-icon">🏢</div>
                    <div className="template-info">
                      <strong>Enterprise High-Touch</strong>
                      <p>Slower sequences with higher manual intervention.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <h3>Confirm & Provision</h3>
              <p className="step-description">Review settings and launch the provisioning job.</p>
              
              <div className="summary-grid">
                <div className="summary-item"><strong>Client:</strong> {formData.name}</div>
                <div className="summary-item"><strong>URL:</strong> ale.app/{formData.slug}</div>
                <div className="summary-item"><strong>Industry:</strong> {formData.industry || "N/A"}</div>
                <div className="summary-item"><strong>Template:</strong> {formData.template}</div>
              </div>

              {error && <div className="error-box">{error}</div>}
              
              <div className="provisioning-notice">
                Creating this workspace will trigger:
                <ul>
                  <li>Isolated Postgres schema creation (via RLS)</li>
                  <li>Async provisioning job initialization</li>
                  <li>Default agent policy injection</li>
                </ul>
              </div>
            </div>
          )}

          <div className="wizard-actions">
            {step > 1 && (
              <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            
            <div style={{ flex: 1 }} />

            {step < 3 ? (
              <button 
                className="btn-primary" 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!formData.name || !formData.slug || !formData.ownerUserId)}
              >
                Next
              </button>
            ) : (
              <button className="btn-success" onClick={handleCreate} disabled={loading}>
                {loading ? "Provisioning..." : "Launch Workspace"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .wizard-container {
          max-width: 800px;
          margin: 40px auto;
        }

        .wizard-stepper {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          position: relative;
        }

        .wizard-stepper::before {
          content: "";
          position: absolute;
          top: 15px;
          left: 50px;
          right: 50px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          z-index: 1;
        }

        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 2;
          width: 100px;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          border: 2px solid #333;
          transition: all 0.3s ease;
        }

        .step-indicator.active .step-number {
          background: #0052cc;
          color: white;
          border-color: #0052cc;
          box-shadow: 0 0 15px rgba(0, 82, 204, 0.5);
        }

        .step-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
        }

        .step-indicator.active .step-label {
          color: white;
        }

        .wizard-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 40px;
          backdrop-filter: blur(10px);
        }

        .wizard-step h3 {
          margin-top: 0;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .step-description {
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
        }

        input, select {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
        }

        input:focus, select:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: #0052cc;
        }

        .slug-input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .slug-prefix {
          padding: 0 16px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .slug-input-wrapper input {
          border: none;
          background: transparent;
        }

        .template-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .template-option {
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .template-option:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .template-option.active {
          background: rgba(0, 82, 204, 0.1);
          border-color: #0052cc;
        }

        .template-icon {
          font-size: 24px;
        }

        .template-info strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .template-info p {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .summary-item {
          font-size: 14px;
        }

        .provisioning-notice {
          padding: 16px 20px;
          background: rgba(255, 171, 0, 0.1);
          border: 1px solid rgba(255, 171, 0, 0.2);
          border-radius: 8px;
          font-size: 13px;
          color: #ffab00;
        }

        .provisioning-notice ul {
          margin: 8px 0 0;
          padding-left: 20px;
        }

        .wizard-actions {
          display: flex;
          margin-top: 40px;
        }

        button {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .btn-primary {
          background: #0052cc;
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background: #0065ff;
        }

        .btn-primary:disabled {
          background: #333;
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .btn-success {
          background: #36b37e;
          color: white;
          border: none;
        }

        .btn-success:hover {
          background: #4caf50;
        }

        .error-box {
          padding: 12px 16px;
          background: rgba(255, 86, 48, 0.1);
          border: 1px solid rgba(255, 86, 48, 0.2);
          border-radius: 8px;
          color: #ff5630;
          margin-bottom: 24px;
          font-size: 13px;
        }
      `}</style>
    </AppShell>
  );
}
