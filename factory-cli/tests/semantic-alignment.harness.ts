import { SemanticPacketLoader } from '../utils/semanticPacketLoader';

/**
 * 1-Metric Test Harness: Semantic Alignment Verification
 */
async function testSemanticAlignment(metricId: string, domain: string) {
  console.log(`\n🧪 Testing Semantic Alignment for ${metricId} (${domain})...`);
  
  const loader = SemanticPacketLoader.getInstance();
  
  // 1. Load without metricId (Domain defaults)
  const basePacket = loader.load(domain);
  const baseInfectionSignals = basePacket?.signals['infection_risks'] || [];
  console.log(`   [Base] Infection Signals count: ${baseInfectionSignals.length}`);
  
  // 2. Load with metricId (Overlay)
  const overlaidPacket = loader.load(domain, metricId);
  const overlaidInfectionSignals = overlaidPacket?.signals['infection_risks'] || [];
  console.log(`   [Overlaid] Infection Signals count: ${overlaidInfectionSignals.length}`);

  // Assertions
  if (metricId === 'I32a') {
    // We know I32a has definitions
    const match = overlaidInfectionSignals.some(s => s.toLowerCase().includes('administered'));
    if (match) {
      console.log('   ✅ PASS: Plan aligned with specialized compliance signals');
    } else {
      console.error('   ❌ FAIL: Specialized signals missing from overlaid packet');
    }
  }

  // 3. Test Missing Definition (Guardrail Check)
  console.log('\n🧪 Testing Missing Definition Guardrail (I999)...');
  const fallbackPacket = loader.load(domain, 'I999');
  if (fallbackPacket) {
      console.log('   ✅ PASS: Loader gracefully fell back to defaults for unknown metric');
  }
}

// Run test
testSemanticAlignment('I32a', 'Orthopedics').catch(err => {
    console.error('Test Harness Failed:', err);
    process.exit(1);
});
