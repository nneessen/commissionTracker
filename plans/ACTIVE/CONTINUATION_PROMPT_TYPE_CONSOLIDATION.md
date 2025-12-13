# Continuation Prompt: Type Architecture Consolidation

**Start a new Claude Code conversation with this prompt:**

---

I need you to execute the Type Architecture Consolidation Plan located at `plans/ACTIVE/type-consolidation-plan.md`.

## Context

The `src/types/` directory is severely disorganized with critical architectural issues:

1. **UserProfile defined in 3 places** with different shapes:
   - `src/types/hierarchy.types.ts`
   - `src/types/messaging.types.ts`
   - `src/services/users/userService.ts` (WRONG LOCATION!)

2. **database.types.ts barely used**: 162KB auto-generated from Supabase, only imported 17 times despite being source of truth

3. **30 type files with massive duplication**: Should be ~15-18 files

4. **No database-first pattern**: Most types manually defined instead of extending from database.types.ts

5. **Deprecated fields polluting interfaces**: 40% of Commission interface is legacy cruft

## Your Task

Read `plans/ACTIVE/type-consolidation-plan.md` and execute **Phase 1: Audit & Document**.

### Phase 1 Steps:

1. **Create audit spreadsheet** (save as `docs/type-audit.md`):
   ```markdown
   | Type File | Database Table | Line Count | Uses DB Types? | Duplicates? | Notes |
   |-----------|---------------|------------|----------------|-------------|-------|
   | user.types.ts | user_profiles | 103 | ❌ No | - | Manual User interface |
   | hierarchy.types.ts | user_profiles | 244 | ❌ No | UserProfile (dup!) | - |
   | ... | ... | ... | ... | ... | ... |
   ```

2. **Document all UserProfile definitions**:
   - Find every `export interface UserProfile` in codebase
   - Compare field differences between the 3 definitions
   - Document which files import from which source

3. **Count current imports**:
   ```bash
   grep -r "from.*database.types" src/ --include="*.ts" --include="*.tsx" | wc -l
   grep -r "from.*user.types" src/ --include="*.ts" --include="*.tsx" | wc -l
   grep -r "from.*policy.types" src/ --include="*.ts" --include="*.tsx" | wc -l
   # Document all counts
   ```

4. **Create backup branch**:
   ```bash
   git checkout -b type-consolidation-backup
   git push origin type-consolidation-backup
   git checkout main
   git checkout -b type-consolidation-phase1
   ```

5. **Document findings** in `docs/type-audit-findings.md`:
   - List ALL duplicate type definitions
   - List files that should be merged
   - List files that should be deleted
   - Recommend consolidation strategy

## Success Criteria for Phase 1

- [ ] `docs/type-audit.md` created with complete mapping
- [ ] All UserProfile definitions documented with field comparisons
- [ ] Import counts documented
- [ ] Backup branch created and pushed
- [ ] Findings document created with consolidation recommendations
- [ ] Ready to proceed to Phase 2

## Important Rules

1. **Read the full plan first**: `plans/ACTIVE/type-consolidation-plan.md`
2. **Do NOT make code changes yet**: Phase 1 is audit only
3. **Use database.types.ts as source of truth**: Check actual DB schema
4. **Follow CLAUDE.md project rules**: No .md files in root, etc.
5. **Document everything**: This is a complex refactor requiring clear tracking

## Database Connection

Use existing Supabase connection from project. Check:
```bash
# Verify database.types.ts is up to date
npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts

# Compare with current version
git diff src/types/database.types.ts
```

## After Phase 1

When Phase 1 is complete:
1. Commit findings to `type-consolidation-phase1` branch
2. Create PR for review
3. Await approval before proceeding to Phase 2
4. Update `plans/ACTIVE/type-consolidation-plan.md` to mark Phase 1 complete

---

**Note**: This is a critical refactor. Take your time with Phase 1 audit. A thorough audit makes Phases 2-8 much safer and faster.

**Estimated time for Phase 1**: 2-4 hours
