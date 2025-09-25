// Comprehensive tests for Circuit Breaker error handling
import { test, expect, type Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  totalRequests: number;
  quotaUsed: number;
  quotaLimit: number;
  resetTime: number;
}

interface MockApiCall {
  endpoint: string;
  shouldFail: boolean;
  delay: number;
  quotaCost: number;
}

declare global {
  interface Window {
    testCircuitBreaker: {
      youtube: CircuitBreakerState;
      appwrite: CircuitBreakerState;
      executeWithBreaker: (service: string, call: MockApiCall) => Promise<any>;
      getState: (service: string) => CircuitBreakerState;
      reset: (service: string) => void;
      simulateQuotaExhaustion: (service: string) => void;
    };
  }
}

class CircuitBreakerTestHelper {
  static async setupCircuitBreaker(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const createInitialState = (): CircuitBreakerState => ({
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        totalRequests: 0,
        quotaUsed: 0,
        quotaLimit: 10000,
        resetTime: 60000 // 1 minute
      });

      window.testCircuitBreaker = {
        youtube: createInitialState(),
        appwrite: createInitialState(),

        async executeWithBreaker(service: string, call: MockApiCall) {
          const state = this[service as keyof typeof this] as CircuitBreakerState;
          if (!state) throw new Error(`Unknown service: ${service}`);

          const startTime = performance.now();
          state.totalRequests++;

          // Check if circuit is open
          if (state.isOpen) {
            const timeSinceLastFailure = Date.now() - state.lastFailureTime;
            if (timeSinceLastFailure < state.resetTime) {
              throw new Error('Circuit breaker is OPEN');
            } else {
              // Half-open: allow one test request
              state.isOpen = false;
              state.failureCount = 0;
            }
          }

          // Check quota limits
          if (state.quotaUsed + call.quotaCost > state.quotaLimit) {
            throw new Error('Quota exceeded');
          }

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, call.delay));

          // Simulate failure
          if (call.shouldFail) {
            state.failureCount++;
            state.lastFailureTime = Date.now();
            
            // Open circuit if too many failures
            if (state.failureCount >= 5) {
              state.isOpen = true;
            }
            
            throw new Error(`API call failed: ${call.endpoint}`);
          }

          // Success
          state.successCount++;
          state.failureCount = Math.max(0, state.failureCount - 1);
          state.quotaUsed += call.quotaCost;

          return {
            success: true,
            endpoint: call.endpoint,
            processingTime: performance.now() - startTime,
            quotaUsed: state.quotaUsed
          };
        },

        getState(service: string) {
          return this[service as keyof typeof this] as CircuitBreakerState;
        },

        reset(service: string) {
          const initialState = createInitialState();
          (this as any)[service] = initialState;
        },

        simulateQuotaExhaustion(service: string) {
          const state = this[service as keyof typeof this] as CircuitBreakerState;
          if (state) {
            state.quotaUsed = state.quotaLimit;
          }
        }
      };
    });
  }

  static async executeApiCall(
    page: Page,
    service: string,
    call: MockApiCall
  ): Promise<any> {
    return await page.evaluate(
      ({ service, call }) => {
        return window.testCircuitBreaker.executeWithBreaker(service, call);
      },
      { service, call }
    );
  }

  static async getCircuitState(page: Page, service: string): Promise<CircuitBreakerState> {
    return await page.evaluate(
      (service) => window.testCircuitBreaker.getState(service),
      service
    );
  }

  static async resetCircuitBreaker(page: Page, service: string): Promise<void> {
    await page.evaluate(
      (service) => window.testCircuitBreaker.reset(service),
      service
    );
  }

  static async simulateQuotaExhaustion(page: Page, service: string): Promise<void> {
    await page.evaluate(
      (service) => window.testCircuitBreaker.simulateQuotaExhaustion(service),
      service
    );
  }

  static createMockApiCall(options: Partial<MockApiCall> = {}): MockApiCall {
    return {
      endpoint: options.endpoint || '/api/test',
      shouldFail: options.shouldFail || false,
      delay: options.delay || 10,
      quotaCost: options.quotaCost || 1
    };
  }
}

