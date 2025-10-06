// Enhanced Hybrid Queue Manager - Combines React patterns with DJAMMS architecture
// Implements local-first processing with Appwrite real-time sync

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { RealtimeResponseEvent } from 'appwrite';

// Types for queue management
export interface QueuedRequest {
	id: string;
	videoId: string;
	title: string;
	channelTitle: string;
	duration: number;
	thumbnail: string;
	requestedBy: string;
	requestedAt: number;
	priority: 'user' | 'auto';
	source: 'search' | 'playlist' | 'recommendation';
}

export interface PlaylistItem {
	id: string;
	videoId: string;
	title: string;
	channelTitle: string;
	duration: number;
	thumbnail: string;
	playCount: number;
	lastPlayed?: number;
	addedAt: number;
}

export interface QueueState {
	currentlyPlaying: QueuedRequest | null;
	priorityQueue: QueuedRequest[]; // User requests - immediate processing
	backgroundPlaylist: PlaylistItem[]; // Background rotation
	isProcessing: boolean;
	lastSync: number;
	queueHistory: QueuedRequest[];
	totalPlayed: number;
	sessionStartTime: number;
}

export interface QueueStats {
	totalRequests: number;
	averageWaitTime: number;
	popularSongs: { videoId: string; playCount: number; title: string }[];
	sessionDuration: number;
	queueProcessingSpeed: number;
}

// Default state
const DEFAULT_QUEUE_STATE: QueueState = {
	currentlyPlaying: null,
	priorityQueue: [],
	backgroundPlaylist: [],
	isProcessing: false,
	lastSync: 0,
	queueHistory: [],
	totalPlayed: 0,
	sessionStartTime: Date.now()
};

export class HybridQueueManager {
	// Core stores
	public queueState = writable<QueueState>(DEFAULT_QUEUE_STATE);
	public queueStats = writable<QueueStats>({
		totalRequests: 0,
		averageWaitTime: 0,
		popularSongs: [],
		sessionDuration: 0,
		queueProcessingSpeed: 0
	});

	// Real-time sync
	private realtimeSubscription: (() => void) | null = null;
	private syncDebounceTimer: NodeJS.Timeout | null = null;
	private instanceId: string;
	private appwriteClient: any; // TODO: Type properly
	
	// Performance monitoring
	private performanceMetrics = {
		queueProcessingTimes: [] as number[],
		syncOperations: 0,
		localOperations: 0,
		conflictResolutions: 0
	};

	constructor(instanceId: string, appwriteClient?: any) {
		this.instanceId = instanceId;
		this.appwriteClient = appwriteClient;
		
		if (browser) {
			this.initializeLocalQueue();
			this.setupPeriodicSync();
		}
	}

	// ===== REACT-INSPIRED LOCAL-FIRST QUEUE PROCESSING =====

