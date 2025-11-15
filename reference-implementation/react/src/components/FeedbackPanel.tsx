/**
 * Feedback Panel Component
 * Allows clinicians to provide feedback on abstractions
 */

import React, { useState } from 'react';
import api from '../api/client';
import { FeedbackSubmission } from '../types';
import './FeedbackPanel.css';

interface FeedbackPanelProps {
  patientId: string;
  encounterId: string;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ patientId, encounterId }) => {
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [finalDecision, setFinalDecision] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (feedbackType: 'APPROVAL' | 'CORRECTION' | 'QUESTION' | 'COMMENT') => {
    setSubmitting(true);
    setSubmitSuccess(false);

    const feedback: FeedbackSubmission = {
      patient_id: patientId,
      encounter_id: encounterId,
      feedback_type: feedbackType,
      rating: rating > 0 ? rating : undefined,
      comments: comments || undefined,
      final_decision: finalDecision || undefined,
      clinician_id: 'DEMO_USER',
    };

    try {
      await api.submitFeedback(feedback);
      setSubmitSuccess(true);
      // Reset form
      setComments('');
      setFinalDecision('');
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-panel panel">
      <h2>Clinician Feedback</h2>

      {submitSuccess && (
        <div className="success-message">✓ Feedback submitted successfully!</div>
      )}

      <div className="rating-section">
        <label>Overall Rating:</label>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label htmlFor="final-decision">Final Decision:</label>
        <select
          id="final-decision"
          value={finalDecision}
          onChange={(e) => setFinalDecision(e.target.value)}
        >
          <option value="">-- Select --</option>
          <option value="CONFIRMED_CLABSI">Confirmed CLABSI</option>
          <option value="RULED_OUT">Ruled Out</option>
          <option value="NEEDS_MORE_INFO">Needs More Information</option>
          <option value="INDETERMINATE">Indeterminate</option>
        </select>
      </div>

      <div className="form-section">
        <label htmlFor="comments">Comments / Corrections:</label>
        <textarea
          id="comments"
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Enter any comments, corrections, or questions..."
        />
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-approve"
          onClick={() => handleSubmit('APPROVAL')}
          disabled={submitting}
        >
          👍 Approve
        </button>
        <button
          className="btn btn-correct"
          onClick={() => handleSubmit('CORRECTION')}
          disabled={submitting}
        >
          ✏️ Submit Correction
        </button>
        <button
          className="btn btn-question"
          onClick={() => handleSubmit('QUESTION')}
          disabled={submitting}
        >
          ❓ Ask Question
        </button>
        <button
          className="btn btn-comment"
          onClick={() => handleSubmit('COMMENT')}
          disabled={submitting}
        >
          💬 Add Comment
        </button>
      </div>
    </div>
  );
};

export default FeedbackPanel;
