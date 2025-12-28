import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Domain Scaffolder Tool
 * 
 * Purpose: Initialize a new domain workspace in domains_registry by copying 
 * "Gold Standard" templates (e.g. from Orthopedics).
 * 
 * Usage:
 *   npx ts-node tools/scaffold-domain.ts --domain Cardiology --source Orthopedics
 */

const program = new Command();

program
  .name('scaffolder')
  .description('Scaffold a new domain workspace from templates')
  .version('1.0.0')
  .requiredOption('-d, --domain <name>', 'Name of the new domain (e.g. Cardiology)')
  .option('-s, --source <name>', 'Source domain to copy templates from', 'Orthopedics')
  .option('-f, --force', 'Force overwrite if domain already exists', false)
  .action(async (options) => {
    const { domain, source, force } = options;
    const baseRegistry = path.join(__dirname, '../domains_registry/USNWR');
    const sourceDir = path.join(baseRegistry, source, '_shared/prompts');
    const targetDir = path.join(baseRegistry, domain, '_shared/prompts');

    console.log(`\n🚀 Scaffolding new domain: ${domain}`);
    console.log(`   Source template: ${source}`);

    // 1. Validate Source
    if (!fs.existsSync(sourceDir)) {
      console.error(`\n❌ Error: Source templates not found at ${sourceDir}`);
      process.exit(1);
    }

    // 2. Check Target
    if (fs.existsSync(targetDir) && !force) {
      console.error(`\n❌ Error: Target domain already exists at ${targetDir}`);
      console.log('   Use --force to overwrite.');
      process.exit(1);
    }

    // 3. Create Target Structure
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`   ✅ Created directory: ${targetDir}`);
    } catch (err) {
      console.error(`\n❌ Error creating directory: ${err}`);
      process.exit(1);
    }

    // 4. Copy and Transform Files
    const files = fs.readdirSync(sourceDir);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.md')) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        let content = fs.readFileSync(sourcePath, 'utf8');
        
        // Simple transformation: Replace source domain name with target
        // This handles cases like "ROLE: Pediatric Orthopedics..." -> "ROLE: Pediatric Cardiology..."
        const transformedContent = content.split(source).join(domain);
        
        fs.writeFileSync(targetPath, transformedContent);
        console.log(`   📄 Copied: ${file}`);
        count++;
      }
    }

    console.log(`\n🎉 Successfully scaffolded ${count} prompts for ${domain}!`);
    console.log(`\nNext Steps:`);
    console.log(`1. Review and refine the prompts in: ${targetDir}`);
    console.log(`2. Run planner generate --domain ${domain} to create v0 plan.`);
  });

program.parse(process.argv);
