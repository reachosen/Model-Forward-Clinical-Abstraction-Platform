import { TrackDefinition } from './types';

export const TRACKS: Record<string, TrackDefinition> = {
  'flywheel:standard': {
    id: 'flywheel:standard',
    description: 'Standard Ingest -> Strategy -> Generate -> Eval -> Certify flow.',
    steps: [
      {
        id: 'step_ingest',
        missionId: 'plan:ingest',
        name: 'Ingest Definitions',
        args: {
          '{{metric}}': '{{metricId}}',
          '{{run}}': '{{runDir}}'
        },
        outputArtifact: '{{runDir}}/plan.json'
      },
      {
        id: 'step_strategy',
        missionId: 'strategy:derive',
        name: 'Derive Strategy',
        args: {
          '{{metric}}': '{{metricId}}',
          '{{plan}}': '{{runDir}}/plan.json',
          '{{out}}': '{{runDir}}/strategy.json'
        },
        inputArtifact: '{{runDir}}/plan.json',
        outputArtifact: '{{runDir}}/strategy.json'
      },
      {
        id: 'step_generate',
        missionId: 'eval:generate-cases',
        name: 'Generate Test Cases',
        args: {
          '{{strategy}}': '{{runDir}}/strategy.json',
          '{{out}}': '{{runDir}}/test_cases.json'
        },
        inputArtifact: '{{runDir}}/strategy.json',
        outputArtifact: '{{runDir}}/test_cases.json'
      },
      {
        id: 'step_battle',
        missionId: 'eval:run-battle',
        name: 'Battle Test',
        args: {
          '{{plan}}': '{{runDir}}/plan.json',
          '{{testcases}}': '{{runDir}}/test_cases.json',
          '{{out}}': '{{runDir}}/eval_report.json'
        },
        inputArtifact: '{{runDir}}/test_cases.json',
        outputArtifact: '{{runDir}}/eval_report.json',
        gate: { condition: 'SCORE_GT', value: 0.0 }
      },
      {
        id: 'step_certify',
        missionId: 'gov:certify',
        name: 'Certify Artifacts',
        args: {
          '{{report}}': '{{runDir}}/eval_report.json',
          '{{plan}}': '{{runDir}}/plan.json'
        },
        inputArtifact: '{{runDir}}/eval_report.json'
      }
    ]
  },
  'flywheel:lite': {
    id: 'flywheel:lite',
    description: 'Ingest Only (for simpler metrics or debug).',
    steps: [
      {
        id: 'step_ingest',
        missionId: 'plan:ingest',
        name: 'Ingest Definitions',
        args: {
          '{{metric}}': '{{metricId}}',
          '{{run}}': '{{runDir}}'
        },
        outputArtifact: '{{runDir}}/plan.json'
      }
    ]
  }
};