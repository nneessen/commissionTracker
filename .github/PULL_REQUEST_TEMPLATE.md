# Pull Request

## Summary

Provide a short description of the change.

## Checklist (ALL REQUIRED)

- [ ] I ran `npm run quick-check` locally (type-check + tests).
- [ ] I ran `npm run build` locally and confirmed zero TypeScript errors.
- [ ] I verified no mock/test imports exist in production code.
- [ ] If database schema or migrations changed:
  - [ ] Migration file created using `YYYYMMDD_NNN_description.sql`
  - [ ] Ran: `npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts`
  - [ ] Updated code to satisfy new types
- [ ] UI was visually verified in dev environment (no runtime errors).
- [ ] Naming conventions followed: PascalCase components, kebab-case files, camelCase functions.
- [ ] No placeholders or fake data remain.

## Files Changed

List relevant files.

## DB Impact (if applicable)

Describe tables, fields, or relations affected.

## Testing

Describe test coverage or added tests.

## Edge Cases Covered

List edge cases validated for this PR.

## Additional Notes

Optional.
