# Technical PRD: Autonomous Lead Engine (ALE)
## Multi-Agent System with Hexagonal Architecture

**Version:** 1.0  
**Date:** April 24, 2026  
**Architecture:** Hexagonal (Ports & Adapters)  
**Paradigm:** Multi-Agent, Event-Driven, SOLID/IoC

---

## Executive Summary

ALE is a production-grade, multi-agent system that autonomously converts inbound leads to booked meetings. Built on hexagonal architecture principles with strict SOLID/IoC compliance, the system orchestrates specialized AI agents using Gemini API, designed for horizontal scalability across multiple tenants.

**Core Innovation:**
- **Agent Orchestra Pattern**: Coordinated specialist agents vs. monolithic AI
- **Continuous Learning Loop**: Agents improve from outcomes, not just rules
- **Trust & Control Layer**: Every decision is explainable and overridable

---

## 1. System Architecture Overview

### 1.1 Hexagonal Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  (APIs, Webhooks, UI, Event Subscribers)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Ports (Interfaces)
┌──────────────────────┴──────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  - Agent Orchestrator                                        │
│  - Use Cases (Commands/Queries)                              │
│  - Event Handlers                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  - Lead Aggregate                                            │
│  - Agents (Decision Models)                                  │
│  - Domain Events                                             │
│  - Business Rules                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Ports (Interfaces)
┌──────────────────────┴──────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  - Repositories (PostgreSQL)                                 │
│  - Event Store (Kafka/RabbitMQ)                              │
│  - LLM Adapter (Gemini API)                                  │
│  - Email Provider (SMTP/SendGrid)                            │
│  - Calendar Sync (Google/Outlook)                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Multi-Agent System Design

Based on research papers on autonomous agents and multi-agent systems:

**Agent Types:**

1. **Intake Agent** - Lead capture & normalization
2. **Enrichment Agent** - Data augmentation & research
3. **Scoring Agent** - Qualification & prioritization
4. **Strategy Agent** - Outreach planning & sequencing
5. **Composer Agent** - Message generation & personalization
6. **Timing Agent** - Send-time optimization
7. **Response Agent** - Reply interpretation & next action
8. **Booking Agent** - Meeting scheduling & coordination
9. **Learning Agent** - Outcome analysis & model improvement
10. **Orchestrator Agent** - Workflow coordination & conflict resolution

**Communication Pattern:** Event-driven, asynchronous, with central orchestrator

---

## 2. Domain Model (DDD)

### 2.1 Core Aggregates

#### **Lead Aggregate**
```typescript
class Lead {
  id: LeadId
  tenantId: TenantId
  source: LeadSource
  contactInfo: ContactInfo
  enrichmentData: EnrichmentData
  score: Score
  state: LeadState
  interactions: Interaction[]
  metadata: LeadMetadata
  
  // Invariants enforced
  - No duplicate emails per tenant
  - State transitions must be valid
  - Score must be recalculated on enrichment
}
```

#### **Interaction Aggregate**
```typescript
class Interaction {
  id: InteractionId
  leadId: LeadId
  type: InteractionType // EMAIL, MEETING, CALL
  direction: Direction // INBOUND, OUTBOUND
  content: Content
  agentDecision: AgentDecision
  outcome: Outcome
  timestamp: DateTime
}
```

#### **Campaign Aggregate**
```typescript
class Campaign {
  id: CampaignId
  tenantId: TenantId
  sequences: Sequence[]
  rules: CampaignRule[]
  performance: PerformanceMetrics
  learningData: LearningData
}
```

### 2.2 Value Objects

- `ContactInfo`: Email, Phone, LinkedIn, Company
- `Score`: Value (0-100), Confidence, Reasoning, Criteria
- `AgentDecision`: Action, Confidence, Reasoning, Alternatives
- `EnrichmentData`: CompanyData, PersonData, TechnographicData

### 2.3 Domain Events

```typescript
// Lead Lifecycle Events
LeadCreated
LeadEnriched
LeadScored
LeadQualified / LeadDisqualified

// Interaction Events
EmailSent
EmailOpened
EmailReplied
EmailBounced
MeetingBooked
MeetingCompleted

// Learning Events
OutcomeRecorded
PatternDetected
ModelUpdated
```

---

## 3. Agent Architecture (Research-Driven)

### 3.1 Agent Base Interface (Port)

```typescript
interface IAgent {
  name: string
  version: string
  
  // Core method - SOLID: Single Responsibility
  execute(context: AgentContext): Promise<AgentDecision>
  
  // Learning capability
  learn(feedback: Feedback): Promise<void>
  
  // Explainability
  explain(decision: AgentDecision): Explanation
  
  // Health & monitoring
  healthCheck(): HealthStatus
}

interface AgentContext {
  leadId: LeadId
  tenantId: TenantId
  currentState: LeadState
  history: Interaction[]
  tenantConfig: TenantConfig
  externalData?: Record<string, any>
}

interface AgentDecision {
  action: Action
  confidence: number // 0.0 to 1.0
  reasoning: string
  alternatives: Alternative[]
  metadata: Record<string, any>
}
```

