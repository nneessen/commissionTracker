#!/usr/bin/env tsx
/**
 * UserService Performance Benchmark
 *
 * Measures actual performance of userService methods
 * Run with: npx tsx scripts/benchmark-userService.ts
 */

import { performance } from 'perf_hooks';
import { userService } from '../src/services/settings/userService';
import { supabase } from '../src/services/base/supabase';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
}

class UserServiceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark test
   */
  private async runBenchmark(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 10
  ): Promise<BenchmarkResult> {
    console.log(`\n🔄 Running: ${name} (${iterations} iterations)`);

    const times: number[] = [];
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await operation();
        const duration = performance.now() - start;
        times.push(duration);
        successes++;
      } catch (error) {
        const duration = performance.now() - start;
        times.push(duration);
        console.error(`  ❌ Iteration ${i + 1} failed:`, error);
      }
    }

    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const successRate = (successes / iterations) * 100;

    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      successRate,
    };

    this.results.push(result);

    console.log(`  ✅ Avg: ${avgTime.toFixed(2)}ms`);
    console.log(`  📊 Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms`);
    console.log(`  ✔️  Success rate: ${successRate.toFixed(1)}%`);

    return result;
  }

  /**
   * Test 1: getCurrentUser() - Should use auth.getUser()
   */
  async testGetCurrentUser() {
    await this.runBenchmark(
      'getCurrentUser()',
      async () => {
        const user = await userService.getCurrentUser();
        if (!user) throw new Error('No user returned');
      },
      10
    );
  }

  /**
   * Test 2: getUserById() - Database query
   */
  async testGetUserById() {
    // First get a valid user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️  Skipping getUserById - no authenticated user');
      return;
    }

    await this.runBenchmark(
      'getUserById()',
      async () => {
        const result = await userService.getUserById(user.id);
        if (!result) throw new Error('No user returned');
      },
      5
    );
  }

  /**
   * Test 3: getAllUsers() - Large query test
   */
  async testGetAllUsers() {
    await this.runBenchmark(
      'getAllUsers()',
      async () => {
        const users = await userService.getAllUsers();
        console.log(`    Retrieved ${users.length} users`);
      },
      3
    );
  }

  /**
   * Test 4: getUserContractLevel() - Specific field query
   */
  async testGetUserContractLevel() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️  Skipping getUserContractLevel - no authenticated user');
      return;
    }

    await this.runBenchmark(
      'getUserContractLevel()',
      async () => {
        const level = await userService.getUserContractLevel(user.id);
        if (typeof level !== 'number') throw new Error('Invalid contract level');
      },
      10
    );
  }

  /**
   * Test 5: updateUser() - Write operation
   */
  async testUpdateUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️  Skipping updateUser - no authenticated user');
      return;
    }

    await this.runBenchmark(
      'updateUser()',
      async () => {
        const result = await userService.updateUser(user.id, {
          name: `Test User ${Date.now()}`,
          id: user.id,
        });
        if (!result) throw new Error('Update failed');
      },
      3 // Fewer iterations for write operations
    );
  }

  /**
   * Test 6: Cache effectiveness (repeated calls)
   */
  async testCacheEffectiveness() {
    console.log('\n📦 Testing cache effectiveness...');

    const start1 = performance.now();
    await userService.getCurrentUser();
    const firstCallTime = performance.now() - start1;

    const start2 = performance.now();
    await userService.getCurrentUser();
    const secondCallTime = performance.now() - start2;

    const start3 = performance.now();
    await userService.getCurrentUser();
    const thirdCallTime = performance.now() - start3;

    console.log(`  1st call (cold): ${firstCallTime.toFixed(2)}ms`);
    console.log(`  2nd call (warm): ${secondCallTime.toFixed(2)}ms`);
    console.log(`  3rd call (warm): ${thirdCallTime.toFixed(2)}ms`);

    const cacheSpeedup = ((firstCallTime - secondCallTime) / firstCallTime) * 100;
    console.log(`  📈 Cache speedup: ${cacheSpeedup.toFixed(1)}%`);

    if (cacheSpeedup < 10) {
      console.log(`  ⚠️  Warning: Cache not effective (< 10% improvement)`);
    }
  }

  /**
   * Test 7: Concurrent requests
   */
  async testConcurrentRequests() {
    console.log('\n⚡ Testing concurrent requests (10 parallel calls)...');

    const start = performance.now();
    const promises = Array(10)
      .fill(null)
      .map(() => userService.getCurrentUser());

    await Promise.all(promises);
    const totalTime = performance.now() - start;

    console.log(`  Total time (parallel): ${totalTime.toFixed(2)}ms`);
    console.log(`  Average per request: ${(totalTime / 10).toFixed(2)}ms`);

    if (totalTime > 1000) {
      console.log(`  ⚠️  Warning: Parallel requests slow (> 1s)`);
    }
  }

  /**
   * Print summary report
   */
  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(70));

    if (this.results.length === 0) {
      console.log('No results to display');
      return;
    }

    // Sort by average time
    const sorted = [...this.results].sort((a, b) => b.avgTime - a.avgTime);

    console.log('\nPerformance Ranking (slowest to fastest):\n');

    sorted.forEach((result, index) => {
      const emoji = index === 0 ? '🐌' : index === sorted.length - 1 ? '🚀' : '⚡';
      console.log(`${emoji} ${index + 1}. ${result.operation}`);
      console.log(`   Avg: ${result.avgTime.toFixed(2)}ms | Range: ${result.minTime.toFixed(2)}-${result.maxTime.toFixed(2)}ms`);
      console.log(`   Success: ${result.successRate.toFixed(1)}% (${result.iterations} iterations)\n`);
    });

    // Performance thresholds
    console.log('Performance Analysis:\n');
    sorted.forEach((result) => {
      if (result.avgTime > 500) {
        console.log(`❌ ${result.operation}: SLOW (> 500ms) - Needs optimization`);
      } else if (result.avgTime > 300) {
        console.log(`⚠️  ${result.operation}: MODERATE (> 300ms) - Consider optimization`);
      } else if (result.avgTime > 100) {
        console.log(`✅ ${result.operation}: GOOD (< 300ms)`);
      } else {
        console.log(`🎯 ${result.operation}: EXCELLENT (< 100ms)`);
      }
    });

    // Overall stats
    const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const avgOfAvgs = this.results.reduce((sum, r) => sum + r.avgTime, 0) / this.results.length;
    const successRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;

    console.log('\nOverall Statistics:');
    console.log(`  Total operations: ${totalOps}`);
    console.log(`  Average time across all operations: ${avgOfAvgs.toFixed(2)}ms`);
    console.log(`  Overall success rate: ${successRate.toFixed(1)}%`);

    console.log('\n' + '='.repeat(70));
  }

  /**
   * Run all benchmarks
   */
  async runAll() {
    console.log('🚀 UserService Performance Benchmark');
    console.log('====================================\n');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('\n⚠️  WARNING: No authenticated user detected');
        console.log('Some tests will be skipped or may fail');
        console.log('Please login before running benchmarks\n');
      } else {
        console.log(`✅ Authenticated as: ${user.email}\n`);
      }

      // Run read operations
      await this.testGetCurrentUser();
      await this.testGetUserById();
      await this.testGetUserContractLevel();
      await this.testGetAllUsers();

      // Run cache tests
      await this.testCacheEffectiveness();
      await this.testConcurrentRequests();

      // Run write operations (fewer iterations)
      // Commented out by default to avoid modifying data
      // await this.testUpdateUser();

      // Print summary
      this.printSummary();

      console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
      console.log('✅ Benchmark complete!\n');
    } catch (error) {
      console.error('\n❌ Benchmark failed:', error);
      process.exit(1);
    }
  }
}

// Run benchmarks
const benchmark = new UserServiceBenchmark();
benchmark.runAll().catch(console.error);
