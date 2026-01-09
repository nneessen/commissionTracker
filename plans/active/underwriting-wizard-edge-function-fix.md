# Underwriting Wizard Edge Function Fix

## Problem
The `underwriting-ai-analyze` edge function returns 500 error when trying to get recommendations.

## Error
```
FunctionsHttpError: Edge Function returned a non-2xx status code
at Object.analyzeClient [as mutationFn] (useUnderwritingAnalysis.ts:29:11)
```

## Diagnosis Steps

### 1. Check Edge Function Logs
```bash
npx supabase functions logs underwriting-ai-analyze --project-ref pcyaqwodnyrpkaiojnpz
```

### 2. Verify Environment Variables
The function requires:
- `SUPABASE_URL` (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)
- `ANTHROPIC_API_KEY` (must be manually set)

Check if ANTHROPIC_API_KEY is set:
```bash
npx supabase secrets list --project-ref pcyaqwodnyrpkaiojnpz
```

If missing, set it:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref pcyaqwodnyrpkaiojnpz
```

### 3. Check Function Deployment
Verify the function is deployed:
```bash
npx supabase functions list --project-ref pcyaqwodnyrpkaiojnpz
```

If not deployed or outdated, deploy:
```bash
npx supabase functions deploy underwriting-ai-analyze --project-ref pcyaqwodnyrpkaiojnpz
```

### 4. Test Function Locally
```bash
npx supabase functions serve underwriting-ai-analyze --env-file .env.local
```

### 5. Common Issues to Check

#### A. Anthropic SDK Import
The function uses:
```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";
```
Verify this import works in Deno environment.

#### B. Database Queries
Check if carriers table has data and RLS allows access:
```sql
SELECT id, name, is_active FROM carriers WHERE is_active = true LIMIT 5;
```

#### C. Request Payload
Verify the client is sending correct payload structure:
```typescript
interface AnalysisRequest {
  client: { age, gender, state, bmi }
  health: { conditions, tobacco, medications }
  coverage: { faceAmount, productTypes }
  decisionTreeId?: string
  imoId?: string
}
```

## Files to Review
- `supabase/functions/underwriting-ai-analyze/index.ts` - Main function
- `src/features/underwriting/hooks/useUnderwritingAnalysis.ts` - Client hook
- `src/services/underwriting/underwritingService.ts` - Service layer

## Fix Priority
1. **Check logs first** - Will reveal actual error
2. **Verify ANTHROPIC_API_KEY** - Most likely cause of 500
3. **Redeploy function** - If code was updated but not deployed
4. **Check database data** - Ensure carriers exist

## Next Session Instructions
1. Run `npx supabase functions logs underwriting-ai-analyze` to see actual error
2. If ANTHROPIC_API_KEY missing, set it via secrets
3. If function code issue, fix and redeploy
4. Test again in UI
