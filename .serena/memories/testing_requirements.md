# Testing Requirements After Code Changes

## Mandatory Testing Protocol

After ANY code change, you MUST:

1. **Run the development server** to verify the app loads without errors
2. **Check for build/compilation errors** before considering the task complete
3. **Create test scripts if they don't exist** and store in `/scripts` directory

## Required Scripts

### Development Test Script
**Location:** `/scripts/test-dev.sh`
```bash
#!/bin/bash
# Test if dev server starts without errors
npm run dev &
DEV_PID=$!
sleep 5
if kill -0 $DEV_PID 2>/dev/null; then
  echo "✓ Dev server started successfully"
  kill $DEV_PID
  exit 0
else
  echo "✗ Dev server failed to start"
  exit 1
fi
```

### Build Test Script
**Location:** `/scripts/test-build.sh`
```bash
#!/bin/bash
# Test if project builds successfully
npm run build
if [ $? -eq 0 ]; then
  echo "✓ Build completed successfully"
  exit 0
else
  echo "✗ Build failed"
  exit 1
fi
```

## Testing Workflow

1. Make code changes
2. Run `npm run typecheck` (if TypeScript project)
3. Run `npm run build` or dev server test
4. Verify no runtime errors
5. ONLY THEN mark task as complete

**CRITICAL:** Never mark a code change complete without running these verification steps.
