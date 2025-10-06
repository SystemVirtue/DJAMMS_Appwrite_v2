// V3 Simplified Jukebox Service - Works with active_queues and player_instances
import { Client, Databases, Query, ID } from 'appwrite';
import type { 
	JukeboxState, 
	PriorityQueueItem, 
	InMemoryPlaylistItem, 
	JukeboxConfig 
} from '../types/jukebox';

// V3 Collection IDs
const COLLECTIONS = {
	PLAYER_INSTANCES: 'player_instances',
	ACTIVE_QUEUES: 'active_queues',
	PLAYLISTS: 'playlists',
	DJAMMS_USERS: 'djamms_users',
	USER_ACTIVITY: 'user_activity'
} as const;

interface QueueDocument {
	$id: string;
	instanceId: string;
	sourcePlaylistId: string;
	memoryPlaylist: InMemoryPlaylistItem[];
	currentTrackIndex: number;
	priorityQueue: PriorityQueueItem[];
	isShuffled: boolean;
	shuffleSeed: number;
	lastUpdated: string;
}

interface PlayerInstanceDocument {
	$id: string;
	userId: string;
	instanceId: string;
	instanceType: 'player' | 'kiosk';
	isActive: boolean;
	playerState: string; // JSON string
	settings: string; // JSON string  
	createdAt: string;
	lastActiveAt: string;
	lastUpdated: string;
}

// Rate Limit Fuse Interface
interface RateLimitFuseEntry {
	endpoint: string;
	count: number;
	resetTime: number;
}

class JukeboxServiceV3 {
	private client: Client;
	private databases: Databases;
	private instanceId: string;
	private databaseId: string;
	private rateLimitFuse: Map<string, RateLimitFuseEntry> = new Map();
	private readonly RATE_LIMIT_WINDOW = 120000; // 2 minutes
	private readonly RATE_LIMIT_MAX_REQUESTS = 50; // Increased from 10 to 50

	constructor(clientOrInstanceId: Client | string, databaseIdOrInstanceId?: string, instanceId?: string) {
		// Support both old and new constructor signatures for backward compatibility
		if (typeof clientOrInstanceId === 'string') {
			// New signature: (instanceId, databaseId)
			this.client = new Client()
				.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
				.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');
			this.instanceId = clientOrInstanceId;
			this.databaseId = databaseIdOrInstanceId!;
		} else {
			// Old signature: (client, databaseId, instanceId)
			this.client = clientOrInstanceId;
			this.instanceId = instanceId!;
			this.databaseId = databaseIdOrInstanceId!;
		}
		
		this.databases = new Databases(this.client);
	}

	/**
	 * Retry operation with exponential backoff
	 */
	private async retryOperation<T>(
		operation: () => Promise<T>,
		context: string,
		maxRetries: number = 3
	): Promise<T> {
		let lastError: Error;
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;
				console.warn(`🎵 JukeboxService: ${context} failed (attempt ${attempt}/${maxRetries}):`, error);
				
				if (attempt === maxRetries) break;
				
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError!;
	}

	/**
	 * Rate limit check to prevent API abuse
	 */
	private checkRateLimit(endpoint: string): boolean {
		const now = Date.now();
		const entry = this.rateLimitFuse.get(endpoint);
		
		if (!entry) {
			this.rateLimitFuse.set(endpoint, {
				endpoint,
				count: 1,
				resetTime: now + this.RATE_LIMIT_WINDOW
			});
			return true;
		}
		
		if (now > entry.resetTime) {
			entry.count = 1;
			entry.resetTime = now + this.RATE_LIMIT_WINDOW;
			return true;
		}
		
		if (entry.count >= this.RATE_LIMIT_MAX_REQUESTS) {
			return false;
		}
		
		entry.count++;
		return true;
	}

