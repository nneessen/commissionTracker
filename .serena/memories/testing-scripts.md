# Testing Scripts for Commission Tracker

## App Functionality Test Script

**Location**: `scripts/test-app-runs.sh`

**Purpose**: Verify that the application runs without loading errors after code changes.

**Created**: 2025-11-14

### What it tests:
1. TypeScript compilation (no type errors)
2. Build process completion
3. Dev server startup
4. Server HTTP response

### Usage:
```bash
./scripts/test-app-runs.sh
```

### When to run:
- After any significant code changes
- Before committing to git
- After adding new features or components
- After dependency updates

### Success indicators:
- All TypeScript files compile without errors
- Build completes successfully
- Dev server starts and responds to HTTP requests
- No runtime errors during startup

This script ensures the application remains functional after changes and catches errors early in the development process.