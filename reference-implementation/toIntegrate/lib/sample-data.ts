import { QuestionResponse, SuggestedQuestion } from '@/types/ask-case';

export const sampleSuggestedQuestions: string[] = [
  'Why is the risk level classified as HIGH?',
  'Show me the blood culture timeline',
  'What evidence supports S. aureus as the pathogen?',
  'Are there any missing data points for this determination?',
  'What labs were drawn on the infection window date?',
  'Summarize the clinical timeline in chronological order',
];

export const sampleResponse: QuestionResponse = {
  question: 'Why is the risk level classified as HIGH?',
  answer: `The risk level is HIGH based on the following factors:

• Positive Blood Culture: Patient has a documented positive blood culture with Staphylococcus aureus, a recognized pathogen
• Central Line Present: Central line was in place for 3 days at the time of culture collection (>2 day requirement met)
• No Alternative Source: Chart review reveals no alternative infection source (UTI, pneumonia, or surgical site infection)
• Clinical Indicators: Patient exhibited fever (38.5°C) and elevated WBC (14,500) within the infection window

These findings align with 4 out of 4 primary NHSN CLABSI criteria.`,
  evidence_citations: [
    {
      citation_id: 'CIT001',
      source_type: 'LAB',
      source_id: 'LAB_BC_20250115',
      excerpt:
        'Blood Culture: Staphylococcus aureus detected. Collection date: 2025-01-15 08:00. Result: POSITIVE.',
      relevance_score: 0.95,
      timestamp: '2025-01-15T08:00:00Z',
    },
    {
      citation_id: 'CIT002',
      source_type: 'EVENT',
      source_id: 'EVT_LINE_INSERT',
      excerpt:
        'Central venous catheter inserted: Subclavian, triple lumen. Inserted: 2025-01-12 14:30.',
      relevance_score: 0.88,
      timestamp: '2025-01-12T14:30:00Z',
    },
    {
      citation_id: 'CIT003',
      source_type: 'SIGNAL',
      source_id: 'SIG_FEVER',
      excerpt:
        'Temperature spike detected: 38.5°C (101.3°F) on 2025-01-15 06:00.',
      relevance_score: 0.82,
      timestamp: '2025-01-15T06:00:00Z',
    },
  ],
  confidence: 0.92,
  follow_up_suggestions: [
    'What organism was detected in the blood culture?',
    'When was the central line inserted?',
    'Were there any other clinical signs of infection?',
    'Has the line been removed since the positive culture?',
  ],
  timestamp: '2025-01-15T10:30:00Z',
};

// Mock API function to simulate backend response
export async function mockAskQuestion(
  question: string
): Promise<QuestionResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return different responses based on question
  if (question.toLowerCase().includes('organism')) {
    return {
      question,
      answer:
        'The organism detected in the blood culture is Staphylococcus aureus (S. aureus), a Gram-positive bacteria and a recognized pathogen under NHSN criteria. This organism is commonly associated with central line infections.',
      evidence_citations: [
        {
          citation_id: 'CIT004',
          source_type: 'LAB',
          source_id: 'LAB_BC_20250115',
          excerpt:
            'Microbiology Report: Staphylococcus aureus identified. Gram stain: Gram-positive cocci in clusters. Sensitivity testing pending.',
          relevance_score: 0.97,
          timestamp: '2025-01-15T08:00:00Z',
        },
      ],
      confidence: 0.98,
      follow_up_suggestions: [
        'What are the antibiotic sensitivities?',
        'Is this MRSA or MSSA?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  if (question.toLowerCase().includes('timeline')) {
    return {
      question,
      answer: `Blood Culture Timeline:

• 2025-01-12 14:30: Central line inserted (subclavian, triple lumen)
• 2025-01-15 06:00: Fever spike detected (38.5°C)
• 2025-01-15 08:00: Blood culture collected
• 2025-01-16 10:00: Preliminary positive result
• 2025-01-17 09:00: Final identification: S. aureus

The infection window date is 2025-01-15, with the central line present for 3 days prior to culture collection.`,
      evidence_citations: [
        {
          citation_id: 'CIT005',
          source_type: 'EVENT',
          source_id: 'EVT_TIMELINE',
          excerpt: 'Timeline reconstruction from EHR events and lab results.',
          relevance_score: 0.91,
        },
      ],
      confidence: 0.89,
      follow_up_suggestions: [
        'Were any antibiotics given before culture collection?',
        'What was the line site condition?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Default response
  return {
    ...sampleResponse,
    question,
    timestamp: new Date().toISOString(),
  };
}
