/**
 * Home Page - CA Factory Concern Selection
 * Landing page showing available infection surveillance concerns
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Droplet, Scissors, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import './HomePage.css';

interface ConcernCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'active' | 'coming_soon';
  caseCount?: number;
  demo_case_id?: string;
}

const concerns: ConcernCard[] = [
  {
    id: 'clabsi',
    name: 'CLABSI',
    description: 'Central Line-Associated Bloodstream Infection surveillance and abstraction',
    icon: Activity,
    status: 'active',
    caseCount: 1,
    demo_case_id: 'clabsi_demo_001'
  },
  {
    id: 'cauti',
    name: 'CAUTI',
    description: 'Catheter-Associated Urinary Tract Infection surveillance',
    icon: Droplet,
    status: 'active',
    caseCount: 1,
    demo_case_id: 'cauti_demo_001'
  },
  {
    id: 'ssi',
    name: 'SSI',
    description: 'Surgical Site Infection surveillance and tracking',
    icon: Scissors,
    status: 'active',
    caseCount: 1,
    demo_case_id: 'ssi_demo_001'
  }
];

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">CA Factory</h1>
          <p className="hero-subtitle">
            Clinical Abstraction Platform for Healthcare-Associated Infections
          </p>
          <p className="hero-description">
            Select a surveillance concern below to review cases, run abstractions, and manage infection prevention workflows.
          </p>
        </div>

        {/* Concern Cards */}
        <div className="concerns-grid">
          {concerns.map((concern) => {
            const Icon = concern.icon;
            const isActive = concern.status === 'active';

            return (
              <Card key={concern.id} className="concern-card">
                <div className="concern-card-content">
                  {/* Header */}
                  <div className="concern-header">
                    <div className="concern-icon-wrapper">
                      <Icon className="concern-icon" />
                    </div>
                    <div className="concern-title-section">
                      <h2 className="concern-title">{concern.name}</h2>
                      {isActive && concern.caseCount !== undefined && (
                        <Badge variant="secondary" className="case-count-badge">
                          {concern.caseCount} {concern.caseCount === 1 ? 'case' : 'cases'}
                        </Badge>
                      )}
                      {!isActive && (
                        <Badge variant="outline">Coming Soon</Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="concern-description">{concern.description}</p>

                  {/* Actions */}
                  <div className="concern-actions">
                    {isActive ? (
                      <>
                        <Link to="/cases" className="action-link-primary">
                          <Button variant="default" size="sm" className="w-full">
                            View Cases
                          </Button>
                        </Link>
                        {concern.demo_case_id && (
                          <Link to={`/case/${concern.demo_case_id}`} className="action-link-secondary">
                            <Button variant="outline" size="sm" className="w-full">
                              Open Demo Case
                            </Button>
                          </Link>
                        )}
                      </>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="w-full">
                        Not Available Yet
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <AlertCircle className="info-icon" />
          <div className="info-content">
            <h3 className="info-title">Demo Mode</h3>
            <p className="info-text">
              Showing demo cases for CLABSI, CAUTI, and SSI concerns. Each concern includes a sample case
              demonstrating the full abstraction workflow. Advanced features (Task History, Admin) will be available in future releases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
