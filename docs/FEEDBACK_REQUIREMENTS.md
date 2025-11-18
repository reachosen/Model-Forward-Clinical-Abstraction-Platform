# Feedback Panel Requirements

## Overview
The Feedback Panel should be integrated into the **Clinical Review tab** of the Case Workbench, allowing clinicians to provide structured feedback on abstraction results.

---

## Location
- **Page**: Case Workbench (`/case/:caseId`)
- **Tab**: Clinical Review (abstraction tab)
- **Position**: After the Q&A/Interrogation Panel, before the "Action Buttons" section

---

## UI Layout

### Component Structure
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 Clinician Feedback                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Overall Rating:                                             │
│ ☆ ☆ ☆ ☆ ☆  (5-star rating, interactive)                    │
│                                                              │
│ Final Decision:                                             │
│ [Dropdown: Select decision...]                              │
│   Options:                                                   │
│   - Confirmed CLABSI                                        │
│   - Ruled Out                                               │
│   - Needs More Information                                  │
│   - Indeterminate                                           │
│                                                              │
│ Comments / Corrections:                                     │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [Multiline textarea]                                  │  │
│ │                                                        │  │
│ │                                                        │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                              │
│ [👍 Approve] [✏️ Submit Correction] [❓ Ask Question]       │
│ [💬 Add Comment]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Field Specifications

### 1. **Overall Rating** (Optional)
- **Type**: Star rating (1-5 stars)
- **Behavior**: Click to set rating, click again to clear
- **Visual States**:
  - Unfilled: Gray outline stars
  - Filled: Yellow/gold filled stars
  - Hover: Preview fill on hover
- **Default**: No rating selected

### 2. **Final Decision** (Required for Approve/Submit Correction)
- **Type**: Dropdown select
- **Options** (concern-specific):
  - **CLABSI**:
    - "Confirmed CLABSI"
    - "Ruled Out"
    - "Needs More Information"
    - "Indeterminate"
  - **CAUTI**:
    - "Confirmed CAUTI"
    - "Ruled Out"
    - "Needs More Information"
    - "Indeterminate"
  - **SSI**:
    - "Confirmed SSI"
    - "Ruled Out"
    - "Needs More Information"
    - "Indeterminate"
- **Default**: Empty/placeholder "-- Select --"
- **Validation**: Required when submitting Approve or Correction

### 3. **Comments / Corrections** (Optional)
- **Type**: Multiline textarea
- **Rows**: 4-5 lines visible
- **Placeholder**: "Enter any comments, corrections, or questions..."
- **Max Length**: 2000 characters
- **Behavior**: Auto-resize or scrollable

### 4. **Action Buttons**
Four distinct action buttons with different feedback types:

#### a) **👍 Approve**
- **Feedback Type**: `APPROVAL`
- **Color**: Green/success variant
- **Validation**: Requires Final Decision selected
- **Behavior**: Submits feedback indicating clinician agrees with abstraction
- **Success**: Show success toast and clear form

#### b) **✏️ Submit Correction**
- **Feedback Type**: `CORRECTION`
- **Color**: Orange/warning variant
- **Validation**: Requires Final Decision and Comments
- **Behavior**: Submits feedback with clinician's corrections
- **Success**: Show success toast and clear form

#### c) **❓ Ask Question**
- **Feedback Type**: `QUESTION`
- **Color**: Blue/info variant
- **Validation**: Requires Comments
- **Behavior**: Submits feedback as question needing clarification
- **Success**: Show success toast and clear form

#### d) **💬 Add Comment**
- **Feedback Type**: `COMMENT`
- **Color**: Gray/secondary variant
- **Validation**: Requires Comments
- **Behavior**: Submits general comment/note
- **Success**: Show success toast and clear form

---

## Data Model

### FeedbackSubmission Type
```typescript
interface FeedbackSubmission {
  patient_id: string;          // From case metadata
  encounter_id: string;         // From case metadata
  case_id: string;              // Current case ID
  concern_id: string;           // CLABSI, CAUTI, SSI

  feedback_type: 'APPROVAL' | 'CORRECTION' | 'QUESTION' | 'COMMENT';

  rating?: number;              // 1-5, optional
  final_decision?: string;      // Required for APPROVAL/CORRECTION
  comments?: string;            // Required for CORRECTION/QUESTION/COMMENT

  clinician_id: string;         // Current user ID (or "DEMO_USER" in demo mode)
  submitted_at: string;         // ISO timestamp

  // Context for feedback
  abstraction_task_id?: string; // From abstraction.task_metadata.task_id
  prompt_version?: string;      // From abstraction.task_metadata.prompt_version
}
```

