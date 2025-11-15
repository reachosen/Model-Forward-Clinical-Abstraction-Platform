# Ask the Case Panel Component Specification

## Component Purpose
An interactive Q&A panel that allows clinicians to interrogate the AI's reasoning using natural language questions. The panel provides suggested questions, maintains conversation history, displays AI-powered responses with evidence citations, and suggests relevant follow-up questions.

## Component Name
`AskTheCasePanel`

## TypeScript Interfaces

```typescript
interface AskTheCasePanelProps {
  patientId: string;
  encounterId: string;
  suggestedQuestions: string[];
  onAskQuestion: (question: string) => Promise<QuestionResponse>;
}

interface QuestionResponse {
  question: string;
  answer: string;
  evidence_citations: EvidenceCitation[];
  confidence: number; // 0-1
  follow_up_suggestions: string[];
  timestamp: string; // ISO format
}

interface EvidenceCitation {
  citation_id: string;
  source_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'RULE';
  source_id: string;
  excerpt: string;
  relevance_score: number; // 0-1
  timestamp?: string;
}

interface ConversationEntry {
  id: string;
  question: string;
  response: QuestionResponse;
  timestamp: string;
}

interface SuggestedQuestion {
  text: string;
  category: 'RISK' | 'TIMELINE' | 'EVIDENCE' | 'DATA' | 'GENERAL';
  icon: string;
}
```

## Visual Layout

