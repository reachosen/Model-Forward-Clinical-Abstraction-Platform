/**
 * Domain Auto-Detection Utility
 *
 * Automatically detects the appropriate domain based on concern_id.
 * Eliminates the need for users to manually specify domain in most cases.
 */

export type DomainType = 'HAC' | 'Safety' | 'Orthopedics' | 'Endocrinology' | 'Quality';

/**
 * Auto-detect domain from concern ID
 *
 * @param concernId Concern ID (e.g., CLABSI, CAUTI, I06)
 * @returns Detected domain type
 *
 * @example
 * detectDomain('CLABSI') // Returns 'HAC'
 * detectDomain('I06') // Returns 'Orthopedics'
 * detectDomain('DIABETES_MANAGEMENT') // Returns 'Endocrinology'
 */
export function detectDomain(concernId: string): DomainType {
  const concernUpper = concernId.toUpperCase();

  // HAC (Hospital-Acquired Conditions) - NHSN surveillance
  const hacPatterns = [
    'CLABSI', 'CAUTI', 'VAP', 'VAE', 'SSI',
    'CENTRAL_LINE', 'CATHETER', 'VENTILATOR',
    'SURGICAL_SITE', 'C_DIFF', 'CDIFF'
  ];
  if (hacPatterns.some(pattern => concernUpper.includes(pattern))) {
    return 'HAC';
  }

  // Orthopedics - USNWR metrics and joint procedures
  const orthoPatterns = [
    'ORTHO', 'HIP', 'KNEE', 'JOINT', 'FRACTURE',
    'THA', 'TKA', 'ARTHROPLASTY', 'I06', 'I07', 'I08',
    'I25', 'I26', 'I27', 'I32'
  ];
  if (orthoPatterns.some(pattern => concernUpper.includes(pattern))) {
    return 'Orthopedics';
  }

  // Endocrinology - Diabetes and glycemic control
  const endoPatterns = [
    'DIABETES', 'GLYCEMIC', 'INSULIN', 'A1C', 'HYPOGLYCEMIA',
    'HYPERGLYCEMIA', 'DKA', 'ENDO', 'THYROID'
  ];
  if (endoPatterns.some(pattern => concernUpper.includes(pattern))) {
    return 'Endocrinology';
  }

  // Quality metrics - General quality measures
  const qualityPatterns = [
    'QUALITY', 'READMISSION', 'MORTALITY', 'LOS',
    'PATIENT_SAFETY', 'FALLS', 'PRESSURE_ULCER'
  ];
  if (qualityPatterns.some(pattern => concernUpper.includes(pattern))) {
    return 'Quality';
  }

  // Safety - General patient safety measures
  const safetyPatterns = [
    'SAFETY', 'ADVERSE_EVENT', 'MEDICATION_ERROR',
    'TRANSFUSION_REACTION', 'WRONG_SITE'
  ];
  if (safetyPatterns.some(pattern => concernUpper.includes(pattern))) {
    return 'Safety';
  }

  // Default to HAC for unknown concerns (most common case)
  console.warn(
    `⚠️  Could not auto-detect domain for concern '${concernId}'. ` +
    `Defaulting to 'HAC'. Specify -d/--domain to override.`
  );
  return 'HAC';
}

/**
 * Get a descriptive care setting hint based on domain
 * Used for output folder naming and metadata
 *
 * @param domain Domain type
 * @returns Care setting string
 */
export function getDefaultCareSetting(domain: DomainType): string {
  switch (domain) {
    case 'HAC':
    case 'Safety':
      return 'general-pediatric';
    case 'Orthopedics':
      return 'surgical';
    case 'Endocrinology':
      return 'ambulatory';
    case 'Quality':
      return 'hospital-wide';
    default:
      return 'general';
  }
}

/**
 * Get human-readable domain description
 *
 * @param domain Domain type
 * @returns Description string
 */
export function getDomainDescription(domain: DomainType): string {
  switch (domain) {
    case 'HAC':
      return 'Hospital-Acquired Conditions (NHSN Surveillance)';
    case 'Safety':
      return 'Patient Safety Metrics';
    case 'Orthopedics':
      return 'Orthopedic Quality Metrics (USNWR)';
    case 'Endocrinology':
      return 'Endocrinology & Metabolic Care';
    case 'Quality':
      return 'General Quality Measures';
    default:
      return 'Clinical Surveillance';
  }
}
