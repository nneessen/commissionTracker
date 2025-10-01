# Performance Analysis & Optimization

This directory contains performance analyses and benchmarks for critical services.

## Available Analyses

### UserService Performance Analysis
**File:** `userService-performance-analysis.md`

Comprehensive analysis of the `userService` with identified bottlenecks and optimization recommendations.

**Key Findings:**
- 🔴 3 critical performance bottlenecks identified
- 🟡 2 moderate issues found
- ✅ 65% performance improvement possible
- 📉 50% reduction in database queries achievable

**Quick Stats:**
- Before: ~2.45s total, 7-10 queries per session
- After: ~0.855s total, 3-4 queries per session

---

## Running Benchmarks

### UserService Benchmark

```bash
# Make sure you're logged in first
npm run dev  # In another terminal

# Run the benchmark
npx tsx scripts/benchmark-userService.ts
```

**What it tests:**
- ✅ getCurrentUser() performance
- ✅ getUserById() latency
- ✅ getAllUsers() scalability
- ✅ getUserContractLevel() efficiency
- ✅ Cache effectiveness
- ✅ Concurrent request handling

**Expected output:**
```
🚀 UserService Performance Benchmark
====================================

⏰ Started at: 2025-10-01T14:30:00.000Z
✅ Authenticated as: test@example.com

🔄 Running: getCurrentUser() (10 iterations)
  ✅ Avg: 245.32ms
  📊 Min: 198.45ms | Max: 312.67ms
  ✔️  Success rate: 100.0%

📦 Testing cache effectiveness...
  1st call (cold): 287.54ms
  2nd call (warm): 12.34ms
  3rd call (warm): 8.92ms
  📈 Cache speedup: 95.7%

📊 BENCHMARK SUMMARY
====================================
Performance Ranking (slowest to fastest):

🐌 1. getAllUsers()
   Avg: 823.45ms | Range: 756.32-901.23ms
   Success: 100.0% (3 iterations)

⚡ 2. updateUser()
   Avg: 567.89ms | Range: 523.12-612.45ms
   Success: 100.0% (3 iterations)

🚀 3. getCurrentUser()
   Avg: 245.32ms | Range: 198.45-312.67ms
   Success: 100.0% (10 iterations)
```

---

## Implementing Optimizations

### Quick Start (5 minutes)

1. **Review the analysis:**
   ```bash
   cat docs/performance/userService-performance-analysis.md
   ```

2. **Check out the optimized version:**
   ```bash
   cat src/services/settings/userService.optimized.ts
   ```

3. **Compare implementations:**
   ```bash
   diff src/services/settings/userService.ts \
        src/services/settings/userService.optimized.ts
   ```

### Phase 1: Quick Wins (1-2 hours)

**Estimated improvement:** 40%

1. **Expose public mapper method**
   ```typescript
   // Add to userService.ts
   public mapAuthUserToUser(supabaseUser: any): User {
     return this.mapSupabaseUserToUser(supabaseUser);
   }
   ```

2. **Update AuthContext** (src/contexts/AuthContext.tsx)
   ```typescript
   // Before:
   const fullUser = await userService.getUserById(session.user.id);

   // After:
   const fullUser = userService.mapAuthUserToUser(session.user);
   ```

3. **Optimize getUserContractLevel**
   ```typescript
   // Only fetch required field
   .select('contract_comp_level')
   ```

4. **Test changes:**
   ```bash
   npm run test
   npm run dev  # Manual testing
   ```

### Phase 2: Medium Effort (2-3 hours)

**Estimated improvement:** 60%

5. **Add caching to getCurrentUser**
   - Implement in-memory cache
   - 5-minute TTL
   - Clear on sign out

6. **Optimize updateUser**
   - Remove double query
   - Map from auth user directly
   - Update cache

7. **Test thoroughly:**
   ```bash
   npm run test
   npx tsx scripts/benchmark-userService.ts
   ```

### Phase 3: Full Optimization (4-6 hours)

**Estimated improvement:** 65%

8. **Add pagination to getAllUsers**
   - Implement page/pageSize params
   - Add search functionality
   - Keep legacy method for compatibility