```
┌────────────────────────────────────────────────────────────┐
│ Ask the Case                                    [Clear All]│ ← Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 💬 What would you like to know?                        ││ ← Input Area
│ │ ┌────────────────────────────────────────────────────┐ ││
│ │ │ Type your question here...              [Send →]   │ ││
│ │ └────────────────────────────────────────────────────┘ ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 📌 Suggested Questions                                 ││ ← Suggestions
│ │ ┌──────────────────────────────────────────────────┐  ││
│ │ │ 🎯 Why is the risk level classified as HIGH?     │  ││
│ │ └──────────────────────────────────────────────────┘  ││
│ │ ┌──────────────────────────────────────────────────┐  ││
│ │ │ 📊 Show me the blood culture timeline            │  ││
│ │ └──────────────────────────────────────────────────┘  ││
│ │ ┌──────────────────────────────────────────────────┐  ││
│ │ │ 🔬 What evidence supports S. aureus diagnosis?   │  ││
│ │ └──────────────────────────────────────────────────┘  ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 💬 Conversation History                                ││ ← History
│ │                                                        ││
│ │ ┌────────────────────────────────────────────────────┐││
│ │ │ Q: Why is the risk level classified as HIGH?       │││
│ │ │ 10:30 AM                                           │││
│ │ └────────────────────────────────────────────────────┘││
│ │ ┌────────────────────────────────────────────────────┐││
│ │ │ A: The risk level is HIGH due to:                 │││
│ │ │    • Positive blood culture with recognized...    │││
│ │ │    • Central line present >2 days (3 days)        │││
│ │ │    • No alternative infection source identified   │││
│ │ │                                                    │││
│ │ │ 📎 Evidence (3)  [View Details]                   │││
│ │ │ Confidence: 92%                                    │││
│ │ │                                                    │││
│ │ │ 🔍 Follow-up:                                      │││
│ │ │ • What organism was detected?                     │││
│ │ │ • When was the line inserted?                     │││
│ │ └────────────────────────────────────────────────────┘││
│ └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Natural Language Input
- **Text input field** with placeholder: "Type your question here..."
- **Send button** or Enter key to submit
- **Character limit**: 500 characters
- **Loading indicator** while processing question
- **Error handling** for failed requests

### 2. Suggested Questions
- **Category-based grouping** (Risk, Timeline, Evidence, Data, General)
- **Icon indicators** for each category:
  - 🎯 Risk questions
  - 📊 Timeline questions
  - 🔬 Evidence questions
  - 📋 Data questions
  - 💡 General questions
- **Click to populate** input field
- **Dynamic suggestions** based on case context

### 3. Conversation History
- **Chronological display** (newest first or oldest first toggle)
- **Question-Answer pairs** clearly distinguished
- **Timestamp** for each entry
- **Expandable/collapsible** entries
- **Persistent across session** (localStorage)

### 4. Evidence Citations
- **Citation count badge** (e.g., "📎 Evidence (3)")
- **Expandable citations panel** showing:
  - Source type icon
  - Excerpt/summary
  - Relevance score
  - Link to source (e.g., click to jump to signal or timeline event)
- **Highlight effect** when citation is clicked

### 5. Confidence Indicator
- **Percentage display** (e.g., "92%")
- **Visual bar** with color coding:
  - High (>80%): Green
  - Medium (50-80%): Yellow
  - Low (<50%): Orange with warning icon

### 6. Follow-up Suggestions
- **Contextual suggestions** based on previous answer
- **One-click ask** for follow-up questions
- **Maximum 3-5 suggestions** to avoid overwhelming

### 7. Conversation Management
- **Clear All button** to reset conversation
- **Export conversation** (optional) to text/PDF
- **Copy answer** button for individual responses

## Detailed Specifications

### Question Categories & Icons
```typescript
const questionCategories = {
  RISK: {
    label: 'Risk Assessment',
    icon: '🎯',
    color: '#ef4444',
    examples: [
      'Why is the risk level classified as HIGH?',
      'What are the key risk factors?',
      'How confident is this risk assessment?'
    ]
  },
  TIMELINE: {
    label: 'Timeline',
    icon: '📊',
    color: '#3b82f6',
    examples: [
      'Show me the blood culture timeline',
      'When was the central line inserted?',
      'What happened on the infection window date?'
    ]
  },
  EVIDENCE: {
    label: 'Evidence',
    icon: '🔬',
    color: '#8b5cf6',
    examples: [
      'What evidence supports S. aureus as the pathogen?',
      'Show me the lab results that indicate infection',
      'What clinical signs suggest CLABSI?'
    ]
  },
  DATA: {
    label: 'Missing Data',
    icon: '📋',
    color: '#f59e0b',
    examples: [
      'Are there any missing data points?',
      'What information would strengthen this determination?',
      'What data gaps exist?'
    ]
  },
  GENERAL: {
    label: 'General',
    icon: '💡',
    color: '#6b7280',
    examples: [
      'Summarize this case in chronological order',
      'What NHSN criteria are met?',
      'Is this a reportable CLABSI event?'
    ]
  }
};
```

### Evidence Citation Display
```typescript
interface CitationCardProps {
  citation: EvidenceCitation;
  onViewSource: (citationId: string) => void;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation, onViewSource }) => {
  const getSourceIcon = (type: string) => {
    const icons = {
      SIGNAL: '📡',
      EVENT: '📅',
      LAB: '🧪',
      NOTE: '📝',
      RULE: '📋'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="citation-card">
      <div className="citation-header">
        <span className="source-icon">{getSourceIcon(citation.source_type)}</span>
        <span className="source-type">{citation.source_type}</span>
        <span className="relevance">{(citation.relevance_score * 100).toFixed(0)}% relevant</span>
      </div>
      <div className="citation-excerpt">{citation.excerpt}</div>
      {citation.timestamp && (
        <div className="citation-timestamp">
          {new Date(citation.timestamp).toLocaleString()}
        </div>
      )}
      <button onClick={() => onViewSource(citation.citation_id)}>
        View Source →
      </button>
    </div>
  );
};
```

### Confidence Display
```typescript
interface ConfidenceIndicatorProps {
  confidence: number; // 0-1
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ confidence }) => {
  const percentage = (confidence * 100).toFixed(0);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return { color: '#059669', label: 'High' };
    if (conf >= 0.5) return { color: '#d97706', label: 'Medium' };
    return { color: '#dc2626', label: 'Low' };
  };

  const { color, label } = getConfidenceColor(confidence);

  return (
    <div className="confidence-indicator">
      <span className="confidence-label">Confidence:</span>
      <div className="confidence-bar-container">
        <div
          className="confidence-bar"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="confidence-value" style={{ color }}>
        {percentage}% ({label})
      </span>
    </div>
  );
};
```

## Sample Data

```typescript
const sampleSuggestedQuestions: SuggestedQuestion[] = [
  {
    text: 'Why is the risk level classified as HIGH?',
    category: 'RISK',
    icon: '🎯'
  },
  {
    text: 'Show me the blood culture timeline',
    category: 'TIMELINE',
    icon: '📊'
  },
  {
    text: 'What evidence supports S. aureus as the pathogen?',
    category: 'EVIDENCE',
    icon: '🔬'
  },
  {
    text: 'Are there any missing data points for this determination?',
    category: 'DATA',
    icon: '📋'
  },
  {
    text: 'What labs were drawn on the infection window date?',
    category: 'TIMELINE',
    icon: '📊'
  },
  {
    text: 'Summarize the clinical timeline in chronological order',
    category: 'GENERAL',
    icon: '💡'
  }
];

