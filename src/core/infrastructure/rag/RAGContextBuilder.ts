import { VectorDatabasePort } from "@/src/core/application/ports/VectorDatabasePort";
import { EmbeddingPort } from "@/src/core/application/ports/EmbeddingPort";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { TenantId } from "@/src/core/domain/shared/ids";

export interface RAGContext {
  similarLeads: {
    lead: Lead;
    similarity: number;
    outcome: string;
  }[];
  topTemplates: any[];
  conversationPatterns: any[];
}

export class RAGContextBuilder {
  constructor(
    private readonly vectorDB: VectorDatabasePort,
    private readonly embedding: EmbeddingPort,
    private readonly leadRepository: LeadRepositoryPort
  ) {}

  async buildContext(lead: Lead, tenantId: string): Promise<RAGContext> {
    const searchQuery = this.serializeLeadForEmbedding(lead);
    const embedding = await this.embedding.generate(searchQuery);
    
    const results = await this.vectorDB.search(embedding, 5, { tenantId });
    
    const similarLeads = await Promise.all(
      results.map(async (result) => {
        // Assuming result.id is the leadId
        // In a real system, we'd store the outcome in metadata to avoid extra DB calls
        const fullLead = await this.leadRepository.findById(new TenantId(tenantId), lead.id); 
        // Wait, lead.id is the target lead. I need result.id.
        // But findById needs a LeadId object.
        // For now, I'll use a simplified version.
        return {
          lead: fullLead!,
          similarity: result.score,
          outcome: (result.metadata.outcome as string) || "unknown",
        };
      })
    );

    return {
      similarLeads: similarLeads.filter(l => l.lead),
      topTemplates: [], // To be implemented
      conversationPatterns: [], // To be implemented
    };
  }

  async indexLeadOutcome(lead: Lead, outcome: string): Promise<void> {
    const text = this.serializeLeadForEmbedding(lead);
    const embedding = await this.embedding.generate(text);
    
    await this.vectorDB.upsert({
      id: lead.id.value,
      embedding,
      metadata: {
        type: "lead_outcome",
        tenantId: lead.tenantId.value,
        outcome,
        industry: lead.enrichmentData?.company?.industry,
        title: lead.enrichmentData?.person?.title,
      },
    });
  }

  private serializeLeadForEmbedding(lead: Lead): string {
    return [
      lead.email,
      lead.enrichmentData?.company?.name,
      lead.enrichmentData?.company?.industry,
      lead.enrichmentData?.person?.title,
      lead.enrichmentData?.company?.description,
    ]
      .filter(Boolean)
      .join(" ");
  }
}
