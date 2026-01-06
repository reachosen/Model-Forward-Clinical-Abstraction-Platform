
import { Command } from 'commander';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * eval:roundtrip CLI Command
 */
export const evalRoundtrip = new Command('eval:roundtrip')
  .description('Run the full Balanced 50 cycle: Derive -> Generate -> Audit')
  .requiredOption('-m, --metric <id>', 'Metric ID (e.g., I32a)')
  .action(async (options) => {
    try {
      const { metric } = options;
      console.log(`\n🚀 Orchestrating Roundtrip for ${metric}...`);
      
      const scriptPath = path.resolve(__dirname, '../../tools/eval-roundtrip.ts');
      
      // Execute the existing orchestrator script
      execSync(`npx ts-node "${scriptPath}" ${metric}`, { stdio: 'inherit' });

    } catch (error: any) {
      console.error(`\n❌ Roundtrip Execution Failed:`, error.message);
      process.exit(1);
    }
  });
