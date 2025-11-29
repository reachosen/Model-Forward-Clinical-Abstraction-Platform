/**
 * Research Command
 *
 * Fetch research sources only (no plan generation)
 */

import * as fs from 'fs/promises';
import { ResearchOrchestrator } from '../research/researchOrchestrator';

export async function researchCommand(options: any) {
  const { concern, domain, output, forceRefresh } = options;

  if (!concern) {
    console.error('❌ Error: --concern is required');
    process.exit(1);
  }

  console.log(`\n🔍 Research Mode`);
  console.log(`   Concern: ${concern}`);
  console.log(`   Domain: ${domain || 'general'}`);
  console.log(`   Force Refresh: ${forceRefresh ? 'Yes' : 'No'}\n`);

  const orchestrator = new ResearchOrchestrator();
  const research = await orchestrator.research(concern, domain, {
    forceRefresh
  });

  // Display summary
  console.log(`\n📊 Research Summary:`);
  console.log(`   Research ID: ${research.research_id}`);
  console.log(`   Coverage: ${Math.round(research.coverage.coverage_score * 100)}%`);
  console.log(`   Sources Retrieved: ${research.coverage.sources_successful}/${research.coverage.sources_attempted}`);
  console.log(`   Clinical Tools: ${research.clinical_tools.length}`);

  console.log(`\n📚 Sources:`);
  research.sources.forEach((source, idx) => {
    console.log(`   ${idx + 1}. ${source.authority} (${source.version})`);
    console.log(`      Status: ${source.cache_status}`);
    if (source.cached_date) {
      console.log(`      Cached: ${new Date(source.cached_date).toLocaleDateString()}`);
    }
  });

  if (research.clinical_tools.length > 0) {
    console.log(`\n🧮 Clinical Tools:`);
    research.clinical_tools.forEach((tool, idx) => {
      console.log(`   ${idx + 1}. ${tool.tool_name} (${tool.version})`);
      console.log(`      Use Case: ${tool.use_case}`);
    });
  }

  // Save if output specified
  if (output) {
    await fs.writeFile(output, JSON.stringify(research, null, 2));
    console.log(`\n✅ Research saved to: ${output}\n`);
  } else {
    console.log(`\n💡 Tip: Use --output <path> to save research bundle\n`);
  }
}