const sampleResponse: QuestionResponse = {
  question: 'Why is the risk level classified as HIGH?',
  answer: `The risk level is HIGH based on the following factors:

• **Positive Blood Culture**: Patient has a documented positive blood culture with Staphylococcus aureus, a recognized pathogen
• **Central Line Present**: Central line was in place for 3 days at the time of culture collection (>2 day requirement met)
• **No Alternative Source**: Chart review reveals no alternative infection source (UTI, pneumonia, or surgical site infection)
• **Clinical Indicators**: Patient exhibited fever (38.5°C) and elevated WBC (14,500) within the infection window

These findings align with 4 out of 4 primary NHSN CLABSI criteria.`,
  evidence_citations: [
    {
      citation_id: 'CIT001',
      source_type: 'LAB',
      source_id: 'LAB_BC_20250115',
      excerpt: 'Blood Culture: Staphylococcus aureus detected. Collection date: 2025-01-15 08:00. Result: POSITIVE.',
      relevance_score: 0.95,
      timestamp: '2025-01-15T08:00:00Z'
    },
    {
      citation_id: 'CIT002',
      source_type: 'EVENT',
      source_id: 'EVT_LINE_INSERT',
      excerpt: 'Central venous catheter inserted: Subclavian, triple lumen. Inserted: 2025-01-12 14:30.',
      relevance_score: 0.88,
      timestamp: '2025-01-12T14:30:00Z'
    },
    {
      citation_id: 'CIT003',
      source_type: 'SIGNAL',
      source_id: 'SIG_FEVER',
      excerpt: 'Temperature spike detected: 38.5°C (101.3°F) on 2025-01-15 06:00.',
      relevance_score: 0.82,
      timestamp: '2025-01-15T06:00:00Z'
    }
  ],
  confidence: 0.92,
  follow_up_suggestions: [
    'What organism was detected in the blood culture?',
    'When was the central line inserted?',
    'Were there any other clinical signs of infection?',
    'Has the line been removed since the positive culture?'
  ],
  timestamp: '2025-01-15T10:30:00Z'
};

