/**
 * API Client for CLABSI Abstraction Application
 */

import axios from 'axios';
import { CaseInfo, CaseView, FeedbackSubmission, Evidence } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Get list of all available cases
   */
  async getCases(): Promise<{ cases: CaseInfo[]; total: number }> {
    const response = await apiClient.get('/cases');
    return response.data;
  },

  /**
   * Get detailed case view for a specific patient
   */
  async getCase(patientId: string): Promise<CaseView> {
    const response = await apiClient.get(`/cases/${patientId}`);
    return response.data;
  },

  /**
   * Submit clinician feedback on a case
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/feedback', feedback);
    return response.data;
  },

  /**
   * Get current execution mode
   */
  async getMode(): Promise<{ mode: 'TEST' | 'PROD' }> {
    const response = await apiClient.get('/mode');
    return response.data;
  },

  /**
   * Set execution mode
   */
  async setMode(mode: 'TEST' | 'PROD'): Promise<{ success: boolean; mode: string }> {
    const response = await apiClient.post('/mode', { mode });
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  /**
   * Get evidence for a specific signal
   */
  async getEvidence(signalId: string): Promise<{ evidence: Evidence[]; signal_id: string }> {
    const response = await apiClient.get(`/evidence/${signalId}`);
    return response.data;
  },
};

export default api;