	/**
	 * Get the current queue state for this instance
	 */
	async getQueueState(): Promise<QueueDocument | null> {
		if (!this.checkRateLimit('getQueueState')) {
			throw new Error('Rate limit exceeded for getQueueState');
		}

		return this.retryOperation(async () => {
			const response = await this.databases.listDocuments(
				this.databaseId,
				COLLECTIONS.ACTIVE_QUEUES,
				[Query.equal('instanceId', this.instanceId)]
			);

			return response.documents.length > 0 ? response.documents[0] as unknown as QueueDocument : null;
		}, 'getQueueState');
	}

	/**
	 * Initialize or update queue state
	 */
	async initializeQueueState(playlistId: string = 'global_default_playlist'): Promise<QueueDocument> {
		if (!this.checkRateLimit('initializeQueueState')) {
			throw new Error('Rate limit exceeded for initializeQueueState');
		}

		return this.retryOperation(async () => {
			// Check if queue already exists
			const existing = await this.getQueueState();
			
			if (existing) {
				// Update existing queue
				const updated = await this.databases.updateDocument(
					this.databaseId,
					COLLECTIONS.ACTIVE_QUEUES,
					existing.$id,
					{
						sourcePlaylistId: playlistId,
						lastUpdated: new Date().toISOString()
					}
				);
				return updated as unknown as QueueDocument;
			} else {
				// Create new queue
				console.log('🎵 JukeboxServiceV3: Creating new queue with instanceId:', this.instanceId, 'length:', this.instanceId?.length);
				
				try {
					const created = await this.databases.createDocument(
						this.databaseId,
						COLLECTIONS.ACTIVE_QUEUES,
						ID.unique(),
						{
							instanceId: this.instanceId,
							sourcePlaylistId: playlistId,
							memoryPlaylist: JSON.stringify([]),
							currentTrackIndex: 0,
							priorityQueue: JSON.stringify([]),
							isShuffled: false,
							shuffleSeed: 0,
							lastUpdated: new Date().toISOString()
						}
					);
					return created as unknown as QueueDocument;
				} catch (err: any) {
					if (err?.code === 409) {
						// Document already exists, fetch and return it
						const fallback = await this.getQueueState();
						if (fallback) return fallback;
					}
					throw err;
				}
			}
		}, 'initializeQueueState');
	}

	/**
	 * Load playlist into the queue
	 */
	async loadPlaylist(playlistId: string = 'global_default_playlist'): Promise<InMemoryPlaylistItem[]> {
		if (!this.checkRateLimit('loadPlaylist')) {
			throw new Error('Rate limit exceeded for loadPlaylist');
		}

		if (!playlistId) {
			throw new Error('playlistId is required');
		}

		return this.retryOperation(async () => {
			// Get playlist from playlists collection
			const playlist = await this.databases.getDocument(
				this.databaseId,
				COLLECTIONS.PLAYLISTS,
				playlistId
			);

			// Parse tracks from playlist
			const tracks: InMemoryPlaylistItem[] = JSON.parse(playlist.tracks || '[]');
			
			// Update queue with new playlist
			const queueState = await this.getQueueState();
			if (queueState) {
				await this.databases.updateDocument(
					this.databaseId,
					COLLECTIONS.ACTIVE_QUEUES,
					queueState.$id,
					{
						sourcePlaylistId: playlistId,
						memoryPlaylist: JSON.stringify(tracks),
						currentTrackIndex: 0,
						lastUpdated: new Date().toISOString()
					}
				);
			} else {
				// Create new queue with playlist
				await this.databases.createDocument(
					this.databaseId,
					COLLECTIONS.ACTIVE_QUEUES,
					ID.unique(),
					{
						instanceId: this.instanceId,
						sourcePlaylistId: playlistId,
						memoryPlaylist: JSON.stringify(tracks),
						currentTrackIndex: 0,
						priorityQueue: JSON.stringify([]),
						isShuffled: false,
						shuffleSeed: 0,
						lastUpdated: new Date().toISOString()
					}
				);
			}

			return tracks;
		}, 'loadPlaylist');
	}