const sampleConversation: ConversationEntry[] = [
  {
    id: 'CONV001',
    question: 'Why is the risk level classified as HIGH?',
    response: sampleResponse,
    timestamp: '2025-01-15T10:30:00Z'
  }
];
```

## Styling Guidelines

### Panel Container
- **Background**: White (#ffffff)
- **Border**: 1px solid #e5e7eb
- **Border radius**: 8px
- **Padding**: 1.5rem
- **Max height**: calc(100vh - 200px)
- **Overflow-y**: auto

### Input Area
- **Border**: 2px solid #d1d5db
- **Border radius**: 8px
- **Padding**: 0.75rem
- **Focus state**: Border color #3b82f6, shadow
- **Send button**: Blue (#3b82f6), hover darker

### Suggested Question Pills
- **Display**: inline-flex
- **Background**: #f3f4f6
- **Border**: 1px solid #d1d5db
- **Border radius**: 20px
- **Padding**: 0.5rem 1rem
- **Hover**: Background #e5e7eb, cursor pointer
- **Icon + text** layout

### Question Display (in history)
- **Background**: #f0f9ff (light blue)
- **Border-left**: 3px solid #3b82f6
- **Padding**: 1rem
- **Font weight**: 500
- **Margin-bottom**: 0.5rem

### Answer Display (in history)
- **Background**: #ffffff
- **Border**: 1px solid #e5e7eb
- **Border-radius**: 8px
- **Padding**: 1rem
- **Markdown rendering**: Support bold, bullets, code blocks
- **Margin-bottom**: 1.5rem

### Citation Cards
- **Background**: #fafafa
- **Border**: 1px solid #e5e7eb
- **Border-radius**: 6px
- **Padding**: 0.75rem
- **Margin**: 0.5rem 0
- **Hover**: Border color #3b82f6

### Confidence Bar
- **Container**: Height 6px, background #f3f4f6, border-radius 3px
- **Bar**: Height 100%, dynamic color, transition 0.3s
- **Text**: Font size 0.875rem, font weight 600

## Responsive Behavior

### Desktop (>1024px)
- **Full panel** with all features visible
- **Side-by-side** input and suggestions
- **Scrollable conversation** history

### Tablet (768px - 1024px)
- **Stacked layout** for input and suggestions
- **Reduced padding** to 1rem
- **Smaller font sizes**

### Mobile (<768px)
- **Full-width layout**
- **Collapsible suggestions** section
- **Compact citation display**
- **Stack elements vertically**

## Interaction Patterns

### Asking a Question
1. User types question or clicks suggested question
2. Input field populates with question text
3. User clicks Send or presses Enter
4. Loading indicator appears
5. Question added to conversation history
6. API call to backend (onAskQuestion)
7. Response renders with answer, citations, confidence, follow-ups
8. Scroll to new answer
9. Update suggested questions based on context

### Viewing Evidence
1. User clicks "📎 Evidence (3)" badge
2. Citations panel expands
3. Each citation shows excerpt and relevance
4. User clicks "View Source →"
5. Application navigates/scrolls to source (signal, event, etc.)
6. Source is highlighted

### Follow-up Questions
1. User clicks follow-up suggestion
2. Input field populates with question
3. Same flow as "Asking a Question"

### Clear Conversation
1. User clicks "Clear All"
2. Confirmation dialog: "Are you sure? This will clear all Q&A history."
3. If confirmed, clear conversation state
4. Reset to initial suggested questions

## API Integration

```typescript
// Backend endpoint
POST /api/cases/{patient_id}/ask
Request:
{
  "question": "Why is the risk level classified as HIGH?",
  "encounter_id": "ENC001",
  "conversation_history": [...]  // Optional for context
}

Response:
{
  "question": "...",
  "answer": "...",
  "evidence_citations": [...],
  "confidence": 0.92,
  "follow_up_suggestions": [...],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Accessibility

- **ARIA labels**: "Ask a question input field", "Send question button"
- **Keyboard navigation**: Tab through suggestions, Enter to select
- **Screen reader**: Announce new answers as they arrive
- **Focus management**: Focus input after answer loads
- **High contrast**: Ensure all text meets WCAG AA standards

## Component Usage Example

```tsx
import AskTheCasePanel from './components/AskTheCasePanel';

function CaseViewPage() {
  const handleAskQuestion = async (question: string): Promise<QuestionResponse> => {
    const response = await api.askCase(patientId, encounterId, question);
    return response;
  };

  return (
    <div className="case-view-layout">
      {/* Other components */}
      <AskTheCasePanel
        patientId={patientId}
        encounterId={encounterId}
        suggestedQuestions={config.ask_examples}
        onAskQuestion={handleAskQuestion}
      />
    </div>
  );
}
```

## Implementation Priority
**HIGH** - This is a unique AI-powered feature that differentiates the platform and provides significant clinical value by making AI reasoning transparent and interrogable.
