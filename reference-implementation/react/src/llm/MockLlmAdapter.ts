/**
 * Mock LLM Adapter
 *
 * Provides simulated LLM responses for demo/testing without requiring
 * actual API calls to Claude or other LLM providers.
 *
 * This adapter allows the reference implementation to run completely
 * offline and demonstrate the full CA Factory workflow.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  latencyMs: number;
}

export interface LlmConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
}

/**
 * Mock LLM Adapter
 *
 * Simulates LLM behavior by generating contextually appropriate responses
 * based on the input prompt and domain context.
 */
export class MockLlmAdapter {
  private config: LlmConfig;
  private responseTemplates: Map<string, string[]>;

  constructor(config: Partial<LlmConfig> = {}) {
    this.config = {
      model: config.model || 'mock-claude-3-sonnet',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1.0,
    };

    this.responseTemplates = this.initializeTemplates();
  }

  /**
   * Initialize response templates for common question patterns
   */
  private initializeTemplates(): Map<string, string[]> {
    const templates = new Map<string, string[]>();

    // CLABSI evidence questions
    templates.set('clabsi_evidence', [
      'The CLABSI diagnosis is supported by multiple key pieces of evidence: 1) Central line present for >2 days (PICC inserted on Day 1, event on Day 5), 2) Positive blood culture for {organism} on Day {day}, 3) Clinical symptoms including fever ({temp}°C) and {symptoms} on Day {day}, and 4) No alternate infection source identified. The temporal relationship between line insertion and positive culture falls within the NHSN infection window.',
      'Based on the clinical data, the following evidence supports the CLABSI determination: The patient had a {line_type} in place for {device_days} days before developing bacteremia. Blood cultures grew {organism}, a recognized pathogen. Clinical signs of infection including {symptoms} were documented. No alternative source of bloodstream infection was identified during the infection window period.',
    ]);

    // CAUTI evidence questions
    templates.set('cauti_evidence', [
      'The CAUTI diagnosis is supported by: 1) Indwelling urinary catheter present for {device_days} days, 2) Positive urine culture with {organism} at >{cfu} CFU/mL, 3) Clinical signs including {symptoms}, and 4) No alternate source identified. This meets NHSN CAUTI criteria.',
      'Evidence supporting CAUTI includes a {catheter_type} catheter in place since {insertion_date}, urine culture positive for {organism} with colony count exceeding threshold, clinical manifestations of UTI ({symptoms}), and absence of other infection sources.',
    ]);

    // Timeline questions
    templates.set('timeline', [
      'The timeline shows: Day 1 - {device} insertion, Day {fever_day} - fever onset ({temp}°C), Day {culture_day} - positive culture for {organism}. The infection window spans Days {window_start} to {window_end}.',
      'Key timeline events: {device} placed on {insertion_date}, clinical signs emerged on {symptom_date} including {symptoms}, cultures collected on {culture_date} grew {organism}.',
    ]);

    // Treatment questions
    templates.set('treatment', [
      'Treatment initiated includes empiric antibiotics ({antibiotics}), {device} management considerations, and supportive care. Culture results will guide antibiotic adjustment.',
      'The treatment plan consists of: 1) Empiric antimicrobial therapy with {antibiotics}, 2) {device} assessment for removal/replacement, 3) Source control measures, 4) Monitoring for clinical response.',
    ]);

    // Criteria questions
    templates.set('criteria', [
      'This case meets {met_count} of {total_count} NHSN criteria: {criteria_list}. The determination is {determination} with {confidence}% confidence.',
      'NHSN criteria evaluation: {criteria_details}. Overall assessment: {determination} (confidence: {confidence}%).',
    ]);

    // Default/general questions
    templates.set('general', [
      'Based on the available clinical data, {general_response}. Additional context suggests {additional_info}.',
      'The clinical picture indicates {clinical_summary}. Key findings include {key_findings}.',
    ]);

    return templates;
  }

  /**
   * Complete a chat conversation with mock response
   */
  async complete(messages: LlmMessage[]): Promise<LlmResponse> {
    const startTime = Date.now();

    // Extract user question from messages
    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) {
      throw new Error('No user message found in conversation');
    }

    // Generate contextual response
    const content = this.generateResponse(userMessage.content, messages);

    // Simulate processing time (50-200ms)
    const latencyMs = Math.floor(Math.random() * 150) + 50;
    await new Promise(resolve => setTimeout(resolve, latencyMs));

    // Calculate mock token usage
    const tokensUsed = Math.floor(content.length / 4) +
                       Math.floor(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);

