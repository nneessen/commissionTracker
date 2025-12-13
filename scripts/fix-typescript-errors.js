#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/fix-typescript-errors.js

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixFile(filePath, fixes) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    for (const fix of fixes) {
      if (fix.type === 'add_import') {
        // Check if import already exists
        if (!content.includes(fix.import)) {
          // Find the last import line
          const importRegex = /^import .* from ['"].*['"];?$/gm;
          let lastImportIndex = -1;
          let match;

          while ((match = importRegex.exec(content)) !== null) {
            lastImportIndex = match.index + match[0].length;
          }

          if (lastImportIndex > -1) {
            content = content.slice(0, lastImportIndex) + '\n' + fix.import + content.slice(lastImportIndex);
            modified = true;
            console.log(`  ✓ Added import to ${path.basename(filePath)}`);
          }
        }
      } else if (fix.type === 'replace') {
        if (content.includes(fix.search)) {
          content = content.replace(new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.replace);
          modified = true;
          console.log(`  ✓ Replaced "${fix.search}" with "${fix.replace}" in ${path.basename(filePath)}`);
        }
      } else if (fix.type === 'prefix_unused') {
        // Add underscore to unused variables
        const regex = new RegExp(`\\b${fix.variable}\\b`, 'g');
        if (content.match(regex)) {
          content = content.replace(regex, `_${fix.variable}`);
          modified = true;
          console.log(`  ✓ Prefixed unused variable "${fix.variable}" in ${path.basename(filePath)}`);
        }
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing TypeScript errors...\n');

  const fixes = [
    // Fix missing icon imports in hierarchy components
    {
      file: 'src/features/hierarchy/components/HierarchyTree.tsx',
      fixes: [
        { type: 'add_import', import: "import { ChevronDown, ChevronRight, User } from 'lucide-react';" }
      ]
    },
    {
      file: 'src/features/hierarchy/components/OverrideDashboard.tsx',
      fixes: [
        { type: 'add_import', import: "import { DollarSign, Clock, TrendingUp, CheckCircle } from 'lucide-react';" }
      ]
    },
    {
      file: 'src/features/hierarchy/components/SentInvitationsCard.tsx',
      fixes: [
        { type: 'add_import', import: "import { Mail, Clock, XCircle } from 'lucide-react';" }
      ]
    },

    // Fix missing icons in recruiting admin
    {
      file: 'src/features/recruiting/admin/PipelineAdminPage.tsx',
      fixes: [
        { type: 'add_import', import: "import { ArrowLeft } from 'lucide-react';" }
      ]
    },
    {
      file: 'src/features/recruiting/admin/PipelineTemplatesList.tsx',
      fixes: [
        { type: 'add_import', import: "import { Plus, Star, Edit2, Trash2 } from 'lucide-react';" }
      ]
    },

    // Fix font picker icons
    {
      file: 'src/features/email/components/block-builder/FontPicker.tsx',
      fixes: [
        { type: 'add_import', import: "import { ChevronDown, Check } from 'lucide-react';" }
      ]
    },

    // Fix incorrect imports
    {
      file: 'src/features/recruiting/components/AddRecruitDialog.tsx',
      fixes: [
        { type: 'replace', search: '_zodValidator', replace: 'zodValidator' }
      ]
    },
    {
      file: 'src/features/auth/Login.tsx',
      fixes: [
        { type: 'replace', search: 'useAuthValidation', replace: '// useAuthValidation' }
      ]
    },
    {
      file: 'src/features/hierarchy/components/AgentTable.tsx',
      fixes: [
        { type: 'replace', search: '_formatPercent', replace: 'formatPercent' }
      ]
    },

    // Fix unused variables
    {
      file: 'src/features/analytics/components/CommissionPipeline.tsx',
      fixes: [
        { type: 'replace', search: 'totalPaid', replace: '_totalPaid' }
      ]
    },
    {
      file: 'src/features/expenses/config/expenseStatsConfig.ts',
      fixes: [
        { type: 'replace', search: '_timePeriod', replace: 'timePeriod' }
      ]
    },
    {
      file: 'src/components/permissions/PermissionGate.tsx',
      fixes: [
        { type: 'replace', search: '_can', replace: 'can' }
      ]
    },
    {
      file: 'src/features/admin/components/AuthDiagnostic.tsx',
      fixes: [
        { type: 'replace', search: '_error', replace: 'error' }
      ]
    },

    // Fix missing type imports
    {
      file: 'src/features/email/components/block-builder/BlockStylePanel.tsx',
      fixes: [
        { type: 'add_import', import: "import type { EmailBlock, EmailBlockStyles } from '@/types/email.types';" }
      ]
    },
    {
      file: 'src/features/expenses/context/ExpenseDateContext.tsx',
      fixes: [
        { type: 'add_import', import: "import type { AdvancedTimePeriod } from '@/types/expense.types';" },
        { type: 'add_import', import: "import { getAdvancedDateRange } from '@/lib/date';" }
      ]
    },
    {
      file: 'src/features/recruiting/components/PhaseTimeline.tsx',
      fixes: [
        { type: 'add_import', import: "import type { RecruitPhaseProgress, PipelinePhase } from '@/types/recruiting.types';" }
      ]
    },

    // Fix hook variable names
    {
      file: 'src/features/recruiting/hooks/usePipeline.ts',
      fixes: [
        { type: 'replace', search: '_templateId', replace: 'templateId' },
        { type: 'replace', search: '_phaseId', replace: 'phaseId' }
      ]
    },
    {
      file: 'src/features/recruiting/hooks/useRecruitDocuments.ts',
      fixes: [
        { type: 'replace', search: '_recruitId', replace: 'recruitId' }
      ]
    },
    {
      file: 'src/features/recruiting/components/ComposeEmailDialog.tsx',
      fixes: [
        { type: 'replace', search: '_senderId', replace: 'senderId' }
      ]
    },
    {
      file: 'src/features/recruiting/components/PhaseChecklist.tsx',
      fixes: [
        { type: 'replace', search: '_onPhaseComplete', replace: 'onPhaseComplete' }
      ]
    }
  ];

  let totalFixed = 0;
  let totalFailed = 0;

  const projectRoot = path.resolve(__dirname, '..');

  for (const fixConfig of fixes) {
    const filePath = path.join(projectRoot, fixConfig.file);
    console.log(`Fixing ${fixConfig.file}...`);
    const success = await fixFile(filePath, fixConfig.fixes);
    if (success) {
      totalFixed++;
    } else {
      totalFailed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✓ Fixed: ${totalFixed} files`);
  if (totalFailed > 0) {
    console.log(`  ✗ Failed: ${totalFailed} files`);
  }

  console.log('\n🔍 Running type check...\n');

  exec('npm run typecheck', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ TypeScript errors remaining:');
      console.log(stderr || stdout);
      process.exit(1);
    } else {
      console.log('✅ All TypeScript errors fixed!');
      process.exit(0);
    }
  });
}

main().catch(console.error);