test.describe('Circuit Breaker - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await CircuitBreakerTestHelper.setupCircuitBreaker(page);
  });

  test('should start in closed state', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await TestHelper.waitForPageLoad(page);

    const youtubeState = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    const appwriteState = await CircuitBreakerTestHelper.getCircuitState(page, 'appwrite');

    expect(youtubeState.isOpen).toBe(false);
    expect(youtubeState.failureCount).toBe(0);
    expect(youtubeState.successCount).toBe(0);
    expect(youtubeState.totalRequests).toBe(0);

    expect(appwriteState.isOpen).toBe(false);
    expect(appwriteState.failureCount).toBe(0);
    expect(appwriteState.successCount).toBe(0);
    expect(appwriteState.totalRequests).toBe(0);
  });

  test('should handle successful API calls', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const successfulCall = CircuitBreakerTestHelper.createMockApiCall({
      endpoint: '/youtube/search',
      shouldFail: false,
      delay: 50,
      quotaCost: 100
    });

    const result = await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', successfulCall);

    expect(result.success).toBe(true);
    expect(result.endpoint).toBe('/youtube/search');
    expect(result.processingTime).toBeGreaterThan(40); // Should include delay
    expect(result.quotaUsed).toBe(100);

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.successCount).toBe(1);
    expect(state.failureCount).toBe(0);
    expect(state.totalRequests).toBe(1);
    expect(state.quotaUsed).toBe(100);
    expect(state.isOpen).toBe(false);
  });

  test('should handle API call failures', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const failingCall = CircuitBreakerTestHelper.createMockApiCall({
      endpoint: '/youtube/search',
      shouldFail: true,
      delay: 20,
      quotaCost: 50
    });

    try {
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', failingCall);
      expect.fail('Expected API call to fail');
    } catch (error) {
      expect((error as Error).message).toContain('API call failed: /youtube/search');
    }

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.successCount).toBe(0);
    expect(state.failureCount).toBe(1);
    expect(state.totalRequests).toBe(1);
    expect(state.quotaUsed).toBe(0); // Quota not consumed on failure
    expect(state.isOpen).toBe(false); // Not open yet (need 5 failures)
  });

  test('should open circuit after consecutive failures', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const failingCall = CircuitBreakerTestHelper.createMockApiCall({
      endpoint: '/youtube/search',
      shouldFail: true,
      delay: 10,
      quotaCost: 10
    });

    // Make 5 consecutive failures to trigger circuit opening
    for (let i = 0; i < 5; i++) {
      try {
        await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', failingCall);
        expect.fail(`Expected API call ${i + 1} to fail`);
      } catch (error) {
        expect((error as Error).message).toContain('API call failed');
      }
    }

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.failureCount).toBe(5);
    expect(state.isOpen).toBe(true);
    expect(state.totalRequests).toBe(5);
  });

  test('should block requests when circuit is open', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const failingCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: true,
      delay: 10
    });

    // Trigger circuit opening
    for (let i = 0; i < 5; i++) {
      try {
        await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', failingCall);
      } catch (error) {
        // Expected failures
      }
    }

    // Now circuit should be open - test that it blocks requests
    const blockedCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: false,
      delay: 100
    });

    const startTime = performance.now();
    try {
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', blockedCall);
      expect.fail('Expected request to be blocked');
    } catch (error) {
      expect((error as Error).message).toBe('Circuit breaker is OPEN');
    }
    const executionTime = performance.now() - startTime;

    // Should fail immediately, not wait for delay
    expect(executionTime).toBeLessThan(50);

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.isOpen).toBe(true);
    expect(state.totalRequests).toBe(6); // 5 failures + 1 blocked request
  });

  test('should handle quota limits', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Exhaust quota first
    await CircuitBreakerTestHelper.simulateQuotaExhaustion(page, 'youtube');

    const quotaCall = CircuitBreakerTestHelper.createMockApiCall({
      endpoint: '/youtube/search',
      shouldFail: false,
      delay: 10,
      quotaCost: 1
    });

    try {
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', quotaCall);
      expect.fail('Expected quota exceeded error');
    } catch (error) {
      expect((error as Error).message).toBe('Quota exceeded');
    }

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.quotaUsed).toBe(state.quotaLimit);
  });

  test('should recover from multiple failures with success', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Start with some failures
    const failingCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: true,
      delay: 5
    });

    for (let i = 0; i < 3; i++) {
      try {
        await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', failingCall);
      } catch (error) {
        // Expected failures
      }
    }

    let state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.failureCount).toBe(3);
    expect(state.isOpen).toBe(false); // Not open yet

    // Now succeed - should reduce failure count
    const successCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: false,
      delay: 5,
      quotaCost: 10
    });

    const result = await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', successCall);
    expect(result.success).toBe(true);

    state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.failureCount).toBe(2); // Should be reduced by 1
    expect(state.successCount).toBe(1);
  });
});

