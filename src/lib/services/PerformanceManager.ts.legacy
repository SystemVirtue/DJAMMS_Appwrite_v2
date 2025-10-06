// Enhanced Queue Performance Manager for DJAMMS
// Implements virtual scrolling, performance monitoring, and optimized operations

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { QueuedRequest, PlaylistItem } from './HybridQueueManager';

// Types for performance optimization
export interface VirtualScrollConfig {
	itemHeight: number;
	containerHeight: number;
	buffer: number; // Number of items to render outside visible area
	overscan: number; // Additional items to render for smooth scrolling
}

export interface PerformanceMetrics {
	renderTime: number;
	scrollPerformance: {
		fps: number;
		averageFrameTime: number;
		droppedFrames: number;
	};
	queueOperations: {
		addOperationTime: number;
		removeOperationTime: number;
		reorderOperationTime: number;
		searchTime: number;
	};
	memoryUsage: {
		totalItems: number;
		renderedItems: number;
		memoryEfficiency: number; // Ratio of rendered/total
	};
	userInteraction: {
		responseTime: number;
		interactionCount: number;
		lastInteraction: number;
	};
}

export interface VirtualizedQueue {
	visibleItems: (QueuedRequest | PlaylistItem)[];
	startIndex: number;
	endIndex: number;
	totalHeight: number;
	offsetY: number;
}

export interface DragDropState {
	isDragging: boolean;
	draggedItem: QueuedRequest | null;
	draggedIndex: number;
	dropTargetIndex: number;
	dragPreviewOffset: { x: number; y: number };
	isValidDropTarget: boolean;
}

export interface SearchIndex {
	byTitle: Map<string, (QueuedRequest | PlaylistItem)[]>;
	byArtist: Map<string, (QueuedRequest | PlaylistItem)[]>;
	byVideoId: Map<string, QueuedRequest | PlaylistItem>;
	lastIndexUpdate: number;
	indexSize: number;
}

const DEFAULT_VIRTUAL_CONFIG: VirtualScrollConfig = {
	itemHeight: 80,
	containerHeight: 600,
	buffer: 5,
	overscan: 10
};

export class QueuePerformanceManager {
	// Core stores
	public virtualizedQueue = writable<VirtualizedQueue>({
		visibleItems: [],
		startIndex: 0,
		endIndex: 0,
		totalHeight: 0,
		offsetY: 0
	});
	
	public performanceMetrics = writable<PerformanceMetrics>({
		renderTime: 0,
		scrollPerformance: {
			fps: 60,
			averageFrameTime: 16.67,
			droppedFrames: 0
		},
		queueOperations: {
			addOperationTime: 0,
			removeOperationTime: 0,
			reorderOperationTime: 0,
			searchTime: 0
		},
		memoryUsage: {
			totalItems: 0,
			renderedItems: 0,
			memoryEfficiency: 1
		},
		userInteraction: {
			responseTime: 0,
			interactionCount: 0,
			lastInteraction: 0
		}
	});

	public dragDropState = writable<DragDropState>({
		isDragging: false,
		draggedItem: null,
		draggedIndex: -1,
		dropTargetIndex: -1,
		dragPreviewOffset: { x: 0, y: 0 },
		isValidDropTarget: false
	});

	// Configuration and state
	private config: VirtualScrollConfig;
	private allItems: (QueuedRequest | PlaylistItem)[] = [];
	private searchIndex: SearchIndex;
	private scrollElement: HTMLElement | null = null;
	
	// Performance monitoring
	private frameRequestId: number | null = null;
	private lastFrameTime = 0;
	private frameTimes: number[] = [];
	private performanceObserver: PerformanceObserver | null = null;
	private mutationObserver: MutationObserver | null = null;

	// Optimization caches
	private renderCache = new Map<string, HTMLElement>();
	private measurementCache = new Map<string, { width: number; height: number }>();
	private throttledUpdateTimeout: NodeJS.Timeout | null = null;

	constructor(customConfig?: Partial<VirtualScrollConfig>) {
		this.config = { ...DEFAULT_VIRTUAL_CONFIG, ...customConfig };
		this.searchIndex = this.initializeSearchIndex();

		if (browser) {
			this.setupPerformanceMonitoring();
			this.setupMutationObserver();
		}
	}

