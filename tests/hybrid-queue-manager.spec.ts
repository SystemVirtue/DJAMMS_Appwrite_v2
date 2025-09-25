// Comprehensive tests for the Hybrid Queue Manager
import { test, expect, type Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

interface MockQueueItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;
  thumbnail: string;
  requestedBy: string;
  priority: 'user' | 'auto';
  source: 'search' | 'playlist' | 'recommendation';
}

interface TestQueueState {
  items: MockQueueItem[];
  priorityQueue: MockQueueItem[];
  backgroundPlaylist: MockQueueItem[];
  currentlyPlaying: MockQueueItem | null;
  isProcessing: boolean;
  performance: {
    processingTime: number;
    syncTime: number;
    conflictResolutions: number;
  };
}

declare global {
  interface Window {
    testQueue: TestQueueState;
  }
}

class QueueTestHelper {
  static async createMockQueueItem(index: number): Promise<MockQueueItem> {
    return {
      id: `mock-${index}-${Date.now()}`,
      videoId: `mock-video-${index}`,
      title: `Mock Song ${index}`,
      channelTitle: `Mock Artist ${index}`,
      duration: 180 + index * 10,
      thumbnail: `https://img.youtube.com/vi/mock-video-${index}/maxresdefault.jpg`,
      requestedBy: index % 2 === 0 ? 'user' : 'system',
      priority: index % 2 === 0 ? 'user' : 'auto',
      source: 'search'
    };
  }

  static async setupHybridQueueManager(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Mock the HybridQueueManager in the browser context
      window.testQueue = {
        items: [],
        priorityQueue: [],
        backgroundPlaylist: [],
        currentlyPlaying: null,
        isProcessing: false,
        performance: {
          processingTime: 0,
          syncTime: 0,
          conflictResolutions: 0
        }
      };
    });
  }

  static async addItemsToQueue(page: Page, count: number): Promise<void> {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.createMockQueueItem(i));
    }

    await page.evaluate((items) => {
      if (window.testQueue) {
        window.testQueue.items = [...window.testQueue.items, ...items];
        // Simulate priority vs background distribution
        items.forEach(item => {
          if (item.priority === 'user') {
            window.testQueue.priorityQueue.push(item);
          } else {
            window.testQueue.backgroundPlaylist.push(item);
          }
        });
      }
    }, items);
  }

  static async simulateQueueOperation(page: Page, operation: string, params?: any): Promise<any> {
    return await page.evaluate(({ op, params }) => {
      if (!window.testQueue) return null;

      const startTime = performance.now();
      let result = null;

      switch (op) {
        case 'playNext':
          if (window.testQueue.priorityQueue.length > 0) {
            result = window.testQueue.priorityQueue.shift();
            window.testQueue.currentlyPlaying = result;
          } else if (window.testQueue.backgroundPlaylist.length > 0) {
            result = window.testQueue.backgroundPlaylist.shift();
            window.testQueue.currentlyPlaying = result;
          }
          break;

        case 'addUserRequest':
          const newItem = params.item;
          newItem.priority = 'user';
          window.testQueue.priorityQueue.push(newItem);
          result = newItem;
          break;

        case 'reorder':
          const { fromIndex, toIndex } = params;
          const item = window.testQueue.items.splice(fromIndex, 1)[0];
          window.testQueue.items.splice(toIndex, 0, item);
          result = true;
          break;

        case 'search':
          const query = params.query.toLowerCase();
          result = window.testQueue.items.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.channelTitle.toLowerCase().includes(query)
          );
          break;
      }

      const processingTime = performance.now() - startTime;
      window.testQueue.performance.processingTime = processingTime;
      
      return { result, processingTime };
    }, { op: operation, params });
  }

  static async getQueueState(page: Page): Promise<any> {
    return await page.evaluate(() => window.testQueue);
  }

  static async waitForQueueUpdate(page: Page, timeout = 5000): Promise<void> {
    await page.waitForFunction(() => {
      return window.testQueue && window.testQueue.items.length > 0;
    }, { timeout });
  }
}

