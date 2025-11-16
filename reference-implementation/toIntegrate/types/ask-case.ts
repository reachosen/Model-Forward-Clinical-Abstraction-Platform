export interface AskTheCasePanelProps {
  patientId: string;
  encounterId: string;
  suggestedQuestions: string[];
  onAskQuestion: (question: string) => Promise<QuestionResponse>;
}

export interface QuestionResponse {
  question: string;
  answer: string;
  evidence_citations: EvidenceCitation[];
  confidence: number; // 0-1
  follow_up_suggestions: string[];
  timestamp: string; // ISO format
}

export interface EvidenceCitation {
  citation_id: string;
  source_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'RULE';
  source_id: string;
  excerpt: string;
  relevance_score: number; // 0-1
  timestamp?: string;
}

export interface ConversationEntry {
  id: string;
  question: string;
  response: QuestionResponse;
  timestamp: string;
}

export interface SuggestedQuestion {
  text: string;
  category: 'RISK' | 'TIMELINE' | 'EVIDENCE' | 'DATA' | 'GENERAL';
  icon: string;
}

export const questionCategories = {
  RISK: {
    label: 'Risk Assessment',
    icon: '🎯',
    color: '#ef4444',
  },
  TIMELINE: {
    label: 'Timeline',
    icon: '📊',
    color: '#3b82f6',
  },
  EVIDENCE: {
    label: 'Evidence',
    icon: '🔬',
    color: '#8b5cf6',
  },
  DATA: {
    label: 'Missing Data',
    icon: '📋',
    color: '#f59e0b',
  },
  GENERAL: {
    label: 'General',
    icon: '💡',
    color: '#6b7280',
  },
} as const;