### 3.2 Individual Agent Specifications

#### **3.2.1 Intake Agent**

**Responsibility:** Capture leads from any source, normalize, deduplicate

**Implementation:**
```typescript
class IntakeAgent implements IAgent {
  constructor(
    private leadRepository: ILeadRepository,
    private deduplicationService: IDeduplicationService,
    private validationService: IValidationService,
    private eventBus: IEventBus
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    // 1. Validate input data
    // 2. Check for duplicates
    // 3. Normalize fields
    // 4. Create Lead entity
    // 5. Emit LeadCreated event
  }
}
```

**LLM Usage:** Minimal (only for complex field mapping)

**Dependencies:**
- Lead Repository (Port)
- Deduplication Service (Port)
- Event Bus (Port)

---

#### **3.2.2 Enrichment Agent**

**Responsibility:** Augment lead data from external sources

**Implementation:**
```typescript
class EnrichmentAgent implements IAgent {
  constructor(
    private enrichmentProviders: IEnrichmentProvider[],
    private llm: ILLMProvider,
    private leadRepository: ILeadRepository,
    private eventBus: IEventBus
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    // 1. Identify missing data points
    // 2. Query enrichment APIs (Clearbit, Apollo, etc.)
    // 3. Use LLM to infer from public data (LinkedIn, company website)
    // 4. Assign confidence scores to each enriched field
    // 5. Update Lead aggregate
    // 6. Emit LeadEnriched event
  }
  
  async learn(feedback: Feedback): Promise<void> {
    // Learn which enrichment sources are most accurate
    // Adjust provider priority
  }
}
```

**LLM Usage:** High
- Company research from website
- Role inference from job title
- Pain point extraction from social posts

**Prompt Template:**
```
Given:
- Company: {company_name}
- Website: {website_url}
- Contact: {name}, {title}

Extract:
1. Company size (employees)
2. Industry vertical
3. Recent funding/growth signals
4. Tech stack (if available)
5. Likely pain points for our solution

Output format: JSON with confidence scores
```

---

#### **3.2.3 Scoring Agent**

**Responsibility:** Qualify leads based on ICP fit, intent signals, and enrichment data

**Research Foundation:** 
- Multi-criteria decision making (MCDM)
- Reinforcement learning from historical conversions
- Explainable AI (XAI) for transparency

**Implementation:**
```typescript
class ScoringAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private scoringModel: IScoringModel,
    private tenantConfigService: ITenantConfigService,
    private eventBus: IEventBus
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    const config = await this.tenantConfigService.getConfig(context.tenantId)
    
    // Multi-factor scoring
    const scores = {
      icpFit: await this.calculateICPFit(context, config.icp),
      intentSignals: await this.detectIntentSignals(context),
      enrichmentQuality: this.assessDataCompleteness(context),
      timingSensitivity: await this.assessUrgency(context)
    }
    
    // LLM-based reasoning
    const reasoning = await this.llm.generateReasoning({
      scores,
      criteria: config.scoringCriteria,
      lead: context.lead
    })
    
    const finalScore = this.scoringModel.aggregate(scores)
    
    return {
      action: finalScore > config.qualificationThreshold 
        ? 'QUALIFY' 
        : 'DISQUALIFY',
      confidence: reasoning.confidence,
      reasoning: reasoning.explanation,
      metadata: { scores, finalScore }
    }
  }
  
  async learn(feedback: Feedback): Promise<void> {
    // Update scoring model weights based on actual conversions
    // Retrain lightweight model periodically
  }
}
```

**LLM Prompt:**
```
Analyze this lead for qualification:

Lead Data:
{enriched_lead_data}

Our ICP (Ideal Customer Profile):
{icp_criteria}

Historical patterns:
{successful_conversions_summary}

Task:
1. Rate fit on each ICP criterion (0-10)
2. Identify positive/negative signals
3. Predict conversion likelihood
4. Explain reasoning in 2-3 sentences

Output: JSON with scores and explanation
```

---

#### **3.2.4 Strategy Agent**

**Responsibility:** Design outreach sequence based on lead profile, score, and context

**Research Foundation:**
- Reinforcement learning (RL) for sequence optimization
- A/B testing framework
- Contextual bandits for variant selection

**Implementation:**
```typescript
class StrategyAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private sequenceLibrary: ISequenceLibrary,
    private abTestingEngine: IABTestingEngine,
    private performanceAnalyzer: IPerformanceAnalyzer
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    // 1. Analyze lead profile & score
    const profile = this.buildLeadProfile(context)
    
    // 2. Get historical performance for similar leads
    const similarLeadPerformance = await this.performanceAnalyzer
      .findSimilarLeads(profile)
    
    // 3. LLM generates custom sequence or selects from library
    const sequenceOptions = await this.llm.generateSequence({
      leadProfile: profile,
      historicalPerformance: similarLeadPerformance,
      tenantConfig: context.tenantConfig,
      sequenceLibrary: await this.sequenceLibrary.getAll()
    })
    
    // 4. A/B testing selection
    const selectedSequence = await this.abTestingEngine
      .selectVariant(sequenceOptions, profile)
    
    return {
      action: 'EXECUTE_SEQUENCE',
      confidence: selectedSequence.expectedPerformance,
      reasoning: selectedSequence.reasoning,
      metadata: { sequence: selectedSequence }
    }
  }
}
```