---

## API Integration

### Endpoint
```
POST /api/feedback
```

### Request Body
```json
{
  "patient_id": "clabsi_demo_001",
  "encounter_id": "enc_demo_001",
  "case_id": "clabsi_demo_001",
  "concern_id": "clabsi",
  "feedback_type": "APPROVAL",
  "rating": 5,
  "final_decision": "Confirmed CLABSI",
  "comments": "Abstraction is accurate, all criteria properly evaluated.",
  "clinician_id": "nurse.jane",
  "submitted_at": "2025-01-18T15:30:00Z",
  "abstraction_task_id": "clabsi.abstraction",
  "prompt_version": "v1.0"
}
```

### Response
```json
{
  "success": true,
  "feedback_id": "fb_12345",
  "message": "Feedback submitted successfully"
}
```

### Error Handling
- **Network Error**: Show error toast, keep form data
- **Validation Error**: Show field-specific error messages
- **Server Error**: Show error toast with retry option

---

## Validation Rules

### By Feedback Type:

1. **APPROVAL**:
   - ✅ Must have: Final Decision
   - ✅ Optional: Rating, Comments

2. **CORRECTION**:
   - ✅ Must have: Final Decision, Comments
   - ✅ Optional: Rating

3. **QUESTION**:
   - ✅ Must have: Comments
   - ✅ Optional: Rating, Final Decision

4. **COMMENT**:
   - ✅ Must have: Comments
   - ✅ Optional: Rating, Final Decision

### Error Messages:
- "Please select a final decision to approve this abstraction"
- "Please provide comments for your correction"
- "Please enter your question in the comments field"
- "Please provide a comment"

---

## Behavior & UX

### Form State
- **Initial**: All fields empty/unselected
- **After Submission**: Clear form, show success message
- **During Submission**: Disable buttons, show loading spinner
- **On Error**: Keep form data, show error, allow retry

### Success Feedback
- **Method**: Toast notification (top-right)
- **Message**: "✓ Feedback submitted successfully!"
- **Duration**: 3 seconds auto-dismiss
- **Effect**: Clear form after toast appears

### Loading State
- **Buttons**: Show spinner, text changes to "Submitting..."
- **Form**: Keep enabled for viewing but prevent submission
- **Duration**: Until API response received

### Disabled States
- **Button Disabled If**:
  - Approve: No final decision selected
  - Correction: No final decision OR no comments
  - Question: No comments
  - Comment: No comments

---

## Visual Design Guidelines

### Card/Panel Styling
- **Background**: White card with subtle border
- **Title**: "📝 Clinician Feedback" with icon
- **Spacing**: Consistent padding (16-20px)
- **Border Radius**: Match other cards (8px)

### Star Rating
- **Size**: 24-28px per star
- **Color**:
  - Inactive: #d1d5db (gray-300)
  - Active: #fbbf24 (amber-400)
  - Hover: #fcd34d (amber-300)

### Dropdown
- **Style**: Match other form selects in the app
- **Height**: Standard form control height
- **Border**: 1px solid #e5e7eb

### Textarea
- **Font**: Match app body font
- **Border**: 1px solid #e5e7eb, focus blue ring
- **Resize**: Vertical only
- **Min Height**: 100px

### Buttons
- **Layout**: Horizontal row, wrapped if needed
- **Spacing**: 12px gap between buttons
- **Size**: Medium (default button size)
- **Variants**:
  - Approve: `variant="default"` (blue/green)
  - Correction: `variant="secondary"` (orange)
  - Question: `variant="outline"` (blue)
  - Comment: `variant="outline"` (gray)

### Responsive Behavior
- **Desktop**: 4 buttons in a row
- **Tablet**: 2x2 button grid
- **Mobile**: Stacked vertically

---

## Accessibility Requirements

### Keyboard Navigation
- Tab through all interactive elements in logical order:
  1. Star rating
  2. Final decision dropdown
  3. Comments textarea
  4. Action buttons (left to right)
- Enter/Space to interact with stars and buttons

### Screen Reader Support
- Label all form fields clearly
- Announce star rating value on change
- Announce validation errors
- Announce success/error toasts
- Button aria-labels: "Approve abstraction", "Submit correction", etc.

### ARIA Attributes
```html
<div role="group" aria-labelledby="feedback-title">
  <h3 id="feedback-title">Clinician Feedback</h3>

  <div role="radiogroup" aria-label="Overall rating">
    <button aria-label="1 star" ...>★</button>
    <button aria-label="2 stars" ...>★</button>
    <!-- etc -->
  </div>

  <label for="final-decision">Final Decision</label>
  <select id="final-decision" aria-required="true">...</select>

  <label for="comments">Comments / Corrections</label>
  <textarea id="comments" aria-describedby="comments-help">...</textarea>
  <span id="comments-help">Optional: Provide additional context</span>
</div>
```

