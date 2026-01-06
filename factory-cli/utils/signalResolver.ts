
export interface SignalRegistryEntry {
  id: string;
  legacy_id?: string;
  // ... other fields not needed for resolution
}

// Hardcoded alias map migrated from accountant.ts + new restoration mappings
const STATIC_ALIAS_MAP: Record<string, string> = {
    'paresthesia/numbness': 'paresthesia_numbness',
    'hardware': 'hardware_complication',
    'hardware_complication': 'hardware_complication',
    'Hardware_complication': 'hardware_complication',
    'gi_complication(ileus/obstruction)': 'gi_complication_ileus_obstruction',
    'gi_complication_(ileus/obstruction)': 'gi_complication_ileus_obstruction',
    'gi_complication': 'gi_complication_ileus_obstruction',
    'GI_complication_(ileus/obstruction)': 'gi_complication_ileus_obstruction',
    'GI_complication': 'gi_complication_ileus_obstruction',
    'pneumonia/respiratory': 'pneumonia_respiratory_distress',
    'pneumonia/respiratory_distress': 'pneumonia_respiratory_distress',
    'unexpected_icu_admission': 'unexpected_icu_admission',
    'neurovascular_exam_not_documented_pre_op': 'neurovascular_exam_documentation_gap_pre_op',
    'neurovascular_exam_not_documented_post_op': 'neurovascular_exam_documentation_gap_post_op',
    'increasing': 'increasing_analgesic_requirement',
    'pain_out_of_proportion_to_injury': 'pain_out_of_proportion_to_injury',
    
    // RESTORATION MAPPINGS (Positive -> Negative Registry IDs)
    'perfusion_checks_documented': 'absence_of_perfusion_checks',
    'perfusion_checks_performed': 'absence_of_perfusion_checks',
    'pre_op_warming_documented': 'pre_op_warming_not_documented',
    'antibiotic_prophylaxis_given': 'antibiotic_prophylaxis_not_given_within_',
    'antibiotic_prophylaxis_timely': 'antibiotic_prophylaxis_not_given_within_',
    'chlorhexidine_prep_used': 'chlorhexidine_prep_not_useddocumented',
    'chlorhexidine_prep_documented': 'chlorhexidine_prep_not_useddocumented'
};

/**
 * Resolves a raw signal ID to its canonical form within the given registry context.
 * 
 * Strategy:
 * 1. Check Static Alias Map
 * 2. Exact Match in Registry (id)
 * 3. Legacy Match in Registry (legacy_id)
 * 4. Case-insensitive Match
 */
export function resolveSignalId(rawId: string, registrySignals: SignalRegistryEntry[]): string | null {
  const normalizedRaw = rawId.trim();
  
  // 1. Static Alias Map
  if (STATIC_ALIAS_MAP[normalizedRaw]) {
    // If alias points to something, check if THAT target exists in registry?
    // Or assume alias map is authoritative?
    // Let's return the aliased ID, but the caller should verify existence.
    // Actually, mapping 'perfusion_checks_performed' -> 'absence_of_perfusion_checks'
    // 'absence_of_perfusion_checks' IS the canonical ID in the current (restored) registry.
    return STATIC_ALIAS_MAP[normalizedRaw];
  }
  if (STATIC_ALIAS_MAP[normalizedRaw.toLowerCase()]) {
    return STATIC_ALIAS_MAP[normalizedRaw.toLowerCase()];
  }

  // 2. Exact Match (Canonical)
  const exact = registrySignals.find(s => s.id === normalizedRaw);
  if (exact) return exact.id;

  // 3. Legacy Match
  // If rawId matches a legacy_id, return the NEW canonical id associated with it.
  const legacy = registrySignals.find(s => s.legacy_id === normalizedRaw);
  if (legacy) return legacy.id; 

  // 4. Case-insensitive / Fuzzy
  const lowerRaw = normalizedRaw.toLowerCase();
  const fuzzy = registrySignals.find(s => s.id.toLowerCase() === lowerRaw || s.legacy_id?.toLowerCase() === lowerRaw);
  if (fuzzy) return fuzzy.id;

  return null;
}