**Sequence Structure:**
```typescript
interface Sequence {
  id: string
  steps: SequenceStep[]
  triggers: Trigger[]
  exitConditions: ExitCondition[]
}

interface SequenceStep {
  order: number
  type: 'EMAIL' | 'WAIT' | 'CONDITION'
  template?: MessageTemplate
  delay?: Duration
  condition?: Condition
}
```

**LLM Prompt:**
```
Design an outreach sequence for this lead:

Lead Profile:
- Industry: {industry}
- Role: {title}
- Company Size: {size}
- Score: {score}/100
- Intent Signals: {signals}

Historical Performance (similar leads):
- 3-touch sequence: 12% reply rate
- 5-touch sequence: 18% reply rate
- Personalized video: 24% reply rate

Constraints:
- Max touches: {max_touches}
- Tone: {tone_preference}
- No LinkedIn (not connected)

Generate:
1. Optimal sequence (3-7 touches)
2. Timing between touches
3. Key personalization points
4. Success prediction

Output: JSON sequence structure
```

---

#### **3.2.5 Composer Agent**

**Responsibility:** Generate personalized email content

**Research Foundation:**
- Few-shot learning with best-performing examples
- Style transfer
- Persona modeling

**Implementation:**
```typescript
class ComposerAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private templateLibrary: ITemplateLibrary,
    private personalizationEngine: IPersonalizationEngine,
    private toneAnalyzer: IToneAnalyzer
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    const step = context.currentSequenceStep
    const lead = context.lead
    
    // 1. Get high-performing examples for this segment
    const examples = await this.templateLibrary
      .getBestPerforming(lead.segment, step.type)
    
    // 2. Extract personalization variables
    const personalizations = await this.personalizationEngine
      .extract(lead, context.tenantConfig)
    
    // 3. Generate email using LLM with few-shot examples
    const generatedEmail = await this.llm.generate({
      task: 'compose_email',
      examples: examples,
      variables: personalizations,
      constraints: {
        maxLength: 150, // words
        tone: context.tenantConfig.tone,
        includeCTA: true,
        avoidSpamWords: true
      }
    })
    
    // 4. Validate output (spam score, sentiment, CTA presence)
    const validation = await this.validate(generatedEmail)
    
    if (validation.score < 0.7) {
      // Regenerate with additional constraints
      return this.execute(context) // Retry with learned constraints
    }
    
    return {
      action: 'SEND_EMAIL',
      confidence: validation.score,
      reasoning: validation.explanation,
      metadata: { 
        email: generatedEmail,
        personalizationUsed: personalizations,
        templateBase: examples[0].id
      }
    }
  }
}
```

**LLM Prompt:**
```
Compose a cold outreach email:

Context:
- Recipient: {name}, {title} at {company}
- Our Solution: {value_proposition}
- Personalization Points:
  * {company} recently {recent_event}
  * {name} posted about {pain_point}
  * {company} uses {tech_stack}

Examples of high-performing emails (same segment):
---
{example_1}
(Reply rate: 34%, Booked: 12%)
---
{example_2}
(Reply rate: 29%, Booked: 15%)
---

Requirements:
- Length: 80-120 words
- Tone: {tone} (professional, conversational, etc.)
- Include: Clear CTA for 15-min call
- Avoid: Generic pitches, multiple CTAs

Generate:
1. Subject line (5-7 words)
2. Email body
3. Confidence score (0-1)
4. Reasoning for approach

Output: JSON
```

---

#### **3.2.6 Timing Agent**

**Responsibility:** Optimize send times based on recipient behavior and historical data

**Research Foundation:**
- Time-series analysis
- Survival analysis (when leads go cold)
- Circadian rhythm modeling

**Implementation:**
```typescript
class TimingAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private timingModel: ITimingModel,
    private timezoneService: ITimezoneService
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    const lead = context.lead
    const recipientTimezone = await this.timezoneService
      .detect(lead.contactInfo)
    
    // Historical open/reply patterns for similar leads
    const patterns = await this.timingModel
      .getPatterns(lead.segment, recipientTimezone)
    
    // LLM reasons about optimal time
    const recommendation = await this.llm.reason({
      recipientProfile: {
        role: lead.enrichmentData.role,
        industry: lead.enrichmentData.industry,
        timezone: recipientTimezone
      },
      historicalPatterns: patterns,
      currentTime: new Date(),
      constraints: {
        businessHoursOnly: true,
        avoidMondays: context.tenantConfig.avoidMondays,
        preferredDays: context.tenantConfig.preferredDays
      }
    })
    
    return {
      action: 'SCHEDULE_SEND',
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning,
      metadata: { 
        scheduledTime: recommendation.optimalTime,
        timezone: recipientTimezone
      }
    }
  }
}
```

---

#### **3.2.7 Response Agent**

**Responsibility:** Interpret replies, extract intent, determine next action

