#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/fix-eslint.js
// Script to automatically fix ESLint errors

const fs = require('fs');
const { execSync } = require('child_process');

// Get all ESLint errors
const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).toString();

// Parse errors by file
const fileErrors = new Map();
const lines = lintOutput.split('\n');

let currentFile = null;
for (const line of lines) {
  if (line.startsWith('/home/')) {
    currentFile = line.trim();
    if (!fileErrors.has(currentFile)) {
      fileErrors.set(currentFile, []);
    }
  } else if (currentFile && line.includes('error') && line.includes('@typescript-eslint/no-unused-vars')) {
    const match = line.match(/(\d+):(\d+)\s+error\s+'([^']+)' is (assigned a value but never used|defined but never used)/);
    if (match) {
      const [, lineNum, col, varName, errorType] = match;
      fileErrors.get(currentFile).push({ lineNum: parseInt(lineNum), col: parseInt(col), varName, errorType });
    }
  }
}

console.log(`Found ${fileErrors.size} files with unused variable errors`);

// Fix each file
for (const [filePath, errors] of fileErrors.entries()) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Sort errors by line number (descending) to avoid line number shifts
  errors.sort((a, b) => b.lineNum - a.lineNum);

  for (const error of errors) {
    const lineIdx = error.lineNum - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    const line = lines[lineIdx];
    const varName = error.varName;

    // Skip if already prefixed
    if (varName.startsWith('_')) continue;

    // Different patterns for different types of unused vars
    if (line.includes(`import `)) {
      // Import statement: import { foo, bar } or import foo
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    } else if (line.includes('const {') || line.includes('let {')) {
      // Destructuring: const { foo, bar } = obj
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    } else if (line.includes('const [') || line.includes('let [')) {
      // Array destructuring: const [foo, bar] = arr
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    } else if (line.includes(') =>') || line.includes(') {')) {
      // Function parameter
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    } else if (line.includes('function ') || line.includes('.map(') || line.includes('.filter(') || line.includes('.forEach(')) {
      // Function parameter in callback
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    } else {
      // General case: const foo = or let foo =
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`Fixed ${errors.length} errors in ${filePath.replace('/home/nneessen/projects/commissionTracker/', '')}`);
}

console.log('\nDone! Run npm run lint again to check remaining errors.');
