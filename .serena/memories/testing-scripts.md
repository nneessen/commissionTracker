# Testing Scripts for Commission Tracker

**Last Updated**: 2025-11-21

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

## Build Validation Script

**Location**: `scripts/test-build.sh`

**Purpose**: Comprehensive build validation with user-friendly output and instructions.

**Created**: 2025-11-21

### What it tests:
1. TypeScript compilation (checks for TS errors)
2. Development server startup
3. Process health check

### Usage:
```bash
./scripts/test-build.sh
```

### Features:
- Colored output for easy reading
- Clear error reporting
- Instructions for accessing the app
- Troubleshooting steps for admin approval issues
- Automatic cleanup of log files

### When to run:
- After fixing TypeScript errors
- Before deploying to production
- After major refactoring
- When troubleshooting build issues

### Success indicators:
- Green checkmarks for all tests
- Clear instructions for app access
- No TypeScript compilation errors

### Special instructions for admin approval issues:
If you encounter the "pending approval" screen as admin:
1. Navigate to `/admin/auth-diagnostic`
2. Use the diagnostic tools to clear storage
3. Sign out and sign back in