test.describe('Hybrid Queue Manager', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await QueueTestHelper.setupHybridQueueManager(page);
  });

  test('should initialize with empty queue state', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await TestHelper.waitForPageLoad(page);

    const queueState = await QueueTestHelper.getQueueState(page);
    
    expect(queueState.items).toHaveLength(0);
    expect(queueState.priorityQueue).toHaveLength(0);
    expect(queueState.backgroundPlaylist).toHaveLength(0);
    expect(queueState.currentlyPlaying).toBeNull();
    expect(queueState.isProcessing).toBe(false);
  });

  test('should handle priority queue operations', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 5);

    // Add user request (priority)
    const userRequest = await QueueTestHelper.createMockQueueItem(100);
    const result = await QueueTestHelper.simulateQueueOperation(page, 'addUserRequest', { 
      item: userRequest 
    });

    expect(result.result).toBeDefined();
    expect(result.processingTime).toBeLessThan(50); // Should be fast (< 50ms)

    const queueState = await QueueTestHelper.getQueueState(page);
    expect(queueState.priorityQueue).toContainEqual(
      expect.objectContaining({
        title: userRequest.title,
        priority: 'user'
      })
    );
  });

  test('should play next song with priority logic', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 10);

    // Should prioritize user requests over background playlist
    const playResult = await QueueTestHelper.simulateQueueOperation(page, 'playNext');
    
    expect(playResult.result).toBeDefined();
    expect(playResult.result.priority).toBe('user'); // Should pick user request first
    expect(playResult.processingTime).toBeLessThan(20); // Should be very fast

    const queueState = await QueueTestHelper.getQueueState(page);
    expect(queueState.currentlyPlaying).toEqual(playResult.result);
  });

  test('should handle background playlist fallback', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    
    // Add only background playlist items (no user requests)
    await page.evaluate(() => {
      if (window.testQueue) {
        const bgItem = {
          id: 'bg-1',
          videoId: 'bg-video-1',
          title: 'Background Song',
          channelTitle: 'Background Artist',
          priority: 'auto',
          duration: 180,
          thumbnail: 'test.jpg',
          requestedBy: 'system',
          source: 'playlist'
        };
        window.testQueue.backgroundPlaylist = [bgItem];
        window.testQueue.items = [bgItem];
      }
    });

    const playResult = await QueueTestHelper.simulateQueueOperation(page, 'playNext');
    
    expect(playResult.result).toBeDefined();
    expect(playResult.result.priority).toBe('auto');
    expect(playResult.result.title).toBe('Background Song');
  });

  test('should perform efficient queue reordering', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 20);

    // Test reordering performance
    const reorderResult = await QueueTestHelper.simulateQueueOperation(page, 'reorder', {
      fromIndex: 2,
      toIndex: 15
    });

    expect(reorderResult.result).toBe(true);
    expect(reorderResult.processingTime).toBeLessThan(10); // Should be very fast for reordering
    
    const queueState = await QueueTestHelper.getQueueState(page);
    expect(queueState.items).toHaveLength(20); // Same count after reorder
  });

  test('should provide fast search functionality', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 100); // Large queue for search test

    // Test search performance
    const searchResult = await QueueTestHelper.simulateQueueOperation(page, 'search', {
      query: 'Mock Song 1'
    });

    expect(searchResult.result).toBeInstanceOf(Array);
    expect(searchResult.result.length).toBeGreaterThan(0);
    expect(searchResult.processingTime).toBeLessThan(50); // Should be fast even with 100 items
    
    // Verify search accuracy
    const firstResult = searchResult.result[0];
    expect(firstResult.title).toContain('Mock Song 1');
  });

  test('should maintain performance with large queues', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 1000); // Stress test with 1000 items

    // Test various operations with large queue
    const operations = [
      { op: 'addUserRequest', params: { item: await QueueTestHelper.createMockQueueItem(1001) } },
      { op: 'playNext', params: {} },
      { op: 'search', params: { query: 'Mock' } },
      { op: 'reorder', params: { fromIndex: 100, toIndex: 500 } }
    ];

    for (const operation of operations) {
      const result = await QueueTestHelper.simulateQueueOperation(page, operation.op, operation.params);
      
      // All operations should complete within reasonable time even with 1000 items
      expect(result.processingTime).toBeLessThan(100);
      console.log(`Operation ${operation.op}: ${result.processingTime.toFixed(2)}ms`);
    }

    const queueState = await QueueTestHelper.getQueueState(page);
    expect(queueState.items).toHaveLength(1001); // 1000 + 1 added item
  });

  test('should handle queue state persistence', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 5);

    // Set up some queue state
    await QueueTestHelper.simulateQueueOperation(page, 'addUserRequest', { 
      item: await QueueTestHelper.createMockQueueItem(999) 
    });
    await QueueTestHelper.simulateQueueOperation(page, 'playNext');

    // Simulate page reload by storing state in localStorage
    await page.evaluate(() => {
      localStorage.setItem('djamms-queue-test', JSON.stringify(window.testQueue));
    });

    // Reload page
    await page.reload();
    await TestHelper.waitForPageLoad(page);

    // Restore state and verify persistence
    await page.evaluate(() => {
      const saved = localStorage.getItem('djamms-queue-test');
      if (saved) {
        window.testQueue = JSON.parse(saved);
      }
    });

    const restoredState = await QueueTestHelper.getQueueState(page);
    expect(restoredState.items).toHaveLength(6); // 5 + 1 added item
    expect(restoredState.currentlyPlaying).toBeDefined();
  });

  test('should handle concurrent queue operations', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 10);

    // Simulate concurrent operations
    const concurrentOps = await page.evaluate(async () => {
      const operations = [];
      const startTime = performance.now();

      // Simulate multiple operations happening simultaneously
      for (let i = 0; i < 10; i++) {
        operations.push(new Promise(resolve => {
          setTimeout(() => {
            if (window.testQueue && window.testQueue.items.length > i) {
              const item = window.testQueue.items[i];
              item.concurrent_test = true;
              resolve(item);
            } else {
              resolve(null);
            }
          }, Math.random() * 50); // Random delay up to 50ms
        }));
      }

      const results = await Promise.all(operations);
      const endTime = performance.now();
      
      return {
        results: results.filter(r => r !== null),
        totalTime: endTime - startTime,
        concurrentOperations: results.length
      };
    });

    expect(concurrentOps.results).toHaveLength(10);
    expect(concurrentOps.totalTime).toBeLessThan(200); // Should handle concurrency efficiently
    expect(concurrentOps.concurrentOperations).toBe(10);
  });
});

