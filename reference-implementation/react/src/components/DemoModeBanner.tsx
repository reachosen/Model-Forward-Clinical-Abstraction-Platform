/**
 * DemoModeBanner - Latest from Vercel (Nov 18 00:07)
 * Displays alert banner when viewing demonstration cases
 */

import React from 'react';
import './DemoModeBanner.css';

export function DemoModeBanner() {
  return (
    <div className="demo-mode-banner">
      <div className="demo-banner-icon">ℹ️</div>
      <div className="demo-banner-content">
        <div className="demo-banner-title">Demo Mode</div>
        <div className="demo-banner-description">
          You are viewing a demonstration case. Task executions in this mode use pre-configured settings and example data.
        </div>
      </div>
    </div>
  );
}