	// ===== VIRTUAL SCROLLING CORE =====

	/**
	 * Initialize virtual scrolling for a container
	 */
	initializeVirtualScroll(containerElement: HTMLElement, items: (QueuedRequest | PlaylistItem)[]): void {
		this.scrollElement = containerElement;
		this.allItems = items;
		
		// Setup scroll listener with passive option for better performance
		containerElement.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
		containerElement.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });

		// Initial render
		this.updateVirtualizedItems(0);
		
		// Update search index
		this.updateSearchIndex(items);

		console.log('🚀 Performance Manager: Virtual scroll initialized', {
			totalItems: items.length,
			itemHeight: this.config.itemHeight
		});
	}

	/**
	 * Handle scroll events with performance optimization
	 */
	private handleScroll = this.throttle((event: Event) => {
		const startTime = performance.now();
		
		const container = event.target as HTMLElement;
		const scrollTop = container.scrollTop;
		
		this.updateVirtualizedItems(scrollTop);
		
		// Record performance metrics
		const renderTime = performance.now() - startTime;
		this.updatePerformanceMetric('renderTime', renderTime);
		
	}, 16); // ~60fps throttling

	/**
	 * Handle wheel events for smooth scrolling
	 */
	private handleWheel = this.throttle((event: WheelEvent) => {
		// Smooth scrolling optimization
		if (this.scrollElement) {
			const delta = event.deltaY;
			const currentScroll = this.scrollElement.scrollTop;
			const targetScroll = currentScroll + delta;
			
			// Smooth scroll with requestAnimationFrame
			this.smoothScrollTo(targetScroll);
		}
	}, 16);

	/**
	 * Update virtualized items based on scroll position
	 */
	private updateVirtualizedItems(scrollTop: number): void {
		const { itemHeight, containerHeight, buffer, overscan } = this.config;
		const totalItems = this.allItems.length;

		// Calculate visible range
		const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
		const endIndex = Math.min(
			totalItems - 1,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer + overscan
		);

		// Extract visible items
		const visibleItems = this.allItems.slice(startIndex, endIndex + 1);
		
		// Calculate positioning
		const totalHeight = totalItems * itemHeight;
		const offsetY = startIndex * itemHeight;

		// Update store
		this.virtualizedQueue.set({
			visibleItems,
			startIndex,
			endIndex,
			totalHeight,
			offsetY
		});

		// Update memory efficiency metric
		this.updatePerformanceMetric('memoryUsage', {
			totalItems,
			renderedItems: visibleItems.length,
			memoryEfficiency: visibleItems.length / Math.max(1, totalItems)
		});
	}

	/**
	 * Smooth scroll to target position
	 */
	private smoothScrollTo(targetY: number): void {
		if (!this.scrollElement) return;

		const start = this.scrollElement.scrollTop;
		const distance = targetY - start;
		const duration = 200; // ms
		let startTime: number;

		const animateScroll = (currentTime: number) => {
			if (!startTime) startTime = currentTime;
			const progress = Math.min((currentTime - startTime) / duration, 1);
			
			// Easing function (ease-out)
			const ease = 1 - Math.pow(1 - progress, 3);
			const currentPosition = start + distance * ease;
			
			if (this.scrollElement) {
				this.scrollElement.scrollTop = currentPosition;
			}

			if (progress < 1) {
				requestAnimationFrame(animateScroll);
			}
		};

		requestAnimationFrame(animateScroll);
	}

	// ===== OPTIMIZED QUEUE OPERATIONS =====

	/**
	 * Add item to queue with performance optimization
	 */
	async addItemOptimized(item: QueuedRequest | PlaylistItem, index?: number): Promise<void> {
		const startTime = performance.now();

		// Insert item efficiently
		if (index !== undefined) {
			this.allItems.splice(index, 0, item);
		} else {
			this.allItems.push(item);
		}

		// Update search index incrementally
		this.addToSearchIndex(item);

		// Refresh virtual scroll if needed
		if (this.scrollElement) {
			this.updateVirtualizedItems(this.scrollElement.scrollTop);
		}

		// Record performance
		const operationTime = performance.now() - startTime;
		this.updatePerformanceMetric('queueOperations.addOperationTime', operationTime);
		
		console.log('🚀 Performance Manager: Added item in', operationTime.toFixed(2), 'ms');
	}

	/**
	 * Remove item from queue with performance optimization
	 */
	async removeItemOptimized(index: number): Promise<(QueuedRequest | PlaylistItem) | null> {
		const startTime = performance.now();

		if (index < 0 || index >= this.allItems.length) {
			return null;
		}

		// Remove item efficiently
		const removedItem = this.allItems.splice(index, 1)[0];

		// Update search index
		this.removeFromSearchIndex(removedItem);

		// Refresh virtual scroll
		if (this.scrollElement) {
			this.updateVirtualizedItems(this.scrollElement.scrollTop);
		}

		// Record performance
		const operationTime = performance.now() - startTime;
		this.updatePerformanceMetric('queueOperations.removeOperationTime', operationTime);

		return removedItem;
	}

	/**
	 * Reorder items with optimized array operations
	 */
	async reorderItems(fromIndex: number, toIndex: number): Promise<void> {
		const startTime = performance.now();

		if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
			fromIndex >= this.allItems.length || toIndex >= this.allItems.length) {
			return;
		}

		// Efficient array reorder
		const item = this.allItems.splice(fromIndex, 1)[0];
		this.allItems.splice(toIndex, 0, item);

		// No need to update search index for reorder
		
		// Refresh virtual scroll
		if (this.scrollElement) {
			this.updateVirtualizedItems(this.scrollElement.scrollTop);
		}

		// Record performance
		const operationTime = performance.now() - startTime;
		this.updatePerformanceMetric('queueOperations.reorderOperationTime', operationTime);
		
		console.log('🚀 Performance Manager: Reordered items in', operationTime.toFixed(2), 'ms');
	}

	// ===== ADVANCED SEARCH WITH INDEXING =====

	/**
	 * High-performance search with pre-built index
	 */
	async searchItems(query: string, maxResults: number = 50): Promise<(QueuedRequest | PlaylistItem)[]> {
		const startTime = performance.now();
		
		if (!query.trim()) {
			return [];
		}

		const normalizedQuery = query.toLowerCase().trim();
		const results = new Set<QueuedRequest | PlaylistItem>();

		// Search by title (most common)
		for (const [title, items] of this.searchIndex.byTitle.entries()) {
			if (title.includes(normalizedQuery)) {
				items.forEach(item => results.add(item));
				if (results.size >= maxResults) break;
			}
		}

		// Search by artist if we need more results
		if (results.size < maxResults) {
			for (const [artist, items] of this.searchIndex.byArtist.entries()) {
				if (artist.includes(normalizedQuery)) {
					items.forEach(item => results.add(item));
					if (results.size >= maxResults) break;
				}
			}
		}

		// Search by video ID for exact matches
		const exactMatch = this.searchIndex.byVideoId.get(normalizedQuery);
		if (exactMatch) {
			results.add(exactMatch);
		}

		const searchResults = Array.from(results).slice(0, maxResults);

		// Record performance
		const searchTime = performance.now() - startTime;
		this.updatePerformanceMetric('queueOperations.searchTime', searchTime);

		console.log('🚀 Performance Manager: Search completed in', searchTime.toFixed(2), 'ms', {
			query,
			resultsCount: searchResults.length
		});

		return searchResults;
	}

	// ===== DRAG AND DROP OPTIMIZATION =====

	/**
	 * Initialize optimized drag and drop
	 */
	initializeDragDrop(): {
		onDragStart: (item: QueuedRequest, index: number, event: DragEvent) => void;
		onDragOver: (index: number, event: DragEvent) => void;
		onDrop: (targetIndex: number, event: DragEvent) => Promise<void>;
		onDragEnd: () => void;
	} {
		return {
			onDragStart: this.handleDragStart.bind(this),
			onDragOver: this.handleDragOver.bind(this),
			onDrop: this.handleDrop.bind(this),
			onDragEnd: this.handleDragEnd.bind(this)
		};
	}

	private handleDragStart(item: QueuedRequest, index: number, event: DragEvent): void {
		this.dragDropState.set({
			isDragging: true,
			draggedItem: item,
			draggedIndex: index,
			dropTargetIndex: -1,
			dragPreviewOffset: { x: 0, y: 0 },
			isValidDropTarget: false
		});

		// Set drag data
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/json', JSON.stringify({ index, item }));
		}

		console.log('🚀 Drag: Started dragging item', index);
	}

	private handleDragOver(index: number, event: DragEvent): void {
		event.preventDefault();
		
		const currentState = get(this.dragDropState);
		if (currentState.isDragging && index !== currentState.draggedIndex) {
			this.dragDropState.update(state => ({
				...state,
				dropTargetIndex: index,
				isValidDropTarget: true
			}));
		}
	}

	private async handleDrop(targetIndex: number, event: DragEvent): Promise<void> {
		event.preventDefault();
		
		const currentState = get(this.dragDropState);
		if (!currentState.isDragging || !currentState.draggedItem) {
			return;
		}

		// Perform the reorder
		await this.reorderItems(currentState.draggedIndex, targetIndex);
		
		// Reset drag state
		this.handleDragEnd();

		console.log('🚀 Drag: Dropped item from', currentState.draggedIndex, 'to', targetIndex);
	}

	private handleDragEnd(): void {
		this.dragDropState.set({
			isDragging: false,
			draggedItem: null,
			draggedIndex: -1,
			dropTargetIndex: -1,
			dragPreviewOffset: { x: 0, y: 0 },
			isValidDropTarget: false
		});
	}

	// ===== SEARCH INDEX MANAGEMENT =====

	private initializeSearchIndex(): SearchIndex {
		return {
			byTitle: new Map(),
			byArtist: new Map(),
			byVideoId: new Map(),
			lastIndexUpdate: 0,
			indexSize: 0
		};
	}

	private updateSearchIndex(items: (QueuedRequest | PlaylistItem)[]): void {
		// Clear existing index
		this.searchIndex.byTitle.clear();
		this.searchIndex.byArtist.clear();
		this.searchIndex.byVideoId.clear();

		// Build new index
		items.forEach(item => {
			this.addToSearchIndex(item);
		});

		this.searchIndex.lastIndexUpdate = Date.now();
		this.searchIndex.indexSize = items.length;

		console.log('🚀 Performance Manager: Search index updated', {
			itemCount: items.length,
			titleEntries: this.searchIndex.byTitle.size,
			artistEntries: this.searchIndex.byArtist.size
		});
	}

	private addToSearchIndex(item: QueuedRequest | PlaylistItem): void {
		// Index by title
		const normalizedTitle = item.title.toLowerCase();
		if (!this.searchIndex.byTitle.has(normalizedTitle)) {
			this.searchIndex.byTitle.set(normalizedTitle, []);
		}
		this.searchIndex.byTitle.get(normalizedTitle)!.push(item);

		// Index by artist/channel
		const normalizedArtist = item.channelTitle.toLowerCase();
		if (!this.searchIndex.byArtist.has(normalizedArtist)) {
			this.searchIndex.byArtist.set(normalizedArtist, []);
		}
		this.searchIndex.byArtist.get(normalizedArtist)!.push(item);

		// Index by video ID
		this.searchIndex.byVideoId.set(item.videoId, item);
	}

	private removeFromSearchIndex(item: QueuedRequest | PlaylistItem): void {
		// Remove from title index
		const titleItems = this.searchIndex.byTitle.get(item.title.toLowerCase());
		if (titleItems) {
			const index = titleItems.findIndex(i => i.videoId === item.videoId);
			if (index !== -1) {
				titleItems.splice(index, 1);
				if (titleItems.length === 0) {
					this.searchIndex.byTitle.delete(item.title.toLowerCase());
				}
			}
		}

		// Remove from artist index
		const artistItems = this.searchIndex.byArtist.get(item.channelTitle.toLowerCase());
		if (artistItems) {
			const index = artistItems.findIndex(i => i.videoId === item.videoId);
			if (index !== -1) {
				artistItems.splice(index, 1);
				if (artistItems.length === 0) {
					this.searchIndex.byArtist.delete(item.channelTitle.toLowerCase());
				}
			}
		}

		// Remove from video ID index
		this.searchIndex.byVideoId.delete(item.videoId);
	}

	// ===== PERFORMANCE MONITORING =====

	private setupPerformanceMonitoring(): void {
		// Monitor frame rate
		this.startFrameRateMonitoring();

		// Monitor DOM mutations
		this.setupMutationObserver();

		// Monitor user interactions
		if (browser) {
			document.addEventListener('click', this.trackUserInteraction.bind(this));
			document.addEventListener('scroll', this.trackUserInteraction.bind(this));
			document.addEventListener('keydown', this.trackUserInteraction.bind(this));
		}

		console.log('🚀 Performance Manager: Monitoring initialized');
	}

	private startFrameRateMonitoring(): void {
		const measureFrame = (currentTime: number) => {
			if (this.lastFrameTime > 0) {
				const frameTime = currentTime - this.lastFrameTime;
				this.frameTimes.push(frameTime);

				// Keep only last 60 frame times (~1 second at 60fps)
				if (this.frameTimes.length > 60) {
					this.frameTimes.shift();
				}

				// Calculate FPS and metrics
				const averageFrameTime = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
				const fps = 1000 / averageFrameTime;
				const droppedFrames = this.frameTimes.filter(time => time > 20).length; // Frames over 20ms

				this.updatePerformanceMetric('scrollPerformance', {
					fps: Math.round(fps * 10) / 10,
					averageFrameTime: Math.round(averageFrameTime * 100) / 100,
					droppedFrames
				});
			}

			this.lastFrameTime = currentTime;
			this.frameRequestId = requestAnimationFrame(measureFrame);
		};

		this.frameRequestId = requestAnimationFrame(measureFrame);
	}

	private setupMutationObserver(): void {
		if (!browser || !window.MutationObserver) return;

		this.mutationObserver = new MutationObserver((mutations) => {
			// Track DOM mutations that might affect performance
			const significantMutations = mutations.filter(mutation => 
				mutation.type === 'childList' && mutation.addedNodes.length > 0
			);

			if (significantMutations.length > 10) {
				console.warn('🚀 Performance Manager: High DOM mutation rate detected:', significantMutations.length);
			}
		});

		// Observe the document body
		this.mutationObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	private trackUserInteraction(): void {
		const now = performance.now();
		this.updatePerformanceMetric('userInteraction', (current: any) => ({
			responseTime: now - current.lastInteraction,
			interactionCount: current.interactionCount + 1,
			lastInteraction: now
		}));
	}

	// ===== UTILITY FUNCTIONS =====

	private throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
		let inThrottle: boolean;
		return ((...args: any[]) => {
			if (!inThrottle) {
				func.apply(this, args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limit);
			}
		}) as T;
	}

	private updatePerformanceMetric(path: string, value: any): void {
		this.performanceMetrics.update(metrics => {
			const keys = path.split('.');
			let current: any = metrics;
			
			for (let i = 0; i < keys.length - 1; i++) {
				current = current[keys[i]];
			}
			
			if (typeof value === 'function') {
				current[keys[keys.length - 1]] = value(current[keys[keys.length - 1]]);
			} else {
				current[keys[keys.length - 1]] = value;
			}
			
			return metrics;
		});
	}

	// ===== PUBLIC API =====

	/**
	 * Update queue items and refresh virtual scroll
	 */
	updateItems(items: (QueuedRequest | PlaylistItem)[]): void {
		this.allItems = items;
		this.updateSearchIndex(items);
		
		if (this.scrollElement) {
			this.updateVirtualizedItems(this.scrollElement.scrollTop);
		}
	}

	/**
	 * Scroll to specific item
	 */
	scrollToItem(index: number, behavior: 'auto' | 'smooth' = 'smooth'): void {
		if (!this.scrollElement || index < 0 || index >= this.allItems.length) {
			return;
		}

		const targetScrollTop = index * this.config.itemHeight;
		
		if (behavior === 'smooth') {
			this.smoothScrollTo(targetScrollTop);
		} else {
			this.scrollElement.scrollTop = targetScrollTop;
		}
	}

	/**
	 * Get current performance summary
	 */
	getPerformanceSummary(): {
		overallScore: number;
		bottlenecks: string[];
		recommendations: string[];
		metrics: PerformanceMetrics;
	} {
		const metrics = get(this.performanceMetrics);
		
		let score = 100;
		const bottlenecks: string[] = [];
		const recommendations: string[] = [];

		// Analyze FPS
		if (metrics.scrollPerformance.fps < 30) {
			score -= 30;
			bottlenecks.push('Low frame rate during scrolling');
			recommendations.push('Reduce queue item complexity or increase virtual scroll buffer');
		}

		// Analyze operation times
		if (metrics.queueOperations.addOperationTime > 50) {
			score -= 20;
			bottlenecks.push('Slow queue add operations');
			recommendations.push('Optimize queue insertion algorithm');
		}

		// Analyze memory efficiency
		if (metrics.memoryUsage.memoryEfficiency < 0.1) {
			score -= 15;
			bottlenecks.push('Poor memory efficiency');
			recommendations.push('Increase virtual scroll buffer size');
		}

		return {
			overallScore: Math.max(0, score),
			bottlenecks,
			recommendations,
			metrics
		};
	}

	/**
	 * Reset performance metrics
	 */
	resetMetrics(): void {
		this.frameTimes = [];
		this.performanceMetrics.set({
			renderTime: 0,
			scrollPerformance: {
				fps: 60,
				averageFrameTime: 16.67,
				droppedFrames: 0
			},
			queueOperations: {
				addOperationTime: 0,
				removeOperationTime: 0,
				reorderOperationTime: 0,
				searchTime: 0
			},
			memoryUsage: {
				totalItems: this.allItems.length,
				renderedItems: 0,
				memoryEfficiency: 1
			},
			userInteraction: {
				responseTime: 0,
				interactionCount: 0,
				lastInteraction: Date.now()
			}
		});
	}

	// ===== CLEANUP =====

	destroy(): void {
		// Stop frame rate monitoring
		if (this.frameRequestId) {
			cancelAnimationFrame(this.frameRequestId);
		}

		// Disconnect observers
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
		}

		// Clear timers
		if (this.throttledUpdateTimeout) {
			clearTimeout(this.throttledUpdateTimeout);
		}

		// Clear caches
		this.renderCache.clear();
		this.measurementCache.clear();
		
		console.log('🚀 Performance Manager: Destroyed');
	}
}

