import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-1
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const percentage = (confidence * 100).toFixed(0);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return { color: '#059669', label: 'High' };
    if (conf >= 0.5) return { color: '#d97706', label: 'Medium' };
    return { color: '#dc2626', label: 'Low' };
  };

  const { color, label } = getConfidenceColor(confidence);

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm font-medium text-muted-foreground">
        Confidence:
      </span>
      <div className="flex-1 max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>
        {percentage}% ({label})
      </span>
    </div>
  );
}
