/**
 * Confidence Indicator Component
 * Displays AI confidence level with visual bar
 */

import React from 'react';
import './ConfidenceIndicator.css';

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

export default ConfidenceIndicator;