// ===== SVELTE STORES FOR UI INTEGRATION =====

export function createPerformanceStores(config?: Partial<VirtualScrollConfig>) {
	const performanceManager = new QueuePerformanceManager(config);

	// Derived stores for UI consumption
	const isPerformanceGood = derived(performanceManager.performanceMetrics, $metrics => 
		$metrics.scrollPerformance.fps > 45 && $metrics.queueOperations.addOperationTime < 20
	);

	const memoryEfficiencyStatus = derived(performanceManager.performanceMetrics, $metrics => {
		const efficiency = $metrics.memoryUsage.memoryEfficiency;
		if (efficiency > 0.8) return 'excellent';
		if (efficiency > 0.5) return 'good';
		if (efficiency > 0.2) return 'fair';
		return 'poor';
	});

	return {
		performanceManager,
		virtualizedQueue: performanceManager.virtualizedQueue,
		performanceMetrics: performanceManager.performanceMetrics,
		dragDropState: performanceManager.dragDropState,
		isPerformanceGood,
		memoryEfficiencyStatus,
		// Public methods
		initializeVirtualScroll: (container: HTMLElement, items: (QueuedRequest | PlaylistItem)[]) => 
			performanceManager.initializeVirtualScroll(container, items),
		searchItems: (query: string, maxResults?: number) => 
			performanceManager.searchItems(query, maxResults),
		addItemOptimized: (item: QueuedRequest | PlaylistItem, index?: number) => 
			performanceManager.addItemOptimized(item, index),
		removeItemOptimized: (index: number) => 
			performanceManager.removeItemOptimized(index),
		reorderItems: (fromIndex: number, toIndex: number) => 
			performanceManager.reorderItems(fromIndex, toIndex),
		scrollToItem: (index: number, behavior?: 'auto' | 'smooth') => 
			performanceManager.scrollToItem(index, behavior),
		getPerformanceSummary: () => performanceManager.getPerformanceSummary(),
		resetMetrics: () => performanceManager.resetMetrics(),
		updateItems: (items: (QueuedRequest | PlaylistItem)[]) => 
			performanceManager.updateItems(items),
		initializeDragDrop: () => performanceManager.initializeDragDrop(),
		destroy: () => performanceManager.destroy()
	};
}