9. **Add performance monitoring**
   - Implement `withTiming` wrapper
   - Log slow queries (> 500ms)
   - Set up alerts

10. **Load testing:**
    ```bash
    # Run benchmark with realistic data
    npx tsx scripts/benchmark-userService.ts
    ```

---

## Performance Targets

### Before Optimization

| Operation | Time | Queries |
|-----------|------|---------|
| Sign in | 500ms | 2 |
| Token refresh | 300ms | 1 |
| Update profile | 600ms | 2 |
| Get contract level | 250ms | 1 |
| Get all users (100) | 800ms | 1 |

### After Optimization

| Operation | Time | Queries |
|-----------|------|---------|
| Sign in | 200ms | 1 |
| Token refresh | 5ms | 0 |
| Update profile | 300ms | 1 |
| Get contract level | 150ms | 1 |
| Get all users (50) | 200ms | 1 |

**Overall:** 65% faster, 50% fewer queries

---

## Monitoring

### Log Slow Queries

```typescript
// Already implemented in optimized version
private async withTiming<T>(operation: string, fn: () => Promise<T>) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (duration > 500) {
    logger.warn(`UserService.${operation} took ${duration}ms (SLOW)`);
  }

  return result;
}
```

### Set Up Alerts

Configure alerts for:
- Query time > 500ms (warn)
- Query time > 1000ms (error)
- Cache hit rate < 70% (warn)
- Failed queries > 1% (error)

### Performance Dashboard

Track these metrics:
- Average query time per operation
- Cache hit rate
- Concurrent request performance
- Error rates
- P95 and P99 latencies

---

## Testing

### Unit Tests

Create: `src/services/settings/__tests__/userService.performance.test.ts`

```typescript
describe('UserService Performance', () => {
  it('should cache getCurrentUser() calls', async () => {
    const spy = vi.spyOn(supabase.auth, 'getUser');

    await userService.getCurrentUser();
    await userService.getCurrentUser();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should only fetch required fields', async () => {
    const spy = vi.spyOn(supabase, 'from');

    await userService.getUserContractLevel('user-id');

    expect(selectCall[0]).toBe('contract_comp_level');
  });
});
```

### Integration Tests

```bash
npm run test:integration
```

### Load Tests

```bash
npx tsx scripts/benchmark-userService.ts
```

---

## Rollback Plan

If optimizations cause issues:

1. **Revert code changes:**
   ```bash
   git checkout HEAD -- src/services/settings/userService.ts
   git checkout HEAD -- src/contexts/AuthContext.tsx
   ```

2. **Clear any cached data:**
   ```typescript
   userService.clearCache();
   ```

3. **Verify functionality:**
   ```bash
   npm run test
   npm run dev
   ```

---

## Success Metrics

✅ **Phase 1 Complete When:**
- Auth flow 40% faster
- Zero redundant getUserById calls
- All tests pass

✅ **Phase 2 Complete When:**
- Auth flow 60% faster
- Cache hit rate > 70%
- Update operations 50% faster

✅ **Phase 3 Complete When:**
- Overall 65% improvement
- 50% fewer database queries
- Pagination working smoothly
- Load tests under target times

---

## Next Steps

1. **Review analysis:** Read `userService-performance-analysis.md`
2. **Run baseline benchmark:** `npx tsx scripts/benchmark-userService.ts`
3. **Implement Phase 1:** Quick wins (1-2 hours)
4. **Measure improvements:** Run benchmark again
5. **Continue to Phase 2 & 3** based on results

---

## Resources

- **Analysis:** `userService-performance-analysis.md`
- **Benchmark Script:** `scripts/benchmark-userService.ts`
- **Optimized Code:** `src/services/settings/userService.optimized.ts`
- **Migration Guide:** See comments in optimized file

---

## Questions?

If you need help implementing these optimizations:
1. Review the detailed analysis
2. Check the optimized implementation
3. Run the benchmark to establish baseline
4. Start with Phase 1 quick wins

**Remember:** Measure before and after each phase to validate improvements!