**Research Foundation:**
- Intent classification
- Sentiment analysis
- Entity extraction (meeting time mentions, objections)

**Implementation:**
```typescript
class ResponseAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private intentClassifier: IIntentClassifier,
    private entityExtractor: IEntityExtractor
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    const reply = context.currentInteraction.content
    
    // Multi-stage analysis
    const analysis = await this.llm.analyze({
      email: reply,
      context: context.history,
      tasks: [
        'extract_intent', // INTERESTED, NOT_INTERESTED, OBJECTION, QUESTION
        'extract_sentiment',
        'extract_entities', // dates, times, conditions
        'detect_urgency'
      ]
    })
    
    // Decision tree based on intent
    let nextAction: Action
    
    switch (analysis.intent) {
      case 'INTERESTED':
        nextAction = 'TRIGGER_BOOKING'
        break
      case 'OBJECTION':
        const objectionType = analysis.entities.objection
        nextAction = {
          type: 'SEND_OBJECTION_HANDLER',
          metadata: { objectionType }
        }
        break
      case 'QUESTION':
        nextAction = {
          type: 'ANSWER_QUESTION',
          metadata: { question: analysis.entities.question }
        }
        break
      case 'NOT_INTERESTED':
        nextAction = 'EXIT_SEQUENCE'
        break
      default:
        nextAction = 'HUMAN_REVIEW'
    }
    
    return {
      action: nextAction,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      metadata: { analysis }
    }
  }
}
```

**LLM Prompt:**
```
Analyze this email reply to our outreach:

Original Email:
{our_last_email}

Reply:
{prospect_reply}

Conversation History:
{previous_interactions}

Extract:
1. Primary intent (interested/not_interested/objection/question/unclear)
2. Sentiment (positive/neutral/negative)
3. Urgency level (high/medium/low)
4. Mentioned entities (dates, times, conditions, questions)
5. Objection type (if any): timing/budget/authority/need/other

Recommend next action:
- If interested: Suggest booking link or human handoff
- If objection: Identify objection handler
- If question: Extract question for answering
- If not interested: Recommend exit or last-ditch sequence

Output: JSON with analysis and recommendation
```

---

#### **3.2.8 Booking Agent**

**Responsibility:** Schedule meetings, handle calendar conflicts, send confirmations

**Implementation:**
```typescript
class BookingAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private calendarService: ICalendarService,
    private routingEngine: IRoutingEngine,
    private notificationService: INotificationService
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    const lead = context.lead
    const preferredSlots = context.metadata.preferredSlots || []
    
    // 1. Determine correct calendar based on routing rules
    const assignedRep = await this.routingEngine.assign(lead)
    
    // 2. Get available slots
    const availableSlots = await this.calendarService
      .getAvailability(assignedRep, preferredSlots)
    
    // 3. If no preferred slots, LLM suggests optimal times
    if (preferredSlots.length === 0) {
      const suggestion = await this.llm.suggest({
        recipientTimezone: lead.enrichmentData.timezone,
        recipientRole: lead.enrichmentData.role,
        availableSlots: availableSlots,
        urgency: lead.urgencyScore
      })
      
      preferredSlots.push(...suggestion.recommendedSlots)
    }
    
    // 4. Book meeting
    const booking = await this.calendarService.book({
      attendees: [lead.contactInfo.email, assignedRep.email],
      slot: preferredSlots[0],
      title: context.tenantConfig.meetingTitle,
      description: this.generateDescription(lead, context)
    })
    
    // 5. Send confirmation
    await this.notificationService.send({
      to: lead.contactInfo.email,
      template: 'booking_confirmation',
      variables: { booking, assignedRep }
    })
    
    return {
      action: 'MEETING_BOOKED',
      confidence: 1.0,
      reasoning: `Meeting scheduled with ${assignedRep.name} on ${booking.startTime}`,
      metadata: { booking }
    }
  }
}
```

---

#### **3.2.9 Learning Agent**

**Responsibility:** Analyze outcomes, detect patterns, improve other agents

**Research Foundation:**
- Reinforcement learning from human feedback (RLHF)
- Meta-learning (learning to learn)
- Causal inference

**Implementation:**
```typescript
class LearningAgent implements IAgent {
  constructor(
    private llm: ILLMProvider,
    private outcomeRepository: IOutcomeRepository,
    private patternDetector: IPatternDetector,
    private modelUpdater: IModelUpdater
  ) {}
  
  async execute(context: AgentContext): Promise<AgentDecision> {
    // This agent runs periodically, not per-lead
    
    // 1. Gather recent outcomes
    const outcomes = await this.outcomeRepository
      .getRecent(context.tenantId, 30) // last 30 days
    
    // 2. LLM-based pattern detection
    const patterns = await this.llm.detectPatterns({
      outcomes: outcomes,
      dimensions: [
        'industry',
        'company_size',
        'title',
        'sequence_type',
        'tone',
        'send_time',
        'personalization_depth'
      ]
    })
    
    // 3. Causal analysis (what actually drove conversion?)
    const insights = await this.patternDetector.analyze(patterns)
    
    // 4. Generate agent improvement recommendations
    const recommendations = await this.llm.recommend({
      patterns: patterns,
      insights: insights,
      currentAgentConfigs: await this.getAgentConfigs()
    })
    
    // 5. Apply safe updates (with approval gates)
    for (const rec of recommendations) {
      if (rec.confidence > 0.8 && rec.impact === 'low_risk') {
        await this.modelUpdater.apply(rec)
      } else {
        await this.modelUpdater.flagForReview(rec)
      }
    }
    
    return {
      action: 'LEARNING_COMPLETE',
      confidence: 1.0,
      reasoning: `Detected ${patterns.length} patterns, applied ${recommendations.length} improvements`,
      metadata: { patterns, recommendations }
    }
  }
}
```