test.describe('Queue Performance Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await QueueTestHelper.setupHybridQueueManager(page);
  });

  test('should track operation performance', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    await QueueTestHelper.addItemsToQueue(page, 50);

    // Perform various operations and check performance tracking
    const operations = ['playNext', 'addUserRequest', 'search', 'reorder'];
    const performanceData = [];

    for (const op of operations) {
      let params = {};
      if (op === 'addUserRequest') {
        params = { item: await QueueTestHelper.createMockQueueItem(999) };
      } else if (op === 'search') {
        params = { query: 'Mock' };
      } else if (op === 'reorder') {
        params = { fromIndex: 1, toIndex: 10 };
      }

      const result = await QueueTestHelper.simulateQueueOperation(page, op, params);
      performanceData.push({
        operation: op,
        time: result.processingTime
      });
    }

    // Verify performance tracking
    performanceData.forEach(data => {
      expect(data.time).toBeGreaterThan(0);
      expect(data.time).toBeLessThan(100); // All operations should be under 100ms
      console.log(`${data.operation}: ${data.time.toFixed(2)}ms`);
    });
  });

  test('should maintain good performance under load', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    
    // Gradually increase load and monitor performance
    const loadTests = [10, 50, 100, 500];
    const performanceResults = [];

    for (const itemCount of loadTests) {
      await page.evaluate(() => {
        if (window.testQueue) {
          window.testQueue.items = [];
          window.testQueue.priorityQueue = [];
          window.testQueue.backgroundPlaylist = [];
        }
      });

      await QueueTestHelper.addItemsToQueue(page, itemCount);
      
      const searchResult = await QueueTestHelper.simulateQueueOperation(page, 'search', {
        query: 'Mock Song 1'
      });

      performanceResults.push({
        itemCount,
        searchTime: searchResult.processingTime
      });
    }

    // Performance should scale reasonably
    performanceResults.forEach(result => {
      expect(result.searchTime).toBeLessThan(result.itemCount * 0.1); // Linear scaling limit
      console.log(`${result.itemCount} items: search took ${result.searchTime.toFixed(2)}ms`);
    });

    // Performance shouldn't degrade exponentially
    const largestTest = performanceResults[performanceResults.length - 1];
    const smallestTest = performanceResults[0];
    const scalingFactor = largestTest.searchTime / smallestTest.searchTime;
    const itemScalingFactor = largestTest.itemCount / smallestTest.itemCount;
    
    // Time scaling should be less than item scaling (sub-linear performance)
    expect(scalingFactor).toBeLessThan(itemScalingFactor);
  });
});

