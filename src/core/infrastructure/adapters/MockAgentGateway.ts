import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

export class MockAgentGateway implements AgentGatewayPort {
  async execute(action: AgentAction, context: any): Promise<AgentDecision> {
    console.log(`[MockAgent] Executing ${action}...`);
    
    const baseDecision = {
      action,
      confidence: 0.95,
      reasoning: "Mock reasoning for simulation.",
      alternatives: [],
      metadata: {}
    };

    switch (action) {
      case AgentAction.EnrichLead:
        return {
          ...baseDecision,
          metadata: { companySize: "500-1000", industry: "Technology", website: "https://example.com" }
        };
      case AgentAction.ScoreLead:
        return {
          ...baseDecision,
          metadata: { intent: "high", score: 85 }
        };
      case AgentAction.PlanSequence:
        return {
          ...baseDecision,
          metadata: { sequenceId: "seq-123", steps: 5 }
        };
      case AgentAction.ComposeMessage:
        return {
          ...baseDecision,
          metadata: { 
            subject: "Autonomous AI for Acme Global", 
            emailBody: "Hi Manu, I saw your work at Future AI Inc. I'd love to show you how ALE can help. Are you free for a 15-min chat next week? Book here: https://cal.com/ale-demo" 
          }
        };
      case AgentAction.OptimizeTiming:
         return {
           ...baseDecision,
           metadata: { sendAt: new Date().toISOString() }
         };
      case AgentAction.InterpretResponse:
        return {
          ...baseDecision,
          metadata: { intent: "interested", sentiment: "positive" }
        };
      default:
        return baseDecision;
    }
  }
}
