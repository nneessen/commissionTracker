#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixes = [
  // expenseStatsConfig.ts
  {
    file: 'src/features/expenses/config/expenseStatsConfig.ts',
    replacements: [
      { from: 'timePeriod: TimePeriod', to: '_timePeriod: TimePeriod' }
    ]
  },
  // AgentTable.tsx
  {
    file: 'src/features/hierarchy/components/AgentTable.tsx',
    replacements: [
      { from: 'import {formatCurrency, formatDate, formatPercent}', to: 'import {formatCurrency, formatDate}' },
      { from: 'import {policyService} from', to: '// import {policyService} from' },
      { from: 'import {commissionService} from', to: '// import {commissionService} from' }
    ]
  },
  // HierarchyTree.tsx
  {
    file: 'src/features/hierarchy/components/HierarchyTree.tsx',
    replacements: [
      { from: 'User, ChevronDown, ChevronRight, Mail', to: 'User, ChevronDown, ChevronRight' }
    ]
  },
  // OverrideDashboard.tsx
  {
    file: 'src/features/hierarchy/components/OverrideDashboard.tsx',
    replacements: [
      { from: 'DollarSign, Clock, TrendingUp, CheckCircle, AlertCircle', to: 'DollarSign, Clock, TrendingUp, CheckCircle' }
    ]
  },
  // SentInvitationsCard.tsx
  {
    file: 'src/features/hierarchy/components/SentInvitationsCard.tsx',
    replacements: [
      { from: 'Mail, Clock, XCircle, Ban', to: 'Mail, Clock, XCircle' }
    ]
  },
  // PipelineAdminPage.tsx
  {
    file: 'src/features/recruiting/admin/PipelineAdminPage.tsx',
    replacements: [
      { from: "import {Card} from '@/components/ui/card'", to: "// import {Card} from '@/components/ui/card'" },
      { from: 'import {ArrowLeft, Plus}', to: 'import {ArrowLeft}' }
    ]
  },
  // PipelineTemplatesList.tsx
  {
    file: 'src/features/recruiting/admin/PipelineTemplatesList.tsx',
    replacements: [
      { from: 'Plus, Star, Edit2, Trash2, Copy', to: 'Plus, Star, Edit2, Trash2' },
      { from: 'import type {PipelineTemplate}', to: '// import type {PipelineTemplate}' }
    ]
  },
  // ComposeEmailDialog.tsx
  {
    file: 'src/features/recruiting/components/ComposeEmailDialog.tsx',
    replacements: [
      { from: 'senderId,', to: '_senderId,' }
    ]
  },
  // PhaseChecklist.tsx
  {
    file: 'src/features/recruiting/components/PhaseChecklist.tsx',
    replacements: [
      { from: 'onPhaseComplete,', to: '_onPhaseComplete,' }
    ]
  },
  // PhaseTimeline.tsx
  {
    file: 'src/features/recruiting/components/PhaseTimeline.tsx',
    replacements: [
      { from: 'import {PHASE_PROGRESS_ICONS}', to: '// import {PHASE_PROGRESS_ICONS}' },
      { from: "import {Card} from '@/components/ui/card'", to: "// import {Card} from '@/components/ui/card'" }
    ]
  },
  // usePipeline.ts
  {
    file: 'src/features/recruiting/hooks/usePipeline.ts',
    replacements: [
      { from: '{ phaseId, templateId }', to: '{ phaseId, templateId: _templateId }' },
      { from: '{ itemId, phaseId }', to: '{ itemId, phaseId: _phaseId }' }
    ]
  },
  // useRecruitDocuments.ts
  {
    file: 'src/features/recruiting/hooks/useRecruitDocuments.ts',
    replacements: [
      { from: 'async ({ id, storagePath, recruitId }', to: 'async ({ id, storagePath, recruitId: _recruitId }' },
      { from: 'async ({ id, status, approvalNotes, recruitId }', to: 'async ({ id, status, approvalNotes, recruitId: _recruitId }' }
    ]
  },
  // MyRecruitingPipeline.tsx
  {
    file: 'src/features/recruiting/pages/MyRecruitingPipeline.tsx',
    replacements: [
      { from: 'Upload, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Circle, Inbox', to: 'Upload, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Circle' }
    ]
  }
];

console.log('Fixing ESLint errors...\n');

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
      modified = true;
      console.log(`✓ Fixed: ${from} → ${to}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${file}\n`);
  } else {
    console.log(`⚠️  No changes needed for ${file}\n`);
  }
});

console.log('Done fixing ESLint errors!');