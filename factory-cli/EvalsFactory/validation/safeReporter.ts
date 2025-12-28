/**
 * SAFE v0 Report Formatters
 *
 * Provides output formatters for SAFE v0 batch reports:
 * - console: Human-readable tables with colors
 * - json: Structured JSON output
 * - markdown: Markdown report for documentation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SAFEv0BatchReport,
  SAFEv0Label,
} from '../../types/safety';

export type ReportFormat = 'json' | 'console' | 'markdown' | 'all';

// ============================================
// Console Formatting Utilities
// ============================================

// ANSI color codes (will be stripped in non-TTY environments)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorize(text: string, color: keyof typeof colors): string {
  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

function labelColor(label: SAFEv0Label): string {
  switch (label) {
    case 'Pass': return colorize('PASS', 'green');
    case 'Review': return colorize('REVIEW', 'yellow');
    case 'Fail': return colorize('FAIL', 'red');
  }
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

function padRight(str: string, len: number): string {
  // Account for ANSI codes when calculating visible length
  const visibleLen = str.replace(/\x1b\[[0-9;]*m/g, '').length;
  return str + ' '.repeat(Math.max(0, len - visibleLen));
}

function padLeft(str: string, len: number): string {
  const visibleLen = str.replace(/\x1b\[[0-9;]*m/g, '').length;
  return ' '.repeat(Math.max(0, len - visibleLen)) + str;
}

// ============================================
// Console Output
// ============================================

export function formatConsole(report: SAFEv0BatchReport, verbose: boolean = false, strictAH: boolean = false): string {
  const lines: string[] = [];
  const { summary, by_archetype, failure_analysis, results } = report;

  // Header
  lines.push('');
  lines.push(colorize('=' .repeat(70), 'cyan'));
  lines.push(colorize(`  SAFE v0 Scorecard - ${report.concern_id}`, 'bright'));
  if (strictAH) {
    lines.push(colorize('  [STRICT AH MODE]', 'yellow'));
  }
  lines.push(colorize('=' .repeat(70), 'cyan'));
  lines.push('');

  // Summary stats
  const passRate = (summary.overall_pass_rate * 100).toFixed(0);
  const reviewRate = (summary.review_count / summary.total_cases * 100).toFixed(0);
  const failRate = (summary.fail_count / summary.total_cases * 100).toFixed(0);

  lines.push(`  Total Cases: ${summary.total_cases}    ` +
    `${colorize(`Pass: ${summary.pass_count} (${passRate}%)`, 'green')}    ` +
    `${colorize(`Review: ${summary.review_count} (${reviewRate}%)`, 'yellow')}    ` +
    `${colorize(`Fail: ${summary.fail_count} (${failRate}%)`, 'red')}`
  );
  lines.push('');

  // Metric summary table
  lines.push(colorize('-'.repeat(70), 'dim'));
  lines.push(`  ${padRight('Metric', 10)} | ${padRight('Mean Score', 12)} | ${padRight('Pass Rate', 12)} | Status`);
  lines.push(colorize('-'.repeat(70), 'dim'));

  const crStatus = summary.pass_rates.CR >= 0.8 ? colorize('OK', 'green') : colorize('WARN', 'yellow');
  const ahStatus = summary.pass_rates.AH >= 1.0 ? colorize('OK', 'green') :
    colorize(`WARN (${failure_analysis.common_AH_violations.length} violation types)`, 'yellow');
  const acStatus = summary.pass_rates.AC >= 0.8 ? colorize('OK', 'green') : colorize('WARN', 'yellow');

  lines.push(`  ${padRight('CR', 10)} | ${padRight(formatScore(summary.mean_scores.CR), 12)} | ${padRight((summary.pass_rates.CR * 100).toFixed(0) + '%', 12)} | ${crStatus}`);
  lines.push(`  ${padRight('AH', 10)} | ${padRight(formatScore(summary.mean_scores.AH), 12)} | ${padRight((summary.pass_rates.AH * 100).toFixed(0) + '%', 12)} | ${ahStatus}`);
  lines.push(`  ${padRight('AC', 10)} | ${padRight(formatScore(summary.mean_scores.AC), 12)} | ${padRight((summary.pass_rates.AC * 100).toFixed(0) + '%', 12)} | ${acStatus}`);

  lines.push(colorize('-'.repeat(70), 'dim'));
  lines.push(`  Composite: ${colorize(formatScore(summary.mean_scores.composite), 'bright')}`);
  lines.push('');

  // Per-case breakdown table
  lines.push(colorize('Per-Case Breakdown:', 'bright'));
  lines.push(colorize('-'.repeat(70), 'dim'));
  lines.push(`  ${padRight('Test ID', 18)} | ${padRight('Archetype', 24)} | ${padLeft('CR', 5)} | ${padLeft('AH', 5)} | ${padLeft('AC', 5)} | Label`);
  lines.push(colorize('-'.repeat(70), 'dim'));

  for (const sc of results) {
    const archetype = sc.archetype || 'Unknown';
    lines.push(
      `  ${padRight(sc.test_id, 18)} | ${padRight(archetype.substring(0, 24), 24)} | ` +
      `${padLeft(formatScore(sc.scores.CR.score), 5)} | ` +
      `${padLeft(formatScore(sc.scores.AH.score), 5)} | ` +
      `${padLeft(formatScore(sc.scores.AC.score), 5)} | ` +
      `${labelColor(sc.label)}`
    );
  }
  lines.push(colorize('-'.repeat(70), 'dim'));
  lines.push('');

  // By-archetype breakdown
  if (Object.keys(by_archetype).length > 0) {
    lines.push(colorize('By Archetype:', 'bright'));
    for (const [archetype, stats] of Object.entries(by_archetype)) {
      lines.push(`  ${archetype}: count=${stats.count}, mean_CR=${formatScore(stats.mean_CR)}, mean_AH=${formatScore(stats.mean_AH)}, mean_AC=${formatScore(stats.mean_AC)}, pass_rate=${(stats.pass_rate * 100).toFixed(0)}%`);
    }
    lines.push('');
  }

  // Failure analysis (top issues)
  if (failure_analysis.common_CR_misses.length > 0 ||
      failure_analysis.common_AH_violations.length > 0 ||
      failure_analysis.common_AC_misses.length > 0) {
    lines.push(colorize('Top Issues:', 'bright'));

    if (failure_analysis.common_CR_misses.length > 0) {
      const topCR = failure_analysis.common_CR_misses.slice(0, 3);
      lines.push(`  CR Misses: ${topCR.map(m => `"${m.signal.substring(0, 30)}..." (${m.count})`).join(', ')}`);
    }

    if (failure_analysis.common_AH_violations.length > 0) {
      const topAH = failure_analysis.common_AH_violations.slice(0, 3);
      lines.push(`  AH Violations: ${topAH.map(v => `"${v.term}" (${v.count})`).join(', ')}`);
    }

    if (failure_analysis.common_AC_misses.length > 0) {
      const topAC = failure_analysis.common_AC_misses.slice(0, 3);
      lines.push(`  AC Misses: ${topAC.map(m => `"${m.phrase}" (${m.count})`).join(', ')}`);
    }
    lines.push('');
  }

  // Verbose: per-case details
  if (verbose) {
    lines.push(colorize('='.repeat(70), 'dim'));
    lines.push(colorize('Detailed Per-Case Analysis:', 'bright'));
    lines.push('');

    for (const sc of results) {
      lines.push(colorize(`--- ${sc.test_id} (${labelColor(sc.label)}) ---`, 'cyan'));
      lines.push(`  CR: ${formatScore(sc.scores.CR.score)} - ${sc.scores.CR.reasoning}`);
      if (sc.scores.CR.details?.missing && sc.scores.CR.details.missing.length > 0) {
        lines.push(`      Missing: ${sc.scores.CR.details.missing.slice(0, 3).join(', ')}${sc.scores.CR.details.missing.length > 3 ? '...' : ''}`);
      }

      lines.push(`  AH: ${formatScore(sc.scores.AH.score)} - ${sc.scores.AH.reasoning}`);
      if (sc.scores.AH.details?.violations && sc.scores.AH.details.violations.length > 0) {
        lines.push(`      Violations: ${sc.scores.AH.details.violations.join(', ')}`);
      }

      lines.push(`  AC: ${formatScore(sc.scores.AC.score)} - ${sc.scores.AC.reasoning}`);
      if (sc.scores.AC.details?.missing && sc.scores.AC.details.missing.length > 0) {
        lines.push(`      Missing: ${sc.scores.AC.details.missing.slice(0, 3).join(', ')}${sc.scores.AC.details.missing.length > 3 ? '...' : ''}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================
// JSON Output
// ============================================

export function formatJSON(report: SAFEv0BatchReport): string {
  return JSON.stringify(report, null, 2);
}

// ============================================
// Markdown Output
// ============================================

export function formatMarkdown(report: SAFEv0BatchReport): string {
  const lines: string[] = [];
  const { summary, by_archetype, failure_analysis, results } = report;

  lines.push(`# SAFE v0 Report`);
  lines.push('');
  lines.push(`**Concern ID:** ${report.concern_id}`);
  lines.push(`**Batch ID:** ${report.batch_id}`);
  lines.push(`**Generated:** ${report.generated_at}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Cases | ${summary.total_cases} |`);
  lines.push(`| Pass | ${summary.pass_count} (${(summary.overall_pass_rate * 100).toFixed(0)}%) |`);
  lines.push(`| Review | ${summary.review_count} (${(summary.review_count / summary.total_cases * 100).toFixed(0)}%) |`);
  lines.push(`| Fail | ${summary.fail_count} (${(summary.fail_count / summary.total_cases * 100).toFixed(0)}%) |`);
  lines.push('');

  // Mean Scores
  lines.push('### Mean Scores');
  lines.push('');
  lines.push(`| Metric | Mean Score | Pass Rate |`);
  lines.push(`|--------|------------|-----------|`);
  lines.push(`| CR | ${summary.mean_scores.CR.toFixed(2)} | ${(summary.pass_rates.CR * 100).toFixed(0)}% |`);
  lines.push(`| AH | ${summary.mean_scores.AH.toFixed(2)} | ${(summary.pass_rates.AH * 100).toFixed(0)}% |`);
  lines.push(`| AC | ${summary.mean_scores.AC.toFixed(2)} | ${(summary.pass_rates.AC * 100).toFixed(0)}% |`);
  lines.push(`| **Composite** | **${summary.mean_scores.composite.toFixed(2)}** | - |`);
  lines.push('');

  // Per-Case Results
  lines.push('## Per-Case Results');
  lines.push('');
  lines.push(`| Test ID | Archetype | CR | AH | AC | Label |`);
  lines.push(`|---------|-----------|----|----|----|----- |`);

  for (const sc of results) {
    const label = sc.label === 'Pass' ? '**PASS**' :
                  sc.label === 'Review' ? '*REVIEW*' : '~~FAIL~~';
    lines.push(`| ${sc.test_id} | ${sc.archetype || 'Unknown'} | ${sc.scores.CR.score.toFixed(2)} | ${sc.scores.AH.score.toFixed(2)} | ${sc.scores.AC.score.toFixed(2)} | ${label} |`);
  }
  lines.push('');

  // By Archetype
  if (Object.keys(by_archetype).length > 0) {
    lines.push('## By Archetype');
    lines.push('');
    lines.push(`| Archetype | Count | Mean CR | Mean AH | Mean AC | Pass Rate |`);
    lines.push(`|-----------|-------|---------|---------|---------|-----------|`);

    for (const [archetype, stats] of Object.entries(by_archetype)) {
      lines.push(`| ${archetype} | ${stats.count} | ${stats.mean_CR.toFixed(2)} | ${stats.mean_AH.toFixed(2)} | ${stats.mean_AC.toFixed(2)} | ${(stats.pass_rate * 100).toFixed(0)}% |`);
    }
    lines.push('');
  }

  // Failure Analysis
  lines.push('## Failure Analysis');
  lines.push('');

  if (failure_analysis.common_CR_misses.length > 0) {
    lines.push('### Common CR Misses');
    lines.push('');
    for (const miss of failure_analysis.common_CR_misses) {
      lines.push(`- "${miss.signal}" (${miss.count} cases)`);
    }
    lines.push('');
  }

  if (failure_analysis.common_AH_violations.length > 0) {
    lines.push('### Common AH Violations');
    lines.push('');
    for (const viol of failure_analysis.common_AH_violations) {
      lines.push(`- "${viol.term}" (${viol.count} cases)`);
    }
    lines.push('');
  }

  if (failure_analysis.common_AC_misses.length > 0) {
    lines.push('### Common AC Misses');
    lines.push('');
    for (const miss of failure_analysis.common_AC_misses) {
      lines.push(`- "${miss.phrase}" (${miss.count} cases)`);
    }
    lines.push('');
  }

  if (failure_analysis.worst_performers.length > 0) {
    lines.push('### Worst Performers');
    lines.push('');
    for (const wp of failure_analysis.worst_performers.slice(0, 5)) {
      lines.push(`- **${wp.test_id}** (composite: ${wp.composite.toFixed(2)}, label: ${wp.label})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// File Writers
// ============================================

export async function writeReport(
  report: SAFEv0BatchReport,
  outputPath: string,
  format: 'json' | 'markdown'
): Promise<void> {
  const content = format === 'json' ? formatJSON(report) : formatMarkdown(report);

  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, 'utf-8');
}

export function printReport(
  report: SAFEv0BatchReport,
  format: 'console' | 'json' | 'markdown',
  verbose: boolean = false,
  strictAH: boolean = false
): void {
  let output: string;
  switch (format) {
    case 'console':
      output = formatConsole(report, verbose, strictAH);
      break;
    case 'json':
      output = formatJSON(report);
      break;
    case 'markdown':
      output = formatMarkdown(report);
      break;
  }
  console.log(output);
}
