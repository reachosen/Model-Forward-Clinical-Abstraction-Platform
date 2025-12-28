/**
 * LLM Client for Planner
 *
 * Provides unified interface for calling OpenAI (or other LLM providers).
 * Used by planning agents for intent inference, plan generation, and learning.
 */

interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number; // Timeout in milliseconds (default: 60000)
  jsonSchema?: {
    name: string;
    schema: any;
    strict?: boolean;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI Chat Completions API
 */
export async function callLLM(
  messages: ChatMessage[],
  config: LLMConfig = {}
): Promise<LLMResponse> {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env');
  }

  const model = config.model || 'gpt-4o-mini';
  const temperature = config.temperature ?? 0.7;
  const maxTokens = config.maxTokens || 4000;
  const topP = config.topP;

  try {
    // Use structured outputs if schema provided, otherwise use json_object mode
    const responseFormat = config.jsonSchema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: config.jsonSchema.name,
            strict: config.jsonSchema.strict ?? true,
            schema: config.jsonSchema.schema,
          },
        }
      : { type: 'json_object' as const };

    const requestBody = {
      model,
      messages,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      response_format: responseFormat,
    };

    const bodyString = JSON.stringify(requestBody);
    const bodySizeKB = Buffer.byteLength(bodyString, 'utf8') / 1024;

    console.log(`   → Request size: ${bodySizeKB.toFixed(1)} KB`);

    if (bodySizeKB > 100) {
      console.warn(`   ⚠️  Large request (${bodySizeKB.toFixed(1)} KB) - this may take longer...`);
    }

    // Add timeout controller (default 60 seconds, configurable)
    const timeoutMs = config.timeout || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;

    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const timeoutSec = Math.round((config.timeout || 60000) / 1000);
      console.error(`LLM call failed: Request timed out after ${timeoutSec} seconds`);
      throw new Error(`OpenAI API request timed out after ${timeoutSec}s. The request may be too large or the network is slow.`);
    }

    console.error('LLM call failed:', error);

    // Provide helpful error message
    if (error.cause?.code === 'UND_ERR_SOCKET') {
      throw new Error('Network connection to OpenAI API failed. This may be due to:\n' +
        '  1. Request too large (try with less research data)\n' +
        '  2. Firewall/proxy blocking the connection\n' +
        '  3. Network connectivity issues\n' +
        '  Original error: ' + error.message);
    }

    throw error;
  }
}

/**
 * Call LLM with structured JSON output
 * Automatically parses the response as JSON
 */
export async function callLLMForJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig = {}
): Promise<T> {
  // OpenAI requires the word "JSON" in messages when using json_object response format
  const jsonInstruction = '\n\nIMPORTANT: Respond with valid JSON only.';

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt + jsonInstruction },
  ];

  const response = await callLLM(messages, config);

  try {
    return JSON.parse(response.content) as T;
  } catch (error) {
    console.error('Failed to parse LLM response as JSON:', response.content);
    throw new Error(`LLM returned invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