**LLM Prompt:**
```
Analyze conversion outcomes and detect patterns:

Dataset: {num_outcomes} leads from last 30 days

Breakdown:
- Converted to meeting: {converted_count} ({conversion_rate}%)
- Replied but no meeting: {replied_count}
- No response: {no_response_count}
- Unsubscribed: {unsub_count}

Segment the data by:
1. Industry vertical
2. Company size
3. Title/role
4. Sequence variant used
5. Tone (professional/casual/technical)
6. Send time (morning/afternoon/evening)

For each segment with >10 samples:
- Calculate conversion rate
- Identify significant differences vs. average
- Suggest hypothesis for why
- Recommend agent parameter adjustments

Output: JSON array of patterns with confidence scores
```

---

#### **3.2.10 Orchestrator Agent**

**Responsibility:** Coordinate all agents, manage workflow, resolve conflicts

**Research Foundation:**
- Hierarchical multi-agent systems
- Workflow orchestration patterns
- Conflict resolution strategies

**Implementation:**
```typescript
class OrchestratorAgent {
  constructor(
    private agents: Map<string, IAgent>,
    private workflowEngine: IWorkflowEngine,
    private eventBus: IEventBus,
    private conflictResolver: IConflictResolver,
    private logger: ILogger
  ) {}
  
  async orchestrate(leadId: LeadId): Promise<void> {
    const context = await this.buildContext(leadId)
    
    // Define workflow based on lead state
    const workflow = await this.workflowEngine.getWorkflow(context.leadState)
    
    for (const step of workflow.steps) {
      try {
        const agent = this.agents.get(step.agentName)
        
        // Execute agent
        const decision = await agent.execute(context)
        
        // Log for auditability
        await this.logger.logDecision(leadId, step.agentName, decision)
        
        // Check confidence threshold
        if (decision.confidence < context.tenantConfig.confidenceThreshold) {
          await this.escalateToHuman(leadId, step.agentName, decision)
          break
        }
        
        // Execute action
        await this.executeAction(decision.action, context)
        
        // Update context for next agent
        context = await this.buildContext(leadId)
        
        // Emit event
        await this.eventBus.publish({
          type: `Agent${step.agentName}Completed`,
          leadId,
          decision
        })
        
      } catch (error) {
        await this.handleAgentFailure(leadId, step.agentName, error)
        break
      }
    }
  }
  
  private async handleConflict(
    decisions: AgentDecision[]
  ): Promise<AgentDecision> {
    // When multiple agents suggest different actions
    return this.conflictResolver.resolve(decisions)
  }
}
```

---

## 4. Infrastructure Layer (Hexagonal Adapters)

### 4.1 LLM Adapter (Gemini)

```typescript
// Port (Interface)
interface ILLMProvider {
  generate(params: GenerateParams): Promise<GenerateResult>
  analyze(params: AnalyzeParams): Promise<AnalysisResult>
  reason(params: ReasonParams): Promise<ReasoningResult>
  detectPatterns(params: PatternParams): Promise<Pattern[]>
}

// Adapter (Implementation)
class GeminiLLMAdapter implements ILLMProvider {
  constructor(
    private apiKey: string,
    private model: string = 'gemini-2.0-flash-exp',
    private cache: ICache,
    private rateLimiter: IRateLimiter
  ) {}
  
  async generate(params: GenerateParams): Promise<GenerateResult> {
    // Check cache first
    const cacheKey = this.buildCacheKey(params)
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    // Rate limiting (multi-tenant aware)
    await this.rateLimiter.acquire(params.tenantId)
    
    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: this.buildPrompt(params) }]
        }],
        generationConfig: {
          temperature: params.temperature || 0.7,
          maxOutputTokens: params.maxTokens || 1024,
          topP: 0.95,
          topK: 40
        },
        safetySettings: this.getSafetySettings()
      })
    })
    
    const data = await response.json()
    const result = this.parseResponse(data)
    
    // Cache result
    await this.cache.set(cacheKey, result, params.cacheTTL || 3600)
    
    return result
  }
  
  private buildPrompt(params: GenerateParams): string {
    // Structured prompt engineering
    return `
${params.systemPrompt || 'You are an expert sales AI assistant.'}

${params.fewShotExamples?.map((ex, i) => `
Example ${i + 1}:
Input: ${JSON.stringify(ex.input)}
Output: ${JSON.stringify(ex.output)}
`).join('\n') || ''}

