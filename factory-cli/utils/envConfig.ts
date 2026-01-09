import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * envConfig.ts - Centralized Environment Loading
 * 
 * Ensures all tools look at the ROOT .env file:
 * Model-Forward-Clinical-Abstraction-Platform/.env
 */

export function loadEnv() {
  // Path to the root directory from factory-cli/utils/
  const rootPath = path.resolve(__dirname, '../../.env');
  
  if (fs.existsSync(rootPath)) {
    dotenv.config({ path: rootPath });
  } else {
    // Fallback for cases where we might be running from different entry points
    const altPath = path.resolve(process.cwd(), '../.env');
    if (fs.existsSync(altPath)) {
        dotenv.config({ path: altPath });
    }
  }

  // Default REFINERY_QUIET to true to suppress JSON observation logs in terminal
  if (process.env.REFINERY_QUIET === undefined) {
    process.env.REFINERY_QUIET = 'true';
  }
}

export interface OpenAIResolvedConfig {
  apiKey?: string;
  baseURL: string;
  defaultHeaders?: Record<string, string>;
  defaultQuery?: Record<string, string>;
  isAzure: boolean;
}

export function resolveOpenAIConfig(apiKey?: string): OpenAIResolvedConfig {
  const resolvedKey = apiKey || process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const hasAzureConfig = Boolean(azureEndpoint || azureDeployment || azureApiVersion || process.env.AZURE_OPENAI_API_KEY);

  if (hasAzureConfig) {
    if (!azureEndpoint || !azureDeployment || !azureApiVersion) {
      throw new Error('Azure OpenAI requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, and AZURE_OPENAI_API_VERSION.');
    }

    const trimmedEndpoint = azureEndpoint.replace(/\/+$/, '');
    return {
      apiKey: resolvedKey,
      baseURL: `${trimmedEndpoint}/openai/deployments/${azureDeployment}`,
      defaultHeaders: resolvedKey ? { 'api-key': resolvedKey } : undefined,
      defaultQuery: { 'api-version': azureApiVersion },
      isAzure: true,
    };
  }

  return {
    apiKey: resolvedKey,
    baseURL: 'https://api.openai.com/v1',
    defaultHeaders: resolvedKey ? { Authorization: `Bearer ${resolvedKey}` } : undefined,
    isAzure: false,
  };
}

export function getOpenAIClientOptions(apiKey?: string) {
  const resolved = resolveOpenAIConfig(apiKey);

  if (resolved.isAzure) {
    return {
      apiKey: resolved.apiKey,
      baseURL: resolved.baseURL,
      defaultHeaders: resolved.defaultHeaders,
      defaultQuery: resolved.defaultQuery,
    };
  }

  return { apiKey: resolved.apiKey };
}
