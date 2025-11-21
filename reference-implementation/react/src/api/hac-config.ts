/**
 * API Client for HAC Configuration Studio
 * Adapted from toIntegrate/hac-configuration-studio for CRA
 */

import axios from 'axios';
import type {
  HACDefinition,
  HACConfig,
  PreviewResponse,
  PublishRequest,
} from '../types/hac-config';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const hacClient = axios.create({
  baseURL: `${API_BASE_URL}/api/hac`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * List all HAC definitions
 */
export async function listHACs(): Promise<HACDefinition[]> {
  const response = await hacClient.get('');
  return response.data;
}

/**
 * Create a new HAC configuration
 */
export async function createHAC(
  displayName: string,
  description?: string
): Promise<HACConfig> {
  const response = await hacClient.post('', {
    display_name: displayName,
    description,
  });
  return response.data;
}

/**
 * Get full configuration for a specific HAC
 */
export async function getHACConfig(concernId: string): Promise<HACConfig> {
  const response = await hacClient.get(`/${concernId}/config`);
  return response.data;
}

/**
 * Save/update HAC configuration
 */
export async function saveHACConfig(
  concernId: string,
  config: HACConfig
): Promise<HACConfig> {
  const response = await hacClient.put(`/${concernId}/config`, config);
  return response.data;
}

/**
 * Preview HAC with a sample case
 */
export async function previewHAC(
  concernId: string,
  sampleCaseId: string
): Promise<PreviewResponse> {
  const response = await hacClient.post(`/${concernId}/preview`, {
    sampleCaseId,
  });
  return response.data;
}

/**
 * Publish/archive HAC configuration
 */
export async function publishHAC(
  concernId: string,
  targetStatus: PublishRequest['targetStatus']
): Promise<HACConfig> {
  const response = await hacClient.post(`/${concernId}/publish`, {
    targetStatus,
  });
  return response.data;
}

export default {
  listHACs,
  createHAC,
  getHACConfig,
  saveHACConfig,
  previewHAC,
  publishHAC,
};