Task: ${params.task}

Input:
${JSON.stringify(params.input, null, 2)}

${params.constraints ? `Constraints:\n${params.constraints.map(c => `- ${c}`).join('\n')}` : ''}

Output format: ${params.outputFormat || 'JSON'}
`
  }
}
```

### 4.2 Event Bus Adapter

```typescript
// Port
interface IEventBus {
  publish(event: DomainEvent): Promise<void>
  subscribe(eventType: string, handler: EventHandler): void
}

// Adapter (RabbitMQ/Kafka)
class RabbitMQEventBus implements IEventBus {
  constructor(
    private connection: amqp.Connection,
    private exchange: string = 'ale.events'
  ) {}
  
  async publish(event: DomainEvent): Promise<void> {
    const channel = await this.connection.createChannel()
    await channel.assertExchange(this.exchange, 'topic', { durable: true })
    
    const routingKey = `${event.aggregateName}.${event.eventType}`
    
    channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(event)),
      { 
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json',
        messageId: event.id
      }
    )
  }
  
  subscribe(eventPattern: string, handler: EventHandler): void {
    // Consumer implementation
  }
}
```

### 4.3 Repository Pattern

```typescript
// Port
interface ILeadRepository {
  save(lead: Lead): Promise<void>
  findById(id: LeadId): Promise<Lead | null>
  findByEmail(email: string, tenantId: TenantId): Promise<Lead | null>
  findByState(state: LeadState, tenantId: TenantId): Promise<Lead[]>
}

// Adapter (PostgreSQL)
class PostgresLeadRepository implements ILeadRepository {
  constructor(private db: Pool) {}
  
  async save(lead: Lead): Promise<void> {
    const query = `
      INSERT INTO leads (id, tenant_id, email, data, state, score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        data = $4,
        state = $5,
        score = $6,
        updated_at = NOW()
    `
    
    await this.db.query(query, [
      lead.id,
      lead.tenantId,
      lead.contactInfo.email,
      JSON.stringify(lead.toJSON()),
      lead.state,
      lead.score.value,
      lead.createdAt
    ])
  }
  
  async findById(id: LeadId): Promise<Lead | null> {
    const result = await this.db.query(
      'SELECT data FROM leads WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) return null
    
    return Lead.fromJSON(result.rows[0].data)
  }
}
```

---

## 5. Multi-Tenancy Strategy

### 5.1 Tenant Isolation

**Database Level:**
- Row-level security (RLS) with `tenant_id` on all tables
- Separate schemas per tenant (for enterprise clients)
- Connection pooling per tenant

**Agent Level:**
- All agents receive `tenantId` in context
- Configuration loaded per tenant
- Learning models isolated per tenant (initially)

**Infrastructure:**
- Separate LLM API keys per tenant (for cost tracking)
- Rate limiting per tenant
- Event streams partitioned by tenant

### 5.2 Configuration Management

```typescript
interface TenantConfig {
  tenantId: TenantId
  
  // ICP Definition
  icp: {
    industries: string[]
    companySize: { min: number, max: number }
    titles: string[]
    technologies: string[]
  }
  
  // Scoring
  scoringCriteria: ScoringCriterion[]
  qualificationThreshold: number
  
  // Outreach
  tone: 'professional' | 'casual' | 'technical'
  maxTouches: number
  touchDelays: Duration[]
  
  // Safety
  confidenceThreshold: number
  requireApprovalFor: Action[]
  
  // Integrations
  emailProvider: EmailProviderConfig
  calendarProvider: CalendarProviderConfig
  enrichmentProviders: EnrichmentProviderConfig[]
  
  // Learning
  enableAutoLearning: boolean
  learningMode: 'conservative' | 'aggressive'
}
```

---

## 6. MVP Implementation Plan

### Phase 1: Core Foundation (Weeks 1-2)

**Goal:** Build hexagonal architecture skeleton + basic lead flow

**Deliverables:**
1. Project structure (hexagonal layers)
2. Domain models (Lead, Interaction aggregates)
3. Basic ports & interfaces
4. PostgreSQL schema
5. Event bus setup (RabbitMQ)
6. Gemini LLM adapter
7. Simple Intake Agent (form/webhook → DB)

**Tech Stack:**
- Node.js + TypeScript
- PostgreSQL (with RLS)
- RabbitMQ
- Gemini API

**Testing:**
- Unit tests for domain models
- Integration tests for repositories
- E2E test: Webhook → Lead created

---

### Phase 2: Enrichment + Scoring (Weeks 3-4)

**Goal:** Qualify leads automatically

**Deliverables:**
1. Enrichment Agent (web scraping + LLM inference)
2. Scoring Agent (multi-criteria + LLM reasoning)
3. Tenant config system
4. Admin UI for ICP definition
5. Confidence threshold enforcement

**Testing:**
- Test scoring accuracy on historical data
- Validate LLM reasoning quality
- Test enrichment from multiple sources

---

### Phase 3: Outreach Engine (Weeks 5-7)

**Goal:** Send first emails automatically

**Deliverables:**
1. Strategy Agent (sequence selection)
2. Composer Agent (email generation with LLM)
3. Timing Agent (send-time optimization)
4. Email sending infrastructure (SendGrid adapter)
5. Template library system
6. A/B testing framework

**Testing:**
- Test email generation quality (human eval)
- Spam score validation
- Deliverability tests
- A/B test framework validation

---

### Phase 4: Response Handling + Booking (Weeks 8-9)

**Goal:** Complete the loop: reply → meeting

**Deliverables:**
1. Response Agent (intent classification)
2. Booking Agent (calendar integration)
3. Routing engine (lead → sales rep assignment)
4. Email webhook handling (replies)
5. Meeting confirmation system

**Testing:**
- Intent classification accuracy
- Calendar booking reliability
- End-to-end flow test

---

### Phase 5: Learning + Orchestration (Weeks 10-11)

**Goal:** Self-improving system

**Deliverables:**
1. Learning Agent (outcome analysis)
2. Orchestrator Agent (workflow coordination)
3. Outcome tracking system
4. Agent performance dashboard
5. Manual override UI

**Testing:**
- Learning loop validation
- Pattern detection accuracy
- Orchestrator reliability

---

### Phase 6: Polish + Launch (Week 12)

**Goal:** Production-ready MVP

**Deliverables:**
1. Observability (logging, metrics, tracing)
2. Error handling & retry logic
3. Security hardening
4. API documentation
5. Onboarding flow
6. Basic analytics dashboard

---

## 7. Technology Stack

### Backend
- **Language:** TypeScript (Node.js 20+)
- **Framework:** NestJS (supports DI, hexagonal architecture)
- **Database:** PostgreSQL 15+ (with RLS)
- **Event Bus:** RabbitMQ (or Kafka for scale)
- **Cache:** Redis
- **ORM:** Prisma or TypeORM

### LLM
- **Primary:** Gemini 2.0 Flash (fast, cost-effective)
- **Fallback:** Gemini 1.5 Pro (complex reasoning)

### Infrastructure
- **Deployment:** Docker + Kubernetes
- **CI/CD:** GitHub Actions
- **Monitoring:** Grafana + Prometheus
- **Logging:** ELK Stack
- **Tracing:** OpenTelemetry

### Frontend (Admin UI)
- **Framework:** Next.js 14+
- **State:** Zustand or Jotai
- **UI:** Tailwind + shadcn/ui

---

## 8. SOLID Principles Application

### Single Responsibility Principle (SRP)
- Each agent has ONE job (scoring ≠ enrichment)
- Repositories only handle persistence
- Services handle single domain concerns

### Open/Closed Principle (OCP)
- Agents are open for extension (new agents can be added)
- Closed for modification (existing agents don't change when adding new ones)
- Strategy pattern for sequence selection

### Liskov Substitution Principle (LSP)
- All agents implement `IAgent` interface
- Any agent can be swapped without breaking orchestrator
- Mock agents for testing

### Interface Segregation Principle (ISP)
- Fine-grained interfaces (ILeadRepository, IEnrichmentProvider)
- Agents don't depend on interfaces they don't use
- Separate read/write interfaces (CQRS)

### Dependency Inversion Principle (DIP)
- High-level agents depend on abstractions (ILLMProvider)
- Low-level adapters implement those abstractions
- Dependency injection throughout

---

## 9. Inversion of Control (IoC) Container

### NestJS DI Example

```typescript
@Module({
  providers: [
    // LLM Provider
    {
      provide: 'ILLMProvider',
      useClass: GeminiLLMAdapter
    },
    
    // Repositories
    {
      provide: 'ILeadRepository',
      useClass: PostgresLeadRepository
    },
    
    // Agents
    IntakeAgent,
    EnrichmentAgent,
    ScoringAgent,
    StrategyAgent,
    ComposerAgent,
    TimingAgent,
    ResponseAgent,
    BookingAgent,
    LearningAgent,
    
    // Orchestrator
    {
      provide: OrchestratorAgent,
      useFactory: (
        intakeAgent: IntakeAgent,
        enrichmentAgent: EnrichmentAgent,
        // ... other agents
      ) => {
        const agents = new Map<string, IAgent>([
          ['intake', intakeAgent],
          ['enrichment', enrichmentAgent],
          // ...
        ])
        
        return new OrchestratorAgent(
          agents,
          workflowEngine,
          eventBus,
          conflictResolver,
          logger
        )
      },
      inject: [
        IntakeAgent,
        EnrichmentAgent,
        // ...
      ]
    }
  ]
})
export class AgentsModule {}
```

---

## 10. Key Differentiators

### vs. Traditional Lead Routing
- ❌ Traditional: Static rules, manual qualification
- ✅ ALE: Dynamic AI scoring, continuous learning

### vs. Email Automation Tools (Lemlist, Outreach)
- ❌ Traditional: Human writes sequences, static templates
- ✅ ALE: AI generates personalized content, adapts in real-time

### vs. Conversational AI (Drift, Intercom)
- ❌ Traditional: Chatbots for on-site visitors only
- ✅ ALE: Proactive outreach across all lead sources

### vs. SDR Teams
- ❌ Human SDRs: Limited capacity, inconsistent quality
- ✅ ALE: Infinite scale, consistent quality, 24/7 operation

---

## 11. Success Metrics & Monitoring

### Business Metrics (per Tenant)
- Lead → Meeting Conversion Rate (target: >15%)
- Reply Rate (target: >25%)
- Time to First Response (target: <5 min)
- Meeting Show Rate (target: >70%)
- Human Intervention Rate (target: <10%)

### Technical Metrics
- Agent Decision Latency (p95 < 2s)
- LLM API Success Rate (>99.5%)
- Event Processing Lag (p99 < 1s)
- Database Query Performance (p95 < 100ms)

### AI Quality Metrics
- Scoring Accuracy (vs. human judgment)
- Email Quality Score (spam, grammar, relevance)
- Intent Classification Accuracy
- Learning Loop Convergence Time

---

## 12. Risk Mitigation

### Technical Risks
1. **LLM API Downtime**
   - Mitigation: Fallback to Gemini Pro, queue buffering
   
2. **Hallucination in Generated Emails**
   - Mitigation: Validation layer, confidence thresholds, human review queue

3. **Data Privacy (GDPR)**
   - Mitigation: Data encryption, right-to-delete, consent management

4. **Email Deliverability**
   - Mitigation: Warm-up sequences, SPF/DKIM/DMARC, reputation monitoring

### Business Risks
1. **Over-automation Backlash**
   - Mitigation: Transparent AI disclosure, opt-out, quality control

2. **Tenant Churn (poor results)**
   - Mitigation: Success team, learning loop, SLA guarantees

---

## 13. Next Steps

1. **Review this PRD** with engineering team
2. **Set up development environment** (Docker Compose for local)
3. **Create GitHub repo** with hexagonal structure
4. **Start Phase 1** (Core Foundation)
5. **Weekly demos** to validate agent behavior
6. **Beta testing** with 3-5 pilot customers (Week 8)

---

## Appendix A: File Structure

```
ale/
├── src/
│   ├── domain/                    # Domain Layer
│   │   ├── aggregates/
│   │   │   ├── Lead.ts
│   │   │   ├── Interaction.ts
│   │   │   └── Campaign.ts
│   │   ├── value-objects/
│   │   │   ├── Score.ts
│   │   │   ├── ContactInfo.ts
│   │   │   └── AgentDecision.ts
│   │   ├── events/
│   │   │   ├── LeadCreated.ts
│   │   │   ├── LeadScored.ts
│   │   │   └── MeetingBooked.ts
│   │   └── ports/                 # Interfaces
│   │       ├── ILeadRepository.ts
│   │       ├── ILLMProvider.ts
│   │       └── IEventBus.ts
│   │
│   ├── application/               # Application Layer
│   │   ├── agents/
│   │   │   ├── IntakeAgent.ts
│   │   │   ├── EnrichmentAgent.ts
│   │   │   ├── ScoringAgent.ts
│   │   │   ├── StrategyAgent.ts
│   │   │   ├── ComposerAgent.ts
│   │   │   ├── TimingAgent.ts
│   │   │   ├── ResponseAgent.ts
│   │   │   ├── BookingAgent.ts
│   │   │   ├── LearningAgent.ts
│   │   │   └── OrchestratorAgent.ts
│   │   ├── use-cases/
│   │   │   ├── ProcessLeadCommand.ts
│   │   │   ├── HandleReplyCommand.ts
│   │   │   └── BookMeetingCommand.ts
│   │   └── services/
│   │       ├── DeduplicationService.ts
│   │       ├── PersonalizationEngine.ts
│   │       └── RoutingEngine.ts
│   │
│   ├── infrastructure/            # Infrastructure Layer
│   │   ├── adapters/
│   │   │   ├── gemini/
│   │   │   │   └── GeminiLLMAdapter.ts
│   │   │   ├── postgres/
│   │   │   │   └── PostgresLeadRepository.ts
│   │   │   ├── rabbitmq/
│   │   │   │   └── RabbitMQEventBus.ts
│   │   │   ├── sendgrid/
│   │   │   │   └── SendGridEmailAdapter.ts
│   │   │   └── calendar/
│   │   │       ├── GoogleCalendarAdapter.ts
│   │   │       └── OutlookCalendarAdapter.ts
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── prisma/
│   │   └── config/
│   │       └── dependency-injection.ts
│   │
│   └── presentation/              # Presentation Layer
│       ├── api/
│       │   ├── controllers/
│       │   │   ├── WebhookController.ts
│       │   │   ├── LeadsController.ts
│       │   │   └── SettingsController.ts
│       │   └── middleware/
│       │       ├── AuthMiddleware.ts
│       │       └── TenantMiddleware.ts
│       └── events/
│           └── EventSubscribers.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── docs/
    ├── API.md
    ├── AGENTS.md
    └── DEPLOYMENT.md
```

---

## Appendix B: Sample Prompts Library

See separate document: `PROMPTS.md`

---

## Appendix C: Database Schema

See separate document: `SCHEMA.sql`

---

**End of Technical PRD**