test.describe('Circuit Breaker - Advanced Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await CircuitBreakerTestHelper.setupCircuitBreaker(page);
  });

  test('should handle mixed success/failure patterns', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const mixedCalls = [
      { shouldFail: false, quotaCost: 50 },  // Success
      { shouldFail: true, quotaCost: 25 },   // Failure
      { shouldFail: false, quotaCost: 30 },  // Success
      { shouldFail: true, quotaCost: 40 },   // Failure
      { shouldFail: false, quotaCost: 20 }   // Success
    ];

    let totalQuotaUsed = 0;
    for (let i = 0; i < mixedCalls.length; i++) {
      const call = CircuitBreakerTestHelper.createMockApiCall({
        endpoint: `/api/call-${i}`,
        shouldFail: mixedCalls[i].shouldFail,
        quotaCost: mixedCalls[i].quotaCost
      });

      try {
        const result = await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', call);
        if (result.success) {
          totalQuotaUsed += mixedCalls[i].quotaCost;
        }
      } catch (error) {
        // Expected for failing calls
      }
    }

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.successCount).toBe(3);
    expect(state.failureCount).toBe(0); // Should be reduced by successes
    expect(state.totalRequests).toBe(5);
    expect(state.quotaUsed).toBe(totalQuotaUsed);
    expect(state.isOpen).toBe(false);
  });

  test('should isolate circuit breakers by service', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Fail YouTube circuit breaker
    const youtubeFailingCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: true
    });

    for (let i = 0; i < 5; i++) {
      try {
        await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', youtubeFailingCall);
      } catch (error) {
        // Expected
      }
    }

    // YouTube should be open
    const youtubeState = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(youtubeState.isOpen).toBe(true);

    // Appwrite should still work
    const appwriteSuccessCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: false,
      quotaCost: 50
    });

    const result = await CircuitBreakerTestHelper.executeApiCall(page, 'appwrite', appwriteSuccessCall);
    expect(result.success).toBe(true);

    const appwriteState = await CircuitBreakerTestHelper.getCircuitState(page, 'appwrite');
    expect(appwriteState.isOpen).toBe(false);
    expect(appwriteState.successCount).toBe(1);
  });

  test('should handle concurrent API calls', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Execute multiple concurrent API calls
    const concurrentCalls = Array.from({ length: 10 }, (_, i) => 
      CircuitBreakerTestHelper.createMockApiCall({
        endpoint: `/api/concurrent-${i}`,
        shouldFail: i % 3 === 0, // Fail every 3rd call
        delay: Math.random() * 50,
        quotaCost: 10 + i
      })
    );

    const results = await page.evaluate(async (calls) => {
      const promises = calls.map(call => 
        window.testCircuitBreaker.executeWithBreaker('youtube', call).catch(error => ({
          error: error.message,
          endpoint: call.endpoint
        }))
      );
      
      return Promise.all(promises);
    }, concurrentCalls);

    const successes = results.filter(r => 'success' in r && r.success);
    const failures = results.filter(r => 'error' in r);

    expect(successes).toHaveLength(7); // 10 - 3 failures
    expect(failures).toHaveLength(3);

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.totalRequests).toBe(10);
    expect(state.successCount).toBe(7);
    expect(state.isOpen).toBe(false); // Not enough consecutive failures
  });

  test('should handle circuit breaker reset after timeout', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Mock a shorter reset time for testing
    await page.evaluate(() => {
      window.testCircuitBreaker.youtube.resetTime = 100; // 100ms
    });

    // Open the circuit
    const failingCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: true,
      delay: 5
    });

    for (let i = 0; i < 5; i++) {
      try {
        await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', failingCall);
      } catch (error) {
        // Expected
      }
    }

    let state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.isOpen).toBe(true);

    // Wait for reset timeout
    await page.waitForTimeout(150);

    // Now a success should close the circuit
    const successCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: false,
      delay: 5,
      quotaCost: 10
    });

    const result = await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', successCall);
    expect(result.success).toBe(true);

    state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.isOpen).toBe(false);
    expect(state.failureCount).toBe(0); // Reset on recovery
  });

  test('should track performance metrics across calls', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    const performanceCalls = [
      { delay: 10, quotaCost: 5 },
      { delay: 50, quotaCost: 15 },
      { delay: 25, quotaCost: 10 },
      { delay: 100, quotaCost: 20 },
      { delay: 5, quotaCost: 8 }
    ];

    const performanceResults = [];
    for (const callConfig of performanceCalls) {
      const call = CircuitBreakerTestHelper.createMockApiCall({
        shouldFail: false,
        delay: callConfig.delay,
        quotaCost: callConfig.quotaCost
      });

      const result = await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', call);
      performanceResults.push({
        expectedDelay: callConfig.delay,
        actualTime: result.processingTime,
        quotaCost: callConfig.quotaCost
      });
    }

    // Verify performance tracking
    performanceResults.forEach(result => {
      expect(result.actualTime).toBeGreaterThanOrEqual(result.expectedDelay - 5); // Allow 5ms tolerance
      expect(result.actualTime).toBeLessThan(result.expectedDelay + 50); // Should not be much slower
    });

    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    const totalQuotaExpected = performanceCalls.reduce((sum, call) => sum + call.quotaCost, 0);
    expect(state.quotaUsed).toBe(totalQuotaExpected);
  });
});

