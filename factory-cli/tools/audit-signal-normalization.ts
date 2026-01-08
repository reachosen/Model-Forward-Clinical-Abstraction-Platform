import { SemanticPacketLoader, normalizeSignalGroups } from '../utils/semanticPacketLoader';

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function summarizeSignals(signals: Record<string, any[]>): Record<string, any> {
  const summary: Record<string, any> = {};
  for (const [groupId, groupSignals] of Object.entries(signals || {})) {
    const keyCounts = new Map<string, number>();
    let missingId = 0;
    let missingDesc = 0;
    (groupSignals || []).forEach((sig: any) => {
      if (!sig) return;
      const desc = sig.description || sig.name || sig.signal_id || sig.id;
      if (!desc) missingDesc += 1;
      if (!sig.id && !sig.signal_id) missingId += 1;
      const canonicalKey = sig.canonical_key || `${groupId}|${desc || ''}`;
      const normalized = canonicalKey.toLowerCase();
      keyCounts.set(normalized, (keyCounts.get(normalized) || 0) + 1);
    });
    const duplicates = Array.from(keyCounts.values()).filter((v) => v > 1).length;
    summary[groupId] = {
      total: groupSignals.length,
      duplicates,
      missing_id: missingId,
      missing_description: missingDesc
    };
  }
  return summary;
}

async function main() {
  const domain = getArg('--domain') || 'Orthopedics';
  const metric = getArg('--metric') || 'I32a';

  const loader = SemanticPacketLoader.getInstance();

  process.env.DISABLE_SIGNAL_NORMALIZATION = '1';
  loader.clearCache();
  const raw = loader.load(domain, metric);

  process.env.DISABLE_SIGNAL_NORMALIZATION = '0';
  loader.clearCache();
  const normalized = loader.load(domain, metric);

  if (!raw || !normalized) {
    console.error('Failed to load semantic packet for audit.');
    process.exit(1);
  }

  const rawSummary = summarizeSignals(raw.signals as any);
  const normalizedSummary = summarizeSignals(normalized.signals as any);

  console.log(`Signal normalization audit for ${domain}/${metric}`);
  console.log('Raw summary:', JSON.stringify(rawSummary, null, 2));
  console.log('Normalized summary:', JSON.stringify(normalizedSummary, null, 2));

  const normalizedDirect = normalizeSignalGroups(raw.signals as any);
  const directSummary = summarizeSignals(normalizedDirect as any);
  console.log('Normalized (direct) summary:', JSON.stringify(directSummary, null, 2));
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
