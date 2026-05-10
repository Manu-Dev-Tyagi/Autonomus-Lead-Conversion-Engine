export interface EnrichmentData {
  person?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    role?: string;
    seniority?: string;
    linkedIn?: string;
    bio?: string;
  };
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    employees?: number;
    location?: string;
    description?: string;
    techStack?: string[];
    linkedIn?: string;
  };
  confidence: number;
  enrichedAt: string;
  provider: string;
}