test.describe('Circuit Breaker - Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await CircuitBreakerTestHelper.setupCircuitBreaker(page);
  });

  test('should handle corrupted circuit breaker state', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Corrupt the state
    await page.evaluate(() => {
      (window.testCircuitBreaker.youtube as any) = null;
    });

    // Should handle gracefully
    try {
      const call = CircuitBreakerTestHelper.createMockApiCall();
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', call);
      expect.fail('Should have thrown an error for corrupted state');
    } catch (error) {
      expect((error as Error).message).toContain('Unknown service: youtube');
    }
  });

  test('should reset circuit breaker state', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Build up some state
    const calls = Array.from({ length: 3 }, () => 
      CircuitBreakerTestHelper.createMockApiCall({
        shouldFail: false,
        quotaCost: 100
      })
    );

    for (const call of calls) {
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', call);
    }

    let state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.successCount).toBe(3);
    expect(state.quotaUsed).toBe(300);

    // Reset the circuit breaker
    await CircuitBreakerTestHelper.resetCircuitBreaker(page, 'youtube');

    state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.successCount).toBe(0);
    expect(state.failureCount).toBe(0);
    expect(state.totalRequests).toBe(0);
    expect(state.quotaUsed).toBe(0);
    expect(state.isOpen).toBe(false);
  });

  test('should handle extreme quota scenarios', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Set very low quota limit
    await page.evaluate(() => {
      window.testCircuitBreaker.youtube.quotaLimit = 10;
    });

    const highQuotaCall = CircuitBreakerTestHelper.createMockApiCall({
      shouldFail: false,
      quotaCost: 15 // More than limit
    });

    try {
      await CircuitBreakerTestHelper.executeApiCall(page, 'youtube', highQuotaCall);
      expect.fail('Should have exceeded quota');
    } catch (error) {
      expect((error as Error).message).toBe('Quota exceeded');
    }

    // Verify no quota was consumed
    const state = await CircuitBreakerTestHelper.getCircuitState(page, 'youtube');
    expect(state.quotaUsed).toBe(0);
  });
});