    return {
      content,
      tokensUsed,
      model: this.config.model,
      finishReason: 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Generate a contextual response based on the question
   */
  private generateResponse(question: string, context: LlmMessage[]): string {
    const lowerQuestion = question.toLowerCase();

    // Detect question type and domain
    const questionType = this.detectQuestionType(lowerQuestion);
    const domain = this.detectDomain(context);

    // Get appropriate template
    const templates = this.responseTemplates.get(questionType) ||
                     this.responseTemplates.get('general')!;

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Extract data from context
    const contextData = this.extractContextData(context, domain);

    // Fill template with context data
    return this.fillTemplate(template, contextData);
  }

  /**
   * Detect the type of question being asked
   */
  private detectQuestionType(question: string): string {
    if (question.includes('evidence') || question.includes('support')) {
      if (question.includes('clabsi')) return 'clabsi_evidence';
      if (question.includes('cauti')) return 'cauti_evidence';
      return 'clabsi_evidence'; // default
    }

    if (question.includes('timeline') || question.includes('when') || question.includes('sequence')) {
      return 'timeline';
    }

    if (question.includes('treatment') || question.includes('antibiotic') || question.includes('therapy')) {
      return 'treatment';
    }

    if (question.includes('criteria') || question.includes('nhsn') || question.includes('rule')) {
      return 'criteria';
    }

    return 'general';
  }

  /**
   * Detect domain from context
   */
  private detectDomain(context: LlmMessage[]): string {
    const allText = context.map(m => m.content).join(' ').toLowerCase();

    if (allText.includes('clabsi') || allText.includes('central line') || allText.includes('bloodstream')) {
      return 'CLABSI';
    }

    if (allText.includes('cauti') || allText.includes('catheter') || allText.includes('urinary')) {
      return 'CAUTI';
    }

    return 'CLABSI'; // default
  }

  /**
   * Extract relevant data from context messages
   */
  private extractContextData(context: LlmMessage[], domain: string): Record<string, string> {
    const allText = context.map(m => m.content).join(' ');
    const data: Record<string, string> = {};

    // Extract common data points
    const organismMatch = allText.match(/(?:organism|culture|grew)[\s:]+([A-Z][a-z]+ [a-z]+)/i);
    if (organismMatch) {
      data.organism = organismMatch[1];
    } else {
      data.organism = domain === 'CAUTI' ? 'Escherichia coli' : 'Staphylococcus aureus';
    }

    const tempMatch = allText.match(/temperature[:\s]+(\d+\.?\d*)/i);
    data.temp = tempMatch ? tempMatch[1] : '39.2';

    const deviceDaysMatch = allText.match(/(\d+)\s+days?/i);
    data.device_days = deviceDaysMatch ? deviceDaysMatch[1] : '5';

    // Domain-specific defaults
    if (domain === 'CLABSI') {
      data.device = 'PICC line';
      data.line_type = 'PICC';
      data.symptoms = 'chills';
      data.day = '5';
      data.fever_day = '4';
      data.culture_day = '5';
      data.window_start = '3';
      data.window_end = '6';
    } else if (domain === 'CAUTI') {
      data.device = 'Foley catheter';
      data.catheter_type = 'Foley';
      data.symptoms = 'fever and suprapubic tenderness';
      data.cfu = '100,000';
      data.insertion_date = 'admission day';
      data.symptom_date = 'Day 7';
      data.culture_date = 'Day 7';
    }

    data.determination = 'CONFIRMED';
    data.confidence = '92';
    data.antibiotics = 'vancomycin and cefepime';
    data.met_count = '5';
    data.total_count = '6';
    data.criteria_list = 'device presence >2 days, positive culture, clinical signs, no alternate source';
    data.general_response = 'the patient meets criteria for healthcare-associated infection';
    data.additional_info = 'temporal relationships and clinical findings are consistent with the diagnosis';
    data.clinical_summary = 'a healthcare-associated infection related to device use';
    data.key_findings = 'positive culture, clinical symptoms, and device presence';

    return data;
  }

  /**
   * Fill template with context data
   */
  private fillTemplate(template: string, data: Record<string, string>): string {
    let result = template;

    // Replace all placeholders
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, value);
    }

    // Remove any unreplaced placeholders
    result = result.replace(/\{[^}]+\}/g, '[data not available]');

    return result;
  }

  /**
   * Stream completion (mock implementation)
   * In mock mode, this just returns chunks of the complete response
   */
  async *streamComplete(messages: LlmMessage[]): AsyncGenerator<string, void, unknown> {
    const response = await this.complete(messages);
    const words = response.content.split(' ');

    // Yield chunks of 3-5 words at a time
    for (let i = 0; i < words.length; i += Math.floor(Math.random() * 3) + 3) {
      const chunk = words.slice(i, i + 5).join(' ') + ' ';
      yield chunk;

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  /**
   * Check if this is a mock adapter
   */
  isMock(): boolean {
    return true;
  }

  /**
   * Get current configuration
   */
  getConfig(): LlmConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LlmConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}

/**
 * Factory function to create appropriate LLM adapter
 */
export function createLlmAdapter(mockMode: boolean = true, config?: Partial<LlmConfig>) {
  if (mockMode) {
    return new MockLlmAdapter(config);
  }

  // In production, this would return a real LLM adapter (e.g., ClaudeAdapter)
  throw new Error('Production LLM adapter not yet implemented. Use mock mode.');
}

export default MockLlmAdapter;
