/**
 * Learning Loop Quick Start
 *
 * Minimal example demonstrating the learning loop with intent-first mode.
 */

import { enqueueRejectedConfig } from '../planner/learningQueueHelpers';

// Example: Missing pediatric-specific signal
console.log('\n🧠 Learning Loop Quick Start\n');

// When an SME reviews a plan and wants to flag it for improvement:
const item = enqueueRejectedConfig({
  input: {
    planning_id: 'example-clabsi-nicu-001',
    review_request: 'Create a CLABSI surveillance workflow for NICU patients',
  } as any, // Type bypass for example simplicity

  output: {
    plan_metadata: {
      plan_id: 'plan-clabsi-nicu-001',
      planning_input_id: 'example-clabsi-nicu-001',
      generated_at: new Date().toISOString(),
      planner_version: '7.0.0',
      confidence: 0.75,
      requires_review: false,
      status: 'draft' as const,
    },
    rationale: {
      summary: 'Generated CLABSI surveillance plan',
      key_decisions: [],
    },
    hac_config: {} as any,
    validation: {
      is_valid: true,
      errors: [],
      warnings: [],
      schema_valid: true,
      business_rules_valid: true,
    },
  } as any, // Type bypass for example simplicity

  reviewer_comment:
    'Missing TPN (Total Parenteral Nutrition) status signal. ' +
    'NHSN guidelines require tracking TPN for neonates (0-90 days) due to ' +
    'significantly elevated risk of fungal CLABSI, especially Candida species. ' +
    'This is a core signal for our NICU population.',

  reviewer_name: 'Dr. Sarah Martinez, Neonatology',
});

console.log('✅ Learning item enqueued:', item.id);
console.log('   Type:', item.domain_type);
console.log('   Archetype:', item.archetype);
console.log('   Domain:', item.domain);
console.log('   Status:', item.status);

console.log('\n📋 Next Steps:\n');
console.log('1. Check learning queue status:');
console.log('   npm run learn:status\n');
console.log('2. Process pending items (mock mode):');
console.log('   npm run learn:mock\n');
console.log('3. Review proposed patches:');
console.log('   cat learning_drafts/*.json\n');
console.log('4. Apply relevant patches to signal libraries\n');
console.log('5. Test with updated configs\n');

console.log('💡 Tip: This example uses mock data. In production, you would');
console.log('   enqueue rejected configs from your UI/API when SMEs mark');
console.log('   generated plans as "needs improvement".\n');