	/**
	 * Get current track from queue
	 */
	async getCurrentTrack(): Promise<InMemoryPlaylistItem | null> {
		const queueState = await this.getQueueState();
		if (!queueState) return null;

		const playlist: InMemoryPlaylistItem[] = typeof queueState.memoryPlaylist === 'string' 
			? JSON.parse(queueState.memoryPlaylist) 
			: queueState.memoryPlaylist;

		const priorityQueue: PriorityQueueItem[] = typeof queueState.priorityQueue === 'string'
			? JSON.parse(queueState.priorityQueue)
			: queueState.priorityQueue;

		// Check priority queue first
		if (priorityQueue.length > 0) {
			// Convert PriorityQueueItem to InMemoryPlaylistItem format
			const priorityTrack = priorityQueue[0];
			return {
				...priorityTrack,
				playCount: 0,
				isActive: true,
				shuffleOrder: 0,
				addedToPlaylistAt: priorityTrack.timestamp
			} as InMemoryPlaylistItem;
		}

		// Return current track from main playlist
		if (playlist.length > 0 && queueState.currentTrackIndex < playlist.length) {
			return playlist[queueState.currentTrackIndex];
		}

		return null;
	}

	/**
	 * Advance to next track
	 */
	async nextTrack(): Promise<InMemoryPlaylistItem | null> {
		if (!this.checkRateLimit('nextTrack')) {
			throw new Error('Rate limit exceeded for nextTrack');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) return null;

			const playlist: InMemoryPlaylistItem[] = typeof queueState.memoryPlaylist === 'string' 
				? JSON.parse(queueState.memoryPlaylist) 
				: queueState.memoryPlaylist;

			let priorityQueue: PriorityQueueItem[] = typeof queueState.priorityQueue === 'string'
				? JSON.parse(queueState.priorityQueue)
				: queueState.priorityQueue;

			let nextTrack: InMemoryPlaylistItem | null = null;
			let newIndex = queueState.currentTrackIndex;

			// Check priority queue first
			if (priorityQueue.length > 0) {
				const priorityTrack = priorityQueue.shift()!;
				nextTrack = {
					...priorityTrack,
					playCount: 0,
					isActive: true,
					shuffleOrder: 0,
					addedToPlaylistAt: priorityTrack.timestamp
				} as InMemoryPlaylistItem;
				// Update priority queue
				await this.databases.updateDocument(
					this.databaseId,
					COLLECTIONS.ACTIVE_QUEUES,
					queueState.$id,
					{
						priorityQueue: JSON.stringify(priorityQueue),
						lastUpdated: new Date().toISOString()
					}
				);
			} else {
				// Move to next in main playlist
				newIndex = queueState.currentTrackIndex + 1;
				if (newIndex < playlist.length) {
					nextTrack = playlist[newIndex];
				} else {
					// Loop back to start
					newIndex = 0;
					nextTrack = playlist.length > 0 ? playlist[0] : null;
				}

				// Update current track index
				await this.databases.updateDocument(
					this.databaseId,
					COLLECTIONS.ACTIVE_QUEUES,
					queueState.$id,
					{
						currentTrackIndex: newIndex,
						lastUpdated: new Date().toISOString()
					}
				);
			}

			return nextTrack;
		}, 'nextTrack');
	}

	/**
	 * Add track to priority queue
	 */
	async addToPriorityQueue(track: PriorityQueueItem): Promise<void> {
		if (!this.checkRateLimit('addToPriorityQueue')) {
			throw new Error('Rate limit exceeded for addToPriorityQueue');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) {
				throw new Error('Queue not initialized');
			}

			let priorityQueue: PriorityQueueItem[] = typeof queueState.priorityQueue === 'string'
				? JSON.parse(queueState.priorityQueue)
				: queueState.priorityQueue;

			priorityQueue.push(track);

			await this.databases.updateDocument(
				this.databaseId,
				COLLECTIONS.ACTIVE_QUEUES,
				queueState.$id,
				{
					priorityQueue: JSON.stringify(priorityQueue),
					lastUpdated: new Date().toISOString()
				}
			);
		}, 'addToPriorityQueue');
	}

	/**
	 * Toggle shuffle mode
	 */
	async toggleShuffle(): Promise<boolean> {
		if (!this.checkRateLimit('toggleShuffle')) {
			throw new Error('Rate limit exceeded for toggleShuffle');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) return false;

			const newShuffleState = !queueState.isShuffled;
			const newSeed = newShuffleState ? Math.floor(Math.random() * 1000000) : 0;

			await this.databases.updateDocument(
				this.databaseId,
				COLLECTIONS.ACTIVE_QUEUES,
				queueState.$id,
				{
					isShuffled: newShuffleState,
					shuffleSeed: newSeed,
					lastUpdated: new Date().toISOString()
				}
			);

			return newShuffleState;
		}, 'toggleShuffle');
	}

	/**
	 * Subscribe to real-time queue updates
	 */
	subscribeToQueueUpdates(callback: (queueState: QueueDocument) => void) {
		return this.client.subscribe(
			`databases.${this.databaseId}.collections.${COLLECTIONS.ACTIVE_QUEUES}.documents`,
			(response) => {
				if (response.payload && (response.payload as any).instanceId === this.instanceId) {
					callback(response.payload as unknown as QueueDocument);
				}
			}
		);
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		this.rateLimitFuse.clear();
	}

	// ==========================================
	// COMPATIBILITY METHODS FOR OLD INTERFACE
	// ==========================================

	/**
	 * Legacy compatibility: Get jukebox state
	 * Maps to player instance + queue state
	 */
	async getJukeboxState(): Promise<JukeboxState | null> {
		try {
			const queueState = await this.getQueueState();
			if (!queueState) return null;

			const currentTrack = await this.getCurrentTrack();
			
			// Convert queue state to legacy JukeboxState format
			const jukeboxState: JukeboxState = {
				$id: queueState.$id,
				isPlayerRunning: currentTrack !== null,
				isPlayerPaused: false, // This would come from player instance state
				currentVideoId: currentTrack?.videoId || null,
				currentlyPlaying: currentTrack?.title || null,
				currentChannelTitle: currentTrack?.channelTitle || null,
				currentThumbnail: currentTrack?.thumbnail || null,
				currentVideoDuration: currentTrack?.duration || null,
				lastPlayedVideoId: null, // Could be stored in player state
				playerStatus: 'ready',
				isReadyForNextSong: true,
				instanceId: this.instanceId,
				lastUpdated: queueState.lastUpdated,
				currentPosition: 0,
				totalDuration: 0,
				volume: 100
			};

			return jukeboxState;
		} catch (error) {
			console.error('🎵 getJukeboxState error:', error);
			return null;
		}
	}

	/**
	 * Legacy compatibility: Initialize jukebox state
	 */
	async initializeJukeboxState(): Promise<JukeboxState> {
		const queueState = await this.initializeQueueState();
		
		// Convert to legacy format
		const jukeboxState: JukeboxState = {
			$id: queueState.$id,
			isPlayerRunning: false,
			isPlayerPaused: false,
			currentVideoId: null,
			currentlyPlaying: null,
			currentChannelTitle: null,
			currentThumbnail: null,
			currentVideoDuration: null,
			lastPlayedVideoId: null,
			playerStatus: 'ready',
			isReadyForNextSong: true,
			instanceId: this.instanceId,
			lastUpdated: queueState.lastUpdated,
			currentPosition: 0,
			totalDuration: 0,
			volume: 100
		};

		return jukeboxState;
	}

	/**
	 * Legacy compatibility: Update jukebox state
	 */
	async updateJukeboxState(updates: Partial<JukeboxState>): Promise<JukeboxState> {
		const queueState = await this.getQueueState();
		if (!queueState) {
			throw new Error('Queue not initialized');
		}

		// For now, just update the lastUpdated timestamp
		// In a full implementation, we'd map the updates to the appropriate collections
		await this.databases.updateDocument(
			this.databaseId,
			COLLECTIONS.ACTIVE_QUEUES,
			queueState.$id,
			{
				lastUpdated: new Date().toISOString()
			}
		);

		// Return updated state
		return this.getJukeboxState() as Promise<JukeboxState>;
	}

	/**
	 * Legacy compatibility: Subscribe to jukebox state changes
	 */
	subscribeToJukeboxState(callback: (state: JukeboxState) => void) {
		return this.subscribeToQueueUpdates(async (queueState: QueueDocument) => {
			// Convert queue state to legacy jukebox state format
			const currentTrack = await this.getCurrentTrack();
			
			const jukeboxState: JukeboxState = {
				$id: queueState.$id,
				isPlayerRunning: currentTrack !== null,
				isPlayerPaused: false,
				currentVideoId: currentTrack?.videoId || null,
				currentlyPlaying: currentTrack?.title || null,
				currentChannelTitle: currentTrack?.channelTitle || null,
				currentThumbnail: currentTrack?.thumbnail || null,
				currentVideoDuration: currentTrack?.duration || null,
				lastPlayedVideoId: null,
				playerStatus: 'ready',
				isReadyForNextSong: true,
				instanceId: this.instanceId,
				lastUpdated: queueState.lastUpdated,
				currentPosition: 0,
				totalDuration: 0,
				volume: 100
			};

			callback(jukeboxState);
		});
	}

	/**
	 * Legacy compatibility: Get priority queue
	 */
	async getPriorityQueue(): Promise<PriorityQueueItem[]> {
		if (!this.checkRateLimit('getPriorityQueue')) {
			throw new Error('Rate limit exceeded for getPriorityQueue');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) {
				return [];
			}

			// Parse priority queue from JSON string
			try {
				return typeof queueState.priorityQueue === 'string' 
					? JSON.parse(queueState.priorityQueue) 
					: queueState.priorityQueue || [];
			} catch (error) {
				console.warn('🎵 JukeboxServiceV3: Failed to parse priority queue:', error);
				return [];
			}
		}, 'getPriorityQueue');
	}

	/**
	 * Legacy compatibility: Subscribe to queue changes
	 */
	subscribeToQueue(callback: (queue: PriorityQueueItem[]) => void): () => void {
		return this.subscribeToQueueUpdates(async (queueState: QueueDocument) => {
			try {
				const queue = typeof queueState.priorityQueue === 'string' 
					? JSON.parse(queueState.priorityQueue) 
					: queueState.priorityQueue || [];
				callback(queue);
			} catch (error) {
				console.warn('🎵 JukeboxServiceV3: Failed to parse priority queue in subscription:', error);
				callback([]);
			}
		});
	}

	/**
	 * Legacy compatibility: Get next track from playlist
	 */
	async getNextFromPlaylist(lastPlayedVideoId?: string): Promise<InMemoryPlaylistItem | null> {
		if (!this.checkRateLimit('getNextFromPlaylist')) {
			throw new Error('Rate limit exceeded for getNextFromPlaylist');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) {
				return null;
			}

			// Parse memory playlist from JSON string
			let playlist: InMemoryPlaylistItem[] = [];
			try {
				playlist = typeof queueState.memoryPlaylist === 'string' 
					? JSON.parse(queueState.memoryPlaylist) 
					: queueState.memoryPlaylist || [];
			} catch (error) {
				console.warn('🎵 JukeboxServiceV3: Failed to parse memory playlist:', error);
				return null;
			}

			if (playlist.length === 0) {
				return null;
			}

			// Handle shuffle mode
			if (queueState.isShuffled) {
				// Use shuffle seed for consistent randomization
				const shuffledIndex = (queueState.shuffleSeed || 0) % playlist.length;
				return playlist[shuffledIndex];
			}

			// Linear playback - find next track after lastPlayedVideoId
			if (lastPlayedVideoId) {
				const currentIndex = playlist.findIndex(track => track.videoId === lastPlayedVideoId);
				if (currentIndex >= 0) {
					const nextIndex = (currentIndex + 1) % playlist.length;
					return playlist[nextIndex];
				}
			}

			// Return first track or current track based on index
			const currentIndex = Math.max(0, queueState.currentTrackIndex || 0);
			return playlist[currentIndex % playlist.length];
		}, 'getNextFromPlaylist');
	}

	/**
	 * Legacy compatibility: Remove track from priority queue
	 */
	async removeFromPriorityQueue(trackId: string): Promise<void> {
		if (!this.checkRateLimit('removeFromPriorityQueue')) {
			throw new Error('Rate limit exceeded for removeFromPriorityQueue');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) {
				return;
			}

			// Parse current priority queue
			let queue: PriorityQueueItem[] = [];
			try {
				queue = typeof queueState.priorityQueue === 'string' 
					? JSON.parse(queueState.priorityQueue) 
					: queueState.priorityQueue || [];
			} catch (error) {
				console.warn('🎵 JukeboxServiceV3: Failed to parse priority queue for removal:', error);
				return;
			}

			// Remove the track
			const updatedQueue = queue.filter(track => track.$id !== trackId);

			// Update the queue in database
			await this.databases.updateDocument(
				this.databaseId,
				COLLECTIONS.ACTIVE_QUEUES,
				queueState.$id,
				{
					priorityQueue: JSON.stringify(updatedQueue),
					lastUpdated: new Date().toISOString()
				}
			);
		}, 'removeFromPriorityQueue');
	}

	/**
	 * Add a song request to the priority queue (alias for addToPriorityQueue with different parameter structure)
	 */
	async addRequestToQueue(request: {
		videoId: string;
		title: string;
		channelTitle: string;
		thumbnail?: string;
		duration?: string;
	}): Promise<void> {
		if (!this.checkRateLimit('addRequestToQueue')) {
			throw new Error('Rate limit exceeded for addRequestToQueue');
		}

		const priorityItem: PriorityQueueItem = {
			videoId: request.videoId,
			title: request.title,
			channelTitle: request.channelTitle,
			thumbnail: request.thumbnail,
			duration: request.duration,
			timestamp: new Date().toISOString(),
			priority: 1 // Default priority
		};

		return this.addToPriorityQueue(priorityItem);
	}

	/**
	 * Move a queue item to the end instead of removing it (circular queue behavior)
	 */
	async moveQueueItemToEnd(itemId: string): Promise<void> {
		if (!this.checkRateLimit('moveQueueItemToEnd')) {
			throw new Error('Rate limit exceeded for moveQueueItemToEnd');
		}

		return this.retryOperation(async () => {
			const queueState = await this.getQueueState();
			if (!queueState) {
				throw new Error('Queue not initialized');
			}

			let priorityQueue: PriorityQueueItem[] = typeof queueState.priorityQueue === 'string'
				? JSON.parse(queueState.priorityQueue)
				: queueState.priorityQueue;

			// Find the item to move
			const itemIndex = priorityQueue.findIndex(item => item.$id === itemId);
			if (itemIndex === -1) {
				throw new Error(`Queue item with ID ${itemId} not found`);
			}

			// Remove item from current position and add to end
			const [item] = priorityQueue.splice(itemIndex, 1);
			priorityQueue.push(item);

			// Update the queue in database
			await this.databases.updateDocument(
				this.databaseId,
				COLLECTIONS.ACTIVE_QUEUES,
				queueState.$id,
				{
					priorityQueue: JSON.stringify(priorityQueue),
					lastUpdated: new Date().toISOString()
				}
			);
		}, 'moveQueueItemToEnd');
	}
}

export { JukeboxServiceV3 };
export type { QueueDocument, PlayerInstanceDocument };