import * as fs from 'fs';
import * as path from 'path';

// Parse arguments
const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && args.length > index + 1 ? args[index + 1] : undefined;
}

const specialty = getArg('--specialty');
const metricsFile = getArg('--metrics');
const topicsFile = getArg('--topics');

if (!specialty || !metricsFile || !topicsFile) {
  console.error('Usage: ts-node tools/generate-research-prompt.ts --specialty "Endocrinology" --metrics metrics.txt --topics topics.txt');
  console.error('\nExample metrics.txt:\nC41: LDL cholesterol\nC35: A1c control\n');
  console.error('\nExample topics.txt:\nType 1 diabetes management\nThyroid disorders\n');
  process.exit(1);
}

// Read Template
const templatePath = path.join(__dirname, '../domains_registry/templates/gemini_deep_research.md');
if (!fs.existsSync(templatePath)) {
  console.error(`❌ Template not found at: ${templatePath}`);
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf-8');

// Read Input Files
let metricsList: string;
let topicsList: string;

try {
  metricsList = fs.readFileSync(metricsFile, 'utf-8').trim();
  topicsList = fs.readFileSync(topicsFile, 'utf-8').trim();
} catch (error: any) {
  console.error(`❌ Failed to read input files: ${error.message}`);
  process.exit(1);
}

// Helper to extract IDs from metrics list (assumes "ID: Description" format)
function extractMetricIds(list: string): string[] {
  const ids: string[] = [];
  const lines = list.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9\.]+)\s*[:]/);
    if (match) {
      ids.push(`"${match[1]}"`);
    }
  }
  return ids;
}

const metricIds = extractMetricIds(metricsList);
const metricIdsString = '[' + metricIds.join(',') + ']';
const exampleMetricId = metricIds.length > 0 ? metricIds[0].replace(/"/g, '') : 'C01';

// Replacements
const replacements: Record<string, string> = {
  '{SPECIALTY}': specialty,
  '{SPECIALTY_LOWER}': specialty.toLowerCase(),
  '{SPECIALTY_UPPER}': specialty.toUpperCase().replace(/\s+/g, '_'),
  '{TARGET_METRICS}': metricsList,
  '{SEARCH_TOPICS}': topicsList,
  '{METRIC_IDS_LIST}': metricIdsString,
  '{EXAMPLE_METRIC_ID}': exampleMetricId
};

// Execute Replacements
for (const [key, value] of Object.entries(replacements)) {
  template = template.replace(new RegExp(key, 'g'), value);
}

// Output to Stdout
console.log(template);