	/**
	 * Main queue processing logic - React pattern with local priority
	 */
	async playNextSong(): Promise<QueuedRequest | null> {
		const startTime = performance.now();
		
		try {
			this.queueState.update(state => ({ ...state, isProcessing: true }));

			// 1. Priority: User requests (immediate local processing)
			const currentState = get(this.queueState);
			if (currentState.priorityQueue.length > 0) {
				const nextRequest = currentState.priorityQueue.shift()!;
				await this.playSong(nextRequest, 'USER_SELECTION');
				this.debouncedSyncToAppwrite(); // Background sync
				return nextRequest;
			}

			// 2. Fallback: Background playlist (filtered for variety)
			const availableSongs = currentState.backgroundPlaylist.filter(song => 
				song.videoId !== currentState.currentlyPlaying?.videoId &&
				(!song.lastPlayed || (Date.now() - song.lastPlayed) > 300000) // 5 min cooldown
			);

			if (availableSongs.length > 0) {
				// Smart selection: least recently played + popularity weight
				const nextSong = this.selectNextBackgroundSong(availableSongs);
				const queuedRequest: QueuedRequest = {
					...nextSong,
					id: `bg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
					requestedBy: 'system',
					requestedAt: Date.now(),
					priority: 'auto',
					source: 'playlist'
				};

				await this.playSong(queuedRequest, 'SONG_PLAYED');
				this.rotatePlaylist(nextSong); // Move to end for variety
				return queuedRequest;
			}

			// 3. Final fallback: Popular recommendations or cached songs
			return await this.getRecommendationFallback();

		} finally {
			this.queueState.update(state => ({ ...state, isProcessing: false }));
			
			// Performance tracking
			const processingTime = performance.now() - startTime;
			this.recordPerformanceMetric('queueProcessing', processingTime);
		}
	}

	/**
	 * Add user request to priority queue (React pattern - immediate local processing)
	 */
	async addUserRequest(request: Omit<QueuedRequest, 'id' | 'requestedAt' | 'priority'>): Promise<void> {
		const queuedRequest: QueuedRequest = {
			...request,
			id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
			requestedAt: Date.now(),
			priority: 'user'
		};

		// Immediate local processing
		this.queueState.update(state => ({
			...state,
			priorityQueue: [...state.priorityQueue, queuedRequest]
		}));

		// Background sync to Appwrite
		this.debouncedSyncToAppwrite();

		// Update statistics
		this.updateQueueStats();

		console.log('🎵 HybridQueueManager: Added user request locally:', queuedRequest.title);
	}

	/**
	 * Add songs to background playlist for rotation
	 */
	async addToBackgroundPlaylist(items: Omit<PlaylistItem, 'id' | 'addedAt' | 'playCount'>[]): Promise<void> {
		const playlistItems: PlaylistItem[] = items.map(item => ({
			...item,
			id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
			addedAt: Date.now(),
			playCount: 0
		}));

		this.queueState.update(state => ({
			...state,
			backgroundPlaylist: [...state.backgroundPlaylist, ...playlistItems]
		}));

		this.debouncedSyncToAppwrite();
		console.log('🎵 HybridQueueManager: Added to background playlist:', playlistItems.length, 'songs');
	}

	// ===== SMART SONG SELECTION LOGIC =====

	private selectNextBackgroundSong(availableSongs: PlaylistItem[]): PlaylistItem {
		// Weight songs by: recency (prefer less recent) + inverse popularity (mix popular/unpopular)
		const weightedSongs = availableSongs.map(song => {
			const timeSinceLastPlayed = song.lastPlayed ? Date.now() - song.lastPlayed : Infinity;
			const recencyWeight = Math.min(timeSinceLastPlayed / 3600000, 10); // Max 10 hours
			const popularityWeight = Math.max(1, 10 - song.playCount); // Inverse popularity
			
			return {
				...song,
				weight: recencyWeight * 0.7 + popularityWeight * 0.3 + Math.random() * 0.2 // Add randomness
			};
		});

		// Select highest weighted song
		return weightedSongs.reduce((best, current) => 
			current.weight > best.weight ? current : best
		);
	}

	private rotatePlaylist(playedSong: PlaylistItem): void {
		this.queueState.update(state => {
			const updatedPlaylist = state.backgroundPlaylist.map(song => 
				song.id === playedSong.id 
					? { ...song, playCount: song.playCount + 1, lastPlayed: Date.now() }
					: song
			);
			
			return { ...state, backgroundPlaylist: updatedPlaylist };
		});
	}

	private async getRecommendationFallback(): Promise<QueuedRequest | null> {
		// TODO: Implement recommendation system or cached popular songs
		console.warn('🎵 HybridQueueManager: No songs available - need to implement recommendations');
		return null;
	}

	// ===== SONG PLAYBACK MANAGEMENT =====

	private async playSong(request: QueuedRequest, transitionType: 'USER_SELECTION' | 'SONG_PLAYED'): Promise<void> {
		// Update current track
		this.queueState.update(state => ({
			...state,
			currentlyPlaying: request,
			queueHistory: [request, ...state.queueHistory.slice(0, 49)], // Keep last 50
			totalPlayed: state.totalPlayed + 1
		}));

		// Notify external systems (video player, etc.)
		await this.notifyPlaybackChange(request, transitionType);
		
		console.log('🎵 HybridQueueManager: Now playing:', request.title, `(${transitionType})`);
	}

	private async notifyPlaybackChange(request: QueuedRequest, transitionType: string): Promise<void> {
		// TODO: Integrate with existing DJAMMS player communication
		// This should trigger video player updates, cross-window sync, etc.
		
		// Dispatch custom event for other components
		if (browser) {
			window.dispatchEvent(new CustomEvent('djamms-track-change', {
				detail: { track: request, transitionType }
			}));
		}
	}

	// ===== APPWRITE SYNCHRONIZATION =====

	private debouncedSyncToAppwrite(): void {
		this.performanceMetrics.localOperations++;
		
		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
		}

		this.syncDebounceTimer = setTimeout(async () => {
			await this.syncToAppwrite();
		}, 1000); // 1 second debounce
	}

	private async syncToAppwrite(): Promise<void> {
		if (!this.appwriteClient || !browser) return;

		try {
			this.performanceMetrics.syncOperations++;
			const currentState = get(this.queueState);

			// Sync queue state to Appwrite database
			await this.appwriteClient.database.updateDocument(
				'media_instances', // Collection
				this.instanceId, // Document
				{
					queueState: {
						priorityQueue: currentState.priorityQueue,
						backgroundPlaylist: currentState.backgroundPlaylist.slice(0, 100), // Limit size
						currentlyPlaying: currentState.currentlyPlaying,
						lastSync: Date.now(),
						totalPlayed: currentState.totalPlayed
					},
					updatedAt: new Date().toISOString()
				}
			);

			// Update local sync timestamp
			this.queueState.update(state => ({ 
				...state, 
				lastSync: Date.now() 
			}));

			console.log('🎵 HybridQueueManager: Synced to Appwrite successfully');

		} catch (error) {
			console.error('🎵 HybridQueueManager: Appwrite sync failed:', error);
			// Continue operating locally - sync will retry on next operation
		}
	}

	// ===== REAL-TIME SYNCHRONIZATION =====

	public setupRealtimeSync(): void {
		if (!this.appwriteClient || !browser) return;

		try {
			// Subscribe to real-time updates from other instances
			this.realtimeSubscription = this.appwriteClient.subscribe(
				`databases.media_instances.documents.${this.instanceId}`,
				(response: RealtimeResponseEvent<any>) => {
					this.handleRemoteUpdate(response.payload);
				}
			);

			console.log('🎵 HybridQueueManager: Real-time sync established');
		} catch (error) {
			console.error('🎵 HybridQueueManager: Failed to setup real-time sync:', error);
		}
	}

	private async handleRemoteUpdate(remoteData: any): Promise<void> {
		const currentState = get(this.queueState);
		
		// Smart conflict resolution - merge without disrupting local operations
		const mergedState = await this.resolveConflicts(currentState, remoteData.queueState);
		
		this.queueState.set(mergedState);
		this.performanceMetrics.conflictResolutions++;
		
		console.log('🎵 HybridQueueManager: Resolved remote update conflicts');
	}

	private async resolveConflicts(localState: QueueState, remoteState: Partial<QueueState>): Promise<QueueState> {
		return {
			...localState,
			// Merge priority queues (local + remote user requests)
			priorityQueue: this.mergeQueues(localState.priorityQueue, remoteState.priorityQueue || []),
			
			// Background playlist: prefer remote if it's newer
			backgroundPlaylist: (remoteState.lastSync || 0) > localState.lastSync 
				? remoteState.backgroundPlaylist || localState.backgroundPlaylist
				: localState.backgroundPlaylist,
			
			// Current track: prefer local if we're processing, otherwise prefer more recent
			currentlyPlaying: localState.isProcessing 
				? localState.currentlyPlaying
				: this.selectMostRecentTrack(localState.currentlyPlaying, remoteState.currentlyPlaying || null),
			
			// Sync timestamp: take the most recent
			lastSync: Math.max(localState.lastSync, remoteState.lastSync || 0)
		};
	}

	private mergeQueues(localQueue: QueuedRequest[], remoteQueue: QueuedRequest[]): QueuedRequest[] {
		const allRequests = [...localQueue, ...remoteQueue];
		
		// Deduplicate by ID, preferring newer requests
		const uniqueRequests = allRequests.reduce((acc, request) => {
			const existing = acc.find(r => r.id === request.id);
			if (!existing || request.requestedAt > existing.requestedAt) {
				acc = acc.filter(r => r.id !== request.id);
				acc.push(request);
			}
			return acc;
		}, [] as QueuedRequest[]);

		// Sort by request time (FIFO for user requests)
		return uniqueRequests
			.sort((a, b) => a.requestedAt - b.requestedAt)
			.slice(0, 50); // Limit queue size
	}

	private selectMostRecentTrack(local: QueuedRequest | null, remote: QueuedRequest | null): QueuedRequest | null {
		if (!local && !remote) return null;
		if (!local) return remote;
		if (!remote) return local;
		
		return local.requestedAt > remote.requestedAt ? local : remote;
	}

	// ===== PERFORMANCE MONITORING =====

	private recordPerformanceMetric(operation: string, duration: number): void {
		if (operation === 'queueProcessing') {
			this.performanceMetrics.queueProcessingTimes.push(duration);
			// Keep only last 100 measurements
			if (this.performanceMetrics.queueProcessingTimes.length > 100) {
				this.performanceMetrics.queueProcessingTimes.shift();
			}
		}

		this.updateQueueStats();
	}

	private updateQueueStats(): void {
		const currentState = get(this.queueState);
		const processingTimes = this.performanceMetrics.queueProcessingTimes;
		
		const stats: QueueStats = {
			totalRequests: currentState.totalPlayed,
			averageWaitTime: processingTimes.length > 0 
				? processingTimes.reduce((a, b) => a + b) / processingTimes.length 
				: 0,
			popularSongs: this.calculatePopularSongs(currentState.queueHistory),
			sessionDuration: Date.now() - currentState.sessionStartTime,
			queueProcessingSpeed: processingTimes.length > 0
				? 1000 / (processingTimes.reduce((a, b) => a + b) / processingTimes.length)
				: 0
		};

		this.queueStats.set(stats);
	}

	private calculatePopularSongs(history: QueuedRequest[]): { videoId: string; playCount: number; title: string }[] {
		const songCounts = history.reduce((acc, song) => {
			acc[song.videoId] = {
				count: (acc[song.videoId]?.count || 0) + 1,
				title: song.title
			};
			return acc;
		}, {} as Record<string, { count: number; title: string }>);

		return Object.entries(songCounts)
			.map(([videoId, data]) => ({
				videoId,
				playCount: data.count,
				title: data.title
			}))
			.sort((a, b) => b.playCount - a.playCount)
			.slice(0, 10);
	}

	// ===== INITIALIZATION AND CLEANUP =====

	private initializeLocalQueue(): void {
		// TODO: Load from localStorage if available (Phase 3)
		console.log('🎵 HybridQueueManager: Initialized local queue for instance:', this.instanceId);
	}

	private setupPeriodicSync(): void {
		// Periodic sync every 30 seconds to ensure consistency
		setInterval(() => {
			if (this.appwriteClient && !this.syncDebounceTimer) {
				this.syncToAppwrite();
			}
		}, 30000);
	}

	public getPerformanceMetrics() {
		return {
			...this.performanceMetrics,
			averageProcessingTime: this.performanceMetrics.queueProcessingTimes.length > 0
				? this.performanceMetrics.queueProcessingTimes.reduce((a, b) => a + b) / this.performanceMetrics.queueProcessingTimes.length
				: 0,
			syncRatio: this.performanceMetrics.syncOperations / Math.max(1, this.performanceMetrics.localOperations)
		};
	}

	public destroy(): void {
		if (this.realtimeSubscription) {
			this.realtimeSubscription();
			this.realtimeSubscription = null;
		}

		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
			this.syncDebounceTimer = null;
		}

		console.log('🎵 HybridQueueManager: Destroyed instance:', this.instanceId);
	}
}

// ===== DERIVED STORES FOR UI CONSUMPTION =====

export function createHybridQueueStores(instanceId: string, appwriteClient?: any) {
	const manager = new HybridQueueManager(instanceId, appwriteClient);
	
	// Setup real-time sync if Appwrite client provided
	if (appwriteClient) {
		manager.setupRealtimeSync();
	}

	// Derived stores for specific UI needs
	const currentTrack = derived(manager.queueState, $state => $state.currentlyPlaying);
	const queueCount = derived(manager.queueState, $state => 
		$state.priorityQueue.length + $state.backgroundPlaylist.length
	);
	const nextSong = derived(manager.queueState, $state => {
		if ($state.priorityQueue.length > 0) {
			return $state.priorityQueue[0];
		}
		if ($state.backgroundPlaylist.length > 0) {
			return $state.backgroundPlaylist[0];
		}
		return null;
	});
	const isQueueEmpty = derived(queueCount, $count => $count === 0);
	const queuePosition = derived(manager.queueState, $state => ({
		userRequests: $state.priorityQueue.length,
		backgroundSongs: $state.backgroundPlaylist.length,
		isProcessing: $state.isProcessing
	}));

	return {
		manager,
		// Core stores
		queueState: manager.queueState,
		queueStats: manager.queueStats,
		// Derived stores
		currentTrack,
		queueCount,
		nextSong,
		isQueueEmpty,
		queuePosition,
		// Manager methods
		playNextSong: () => manager.playNextSong(),
		addUserRequest: (request: Omit<QueuedRequest, 'id' | 'requestedAt' | 'priority'>) => 
			manager.addUserRequest(request),
		addToBackgroundPlaylist: (items: Omit<PlaylistItem, 'id' | 'addedAt' | 'playCount'>[]) =>
			manager.addToBackgroundPlaylist(items),
		getPerformanceMetrics: () => manager.getPerformanceMetrics(),
		destroy: () => manager.destroy()
	};
}