---

## Demo Mode Behavior

### In Demo Mode (demo_mode: true)
- **Clinician ID**: Set to "DEMO_USER"
- **API Call**: Use mock submission (don't actually save to DB)
- **Success Message**: "✓ Demo feedback recorded (not saved)"
- **Persistence**: Don't persist feedback in demo mode
- **Visual Indicator**: Show demo badge in feedback panel header

---

## Integration Points

### Data Context
```typescript
// From CaseViewPage, pass to FeedbackPanel:
<FeedbackPanel
  caseId={structuredCase.case_id}
  concernId={structuredCase.concern_id}
  patientId={structuredCase.patient.case_metadata.patient_id}
  encounterId={structuredCase.patient.case_metadata.encounter_id}
  abstractionMetadata={structuredCase.abstraction.task_metadata}
  isDemoMode={structuredCase.abstraction.task_metadata.demo_mode}
  onFeedbackSubmitted={handleFeedbackSubmitted}
/>
```

### Callback After Submission
```typescript
const handleFeedbackSubmitted = (feedback: FeedbackSubmission) => {
  // Optional: Refresh case data
  // Optional: Show confirmation in UI
  // Optional: Update task history
};
```

---

## Testing Requirements

### Unit Tests
- [ ] Star rating selection and clearing
- [ ] Form validation for each feedback type
- [ ] Button enable/disable logic
- [ ] Form clearing after submission

### Integration Tests
- [ ] API call with correct payload
- [ ] Success toast display
- [ ] Error handling and retry
- [ ] Form state persistence on error

### E2E Tests
- [ ] Complete approval flow
- [ ] Complete correction flow with comments
- [ ] Question submission
- [ ] Comment submission
- [ ] Validation error display

### Accessibility Tests
- [ ] Keyboard navigation through all controls
- [ ] Screen reader announcements
- [ ] ARIA attributes correct
- [ ] Focus management

---

## Future Enhancements (Phase 2+)

- **Feedback History**: Show previous feedback for this case
- **Feedback Analytics**: Track approval rates per prompt version
- **Feedback Review**: Admin dashboard to review clinician feedback
- **Feedback-Driven Prompts**: Use feedback to improve prompt versions
- **Comparison Mode**: Show abstraction before/after correction
- **Attachments**: Allow file uploads with feedback
- **Threading**: Allow replies to previous feedback

---

## References

### Existing Components to Reuse
- `Card` component for panel wrapper
- `Button` component for action buttons
- `Badge` component for demo mode indicator
- Toast notifications from UI library

### API Client
```typescript
// src/api/client.ts
export const api = {
  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/feedback', feedback);
    return response.data;
  }
};
```

### Type Definitions
```typescript
// src/types/index.ts
export interface FeedbackSubmission {
  patient_id: string;
  encounter_id: string;
  case_id: string;
  concern_id: string;
  feedback_type: 'APPROVAL' | 'CORRECTION' | 'QUESTION' | 'COMMENT';
  rating?: number;
  final_decision?: string;
  comments?: string;
  clinician_id: string;
  submitted_at: string;
  abstraction_task_id?: string;
  prompt_version?: string;
}
```

---

## Implementation Checklist

- [ ] Create `FeedbackPanel.tsx` component
- [ ] Create `FeedbackPanel.css` stylesheet
- [ ] Add FeedbackSubmission type to `src/types/index.ts`
- [ ] Add `submitFeedback` method to `src/api/client.ts`
- [ ] Integrate into CaseViewPage Clinical Review tab
- [ ] Implement star rating component
- [ ] Implement final decision dropdown
- [ ] Implement comments textarea
- [ ] Implement 4 action buttons with validation
- [ ] Add success/error toast notifications
- [ ] Add loading states during submission
- [ ] Add form clearing after success
- [ ] Test all validation rules
- [ ] Test API integration
- [ ] Test accessibility features
- [ ] Add demo mode handling

---

## Questions for Clarification

1. **Feedback Visibility**: Should submitted feedback be visible to other clinicians reviewing the same case?
2. **Versioning**: Should feedback be linked to specific prompt versions for tracking?
3. **Analytics**: Should we track which feedback types are most common per concern/version?
4. **Notifications**: Should feedback trigger notifications to other team members?
5. **Approval Workflow**: Does approval lock the case or just record the decision?
6. **Correction Process**: How are corrections incorporated back into the abstraction?
