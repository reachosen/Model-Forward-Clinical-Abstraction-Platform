/**
 * Feedback Form Component
 * Allows clinicians to provide feedback on case reviews
 * Adapted from Vercel implementation for Create React App
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { Label } from './ui/Label';
import { Card } from './ui/Card';
import { useToast } from '../hooks/useToast';
import { Toaster } from './ui/Toaster';
import api from '../api/client';
import './FeedbackForm.css';

interface FeedbackFormProps {
  caseId: string;
  concernId: string;
  patientId: string;
  encounterId: string;
  isDemoMode?: boolean;
}

interface FeedbackFormData {
  sentiment: 'positive' | 'negative' | null;
  comments: string;
}

export function FeedbackForm({
  caseId,
  concernId,
  patientId,
  encounterId,
  isDemoMode = false,
}: FeedbackFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FeedbackFormData>({
    sentiment: null,
    comments: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSentimentChange = (sentiment: 'positive' | 'negative') => {
    setFormData({
      ...formData,
      sentiment,
    });
  };

  const validateForm = (): string | null => {
    if (!formData.sentiment) return 'Please select thumbs up or thumbs down';
    if (!formData.comments.trim()) return 'Please provide your comments';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call API to submit feedback
      await api.submitFeedback({
        patient_id: patientId,
        encounter_id: encounterId,
        case_id: caseId,
        concern_id: concernId,
        feedback_type: 'COMMENT', // Using COMMENT type for general feedback
        rating: formData.sentiment === 'positive' ? 5 : 1,
        comments: formData.comments,
        clinician_id: isDemoMode ? 'DEMO_USER' : 'current_user',
      });

      toast({
        title: 'Success',
        description: isDemoMode
          ? 'Demo feedback recorded (not saved)'
          : 'Feedback submitted successfully',
      });

      // Reset form
      setFormData({
        sentiment: null,
        comments: '',
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="feedback-form-card">
        <div className="card-header">
          <h3 className="card-title">Case Review Feedback</h3>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="feedback-form">
            {/* Thumbs Up/Down Selection */}
            <div className="form-group">
              <Label htmlFor="sentiment">
                How would you rate this case review?
              </Label>
              <div className="sentiment-buttons">
                <Button
                  type="button"
                  variant={formData.sentiment === 'positive' ? 'default' : 'outline'}
                  size="default"
                  onClick={() => handleSentimentChange('positive')}
                  className="sentiment-button"
                >
                  <ThumbsUp className="button-icon" size={20} />
                  Thumbs Up
                </Button>
                <Button
                  type="button"
                  variant={formData.sentiment === 'negative' ? 'default' : 'outline'}
                  size="default"
                  onClick={() => handleSentimentChange('negative')}
                  className="sentiment-button"
                >
                  <ThumbsDown className="button-icon" size={20} />
                  Thumbs Down
                </Button>
              </div>
            </div>

            {/* Comments Text Area */}
            <div className="form-group">
              <Label htmlFor="comments">Your Comments</Label>
              <Textarea
                id="comments"
                placeholder="Please share your feedback about this case review"
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                rows={12}
                className="comments-textarea"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </div>
      </Card>
      <Toaster />
    </>
  );
}