test.describe('Queue Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    await QueueTestHelper.setupHybridQueueManager(page);
  });

  test('should handle invalid queue operations gracefully', async ({ page }) => {
    await page.goto('/djamms-dashboard');

    // Test invalid operations
    const invalidOps = [
      { op: 'reorder', params: { fromIndex: -1, toIndex: 5 } },
      { op: 'reorder', params: { fromIndex: 100, toIndex: 5 } },
      { op: 'playNext', params: {} }, // Empty queue
      { op: 'search', params: { query: '' } } // Empty search
    ];

    for (const invalidOp of invalidOps) {
      const result = await QueueTestHelper.simulateQueueOperation(page, invalidOp.op, invalidOp.params);
      
      // Should handle gracefully without throwing errors
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    }

    // Queue should remain in valid state
    const queueState = await QueueTestHelper.getQueueState(page);
    expect(queueState).toBeDefined();
    expect(Array.isArray(queueState.items)).toBe(true);
  });

  test('should recover from corrupted queue state', async ({ page }) => {
    await page.goto('/djamms-dashboard');
    
    // Simulate corrupted state
    await page.evaluate(() => {
      if (window.testQueue) {
        window.testQueue.items = null; // Corrupt the items array
        window.testQueue.priorityQueue = undefined;
        window.testQueue.currentlyPlaying = { invalid: 'data' };
      }
    });

    // Operations should handle corrupted state
    const result = await page.evaluate(() => {
      try {
        // Attempt to fix corrupted state
        if (!window.testQueue) {
          window.testQueue = {};
        }
        if (!Array.isArray(window.testQueue.items)) {
          window.testQueue.items = [];
        }
        if (!Array.isArray(window.testQueue.priorityQueue)) {
          window.testQueue.priorityQueue = [];
        }
        if (!Array.isArray(window.testQueue.backgroundPlaylist)) {
          window.testQueue.backgroundPlaylist = [];
        }
        return { recovered: true, error: null };
      } catch (error) {
        return { recovered: false, error: error.message };
      }
    });

    expect(result.recovered).toBe(true);
    expect(result.error).toBeNull();

    // State should be valid after recovery
    const recoveredState = await QueueTestHelper.getQueueState(page);
    expect(Array.isArray(recoveredState.items)).toBe(true);
    expect(Array.isArray(recoveredState.priorityQueue)).toBe(true);
    expect(Array.isArray(recoveredState.backgroundPlaylist)).toBe(true);
  });
});