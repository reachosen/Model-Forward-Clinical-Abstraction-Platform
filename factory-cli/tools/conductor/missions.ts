export interface Mission {
  id: string;
  command: string;
  args: string[];
}

export const MISSIONS: Mission[] = [
  {
    id: 'plan:generate-run',
    command: 'npx',
    args: [
      'ts-node',
      'bin/planner.ts',
      'generate',
      '--concern',
      '{{metric}}',
      '--domain',
      'orthopedics',
      '--output',
      '{{out}}'
    ]
  },
  {
    id: 'schema:certify',
    command: 'npx',
    args: [
      'ts-node',
      'SchemaFactory/cli.ts',
      'certify',
      '--plan',
      '{{plan}}'
    ]
  }
];
