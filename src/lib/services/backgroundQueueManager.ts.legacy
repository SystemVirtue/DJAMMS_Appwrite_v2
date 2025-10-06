// Background Queue Management Service
// This service runs automatically when any video player connects
// It manages the queue progression without requiring a UI component to be open

import { JukeboxService } from './jukeboxService';
import type { JukeboxState, PriorityQueueItem, InMemoryPlaylistItem } from '../types/jukebox';

export class BackgroundQueueManager {
	private jukeboxService: JukeboxService;
	private isActive: boolean = false;
	private stateSubscription: (() => void) | null = null;
	private queueSubscription: (() => void) | null = null;
	private playlistSubscription: (() => void) | null = null;
	private instanceId: string;

	constructor(jukeboxService: JukeboxService, instanceId: string) {
		this.jukeboxService = jukeboxService;
		this.instanceId = instanceId;
		console.log(`🎵 BackgroundQueueManager: Initialized for instance ${instanceId}`);
	}

	// ===== LIFECYCLE MANAGEMENT =====

	async start(): Promise<void> {
		if (this.isActive) {
			console.log('🎵 BackgroundQueueManager: Already active');
			return;
		}

		console.log('🎵 BackgroundQueueManager: Starting background queue management...');
		this.isActive = true;

		try {
			// Initialize jukebox state if needed
			let state = await this.jukeboxService.getJukeboxState();
			if (!state) {
				state = await this.jukeboxService.initializeJukeboxState();
			}

			// Set up real-time listeners
			this.setupRealtimeListeners();

			// Load default playlist if none exists
			await this.ensurePlaylistLoaded();

			// If no song is playing and queue has items, start first song
			if (state.isReadyForNextSong && !state.currentVideoId) {
				console.log('🎵 BackgroundQueueManager: No song playing, checking queue...');
				await this.progressQueue();
			}

			console.log('✅ BackgroundQueueManager: Background queue management active');

		} catch (error) {
			console.error('❌ BackgroundQueueManager: Failed to start:', error);
			this.isActive = false;
			throw error;
		}
	}

	async stop(): Promise<void> {
		console.log('🎵 BackgroundQueueManager: Stopping background queue management...');
		
		this.isActive = false;

		// Clean up subscriptions
		if (this.stateSubscription) {
			this.stateSubscription();
			this.stateSubscription = null;
		}

		if (this.queueSubscription) {
			this.queueSubscription();
			this.queueSubscription = null;
		}

		if (this.playlistSubscription) {
			this.playlistSubscription();
			this.playlistSubscription = null;
		}

		console.log('✅ BackgroundQueueManager: Stopped');
	}

	// ===== REAL-TIME LISTENERS =====

	private setupRealtimeListeners(): void {
		console.log('🎵 BackgroundQueueManager: Setting up real-time listeners...');

		// Listen for jukebox state changes
		this.stateSubscription = this.jukeboxService.subscribeToJukeboxState(
			(state: JukeboxState) => this.handleStateChange(state)
		);

		// Listen for priority queue changes
		this.queueSubscription = this.jukeboxService.subscribeToQueue(
			(queue: PriorityQueueItem[]) => this.handleQueueChange(queue)
		);

		console.log('✅ BackgroundQueueManager: Real-time listeners active');
	}

	private async handleStateChange(state: JukeboxState): Promise<void> {
		if (!this.isActive) return;

		console.log('🎵 BackgroundQueueManager: State change detected:', state.playerStatus);

		// Handle video end - this is the key automatic progression
		if (state.isReadyForNextSong && !state.currentVideoId) {
			console.log('🎵 BackgroundQueueManager: Video ended, progressing queue automatically...');
			await this.progressQueue();
		}

		// Handle player errors
		if (state.playerStatus === 'error') {
			console.log('🎵 BackgroundQueueManager: Player error detected, skipping to next song...');
			setTimeout(() => this.progressQueue(), 2000); // Small delay for error recovery
		}
	}

	private async handleQueueChange(queue: PriorityQueueItem[]): Promise<void> {
		if (!this.isActive) return;

		console.log(`🎵 BackgroundQueueManager: Queue updated - ${queue.length} items`);

		// If a new song was added and nothing is playing, start it
		const state = await this.jukeboxService.getJukeboxState();
		if (queue.length > 0 && state?.isReadyForNextSong && !state.currentVideoId) {
			console.log('🎵 BackgroundQueueManager: New song added to empty queue, starting playback...');
			await this.progressQueue();
		}
	}

	// ===== QUEUE PROGRESSION LOGIC =====

	async progressQueue(): Promise<void> {
		if (!this.isActive) {
			console.log('🎵 BackgroundQueueManager: Not active, skipping queue progression');
			return;
		}

		console.log('🎵 BackgroundQueueManager: Progressing queue...');

		try {
			const state = await this.jukeboxService.getJukeboxState();
			if (!state) {
				console.error('🎵 BackgroundQueueManager: No jukebox state available');
				return;
			}

			console.log('🎵 BackgroundQueueManager: Current state - lastPlayed:', state.lastPlayedVideoId, 'isReady:', state.isReadyForNextSong);

			let nextSong: PriorityQueueItem | InMemoryPlaylistItem | null = null;
			let isFromQueue = false;

			// STEP 1: Check priority queue first (user requests)
			const queue = await this.jukeboxService.getPriorityQueue();
			console.log(`🎵 BackgroundQueueManager: Priority queue has ${queue.length} items`);
			
			if (queue.length > 0) {
				nextSong = queue[0];
				isFromQueue = true;
				console.log('🎵 BackgroundQueueManager: Playing from priority queue:', nextSong.title);
				console.log('🎵 BackgroundQueueManager: Queue item ID:', nextSong.$id, 'Priority:', nextSong.priority);
				
				// Move current item to end of queue instead of removing it
				// This implements the circular queue behavior: Item #1 becomes "now_playing"
				// and moves to the end, all other items move up one position
				await this.jukeboxService.moveQueueItemToEnd(nextSong.$id!);
				console.log('🎵 BackgroundQueueManager: Moved current song to end of queue');
			} else {
				// STEP 2: Get from playlist (cycling background music)
				console.log('🎵 BackgroundQueueManager: Priority queue empty, getting from playlist...');
				nextSong = await this.jukeboxService.getNextFromPlaylist(state.lastPlayedVideoId || undefined);
			}

			if (!nextSong) {
				console.warn('🎵 BackgroundQueueManager: No songs available to play');
				// Try to reload playlist
				await this.ensurePlaylistLoaded();
				return;
			}

			// STEP 3: Duplicate check (prevent immediate repeats for playlist songs)
			if (!isFromQueue && state.lastPlayedVideoId === nextSong.videoId) {
				console.log('🎵 BackgroundQueueManager: Preventing immediate repeat, finding alternative...');
				// Try to get a different song
				const altSong = await this.jukeboxService.getNextFromPlaylist(nextSong.videoId);
				if (altSong && altSong.videoId !== nextSong.videoId) {
					nextSong = altSong;
				}
			}

			// STEP 4: Play the selected song
			await this.playSong(nextSong);

		} catch (error) {
			console.error('🎵 BackgroundQueueManager: Error progressing queue:', error);
		}
	}

	private async playSong(song: PriorityQueueItem | InMemoryPlaylistItem): Promise<void> {
		console.log('🎵 BackgroundQueueManager: Playing song:', song.title);

		try {
			// Generate thumbnail URL for YouTube videos
			const thumbnail = (song as PriorityQueueItem).thumbnail || 
				`https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`;

			// Update jukebox state - this will trigger video player via real-time
			await this.jukeboxService.updateJukeboxState({
				currentVideoId: song.videoId,
				currentlyPlaying: song.title,
				currentChannelTitle: song.channelTitle,
				currentThumbnail: thumbnail,
				currentVideoDuration: (song as PriorityQueueItem).duration || null,
				isPlayerRunning: true,
				isPlayerPaused: false,
				playerStatus: 'loading',
				isReadyForNextSong: false,
				currentPosition: 0,
				lastUpdated: new Date().toISOString()
			});

			console.log('✅ BackgroundQueueManager: Song command sent via Appwrite real-time');

		} catch (error) {
			console.error('❌ BackgroundQueueManager: Failed to play song:', error);
			
			// Update state to reflect error and try next song
			await this.jukeboxService.updateJukeboxState({
				playerStatus: 'error',
				isReadyForNextSong: true
			});
		}
	}

	// ===== PLAYLIST MANAGEMENT =====

	private async ensurePlaylistLoaded(): Promise<void> {
		try {
			console.log('🎵 BackgroundQueueManager: Ensuring playlist is loaded...');
			
			// Check if memory playlist already has songs
			const existingPlaylist = await this.jukeboxService.loadPlaylist();
			
			if (existingPlaylist.length === 0) {
				console.log('🎵 BackgroundQueueManager: No songs in memory playlist, triggering fallback mechanism...');
				// Force a refresh by trying to load again - this will trigger fetchAndPopulatePlaylist
				const fallbackPlaylist = await this.jukeboxService.loadPlaylist();
				
				if (fallbackPlaylist.length > 0) {
					console.log(`✅ BackgroundQueueManager: Successfully loaded fallback playlist with ${fallbackPlaylist.length} songs`);
				} else {
					console.error('❌ BackgroundQueueManager: Fallback mechanism failed - no songs available');
				}
			} else {
				console.log(`✅ BackgroundQueueManager: Found ${existingPlaylist.length} songs in memory playlist`);
			}

		} catch (error) {
			console.error('❌ BackgroundQueueManager: Failed to ensure playlist loaded:', error);
			
			// Additional error context for debugging
			console.error('🔍 BackgroundQueueManager: This error means the video player will show "no songs in queue"');
			console.error('🔍 BackgroundQueueManager: Check Appwrite database connectivity and playlist collections');
		}
	}

	// ===== PUBLIC API =====

	async addToQueue(videoId: string, title: string, channelTitle: string, thumbnail?: string, duration?: string): Promise<void> {
		console.log('🎵 BackgroundQueueManager: Adding song to queue:', title);

		try {
			await this.jukeboxService.addRequestToQueue({
				videoId,
				title,
				channelTitle,
				thumbnail,
				duration
			});

			console.log('✅ BackgroundQueueManager: Song added to priority queue');

		} catch (error) {
			console.error('❌ BackgroundQueueManager: Failed to add song to queue:', error);
			throw error;
		}
	}

	async skipCurrent(): Promise<void> {
		console.log('🎵 BackgroundQueueManager: Skipping current song...');
		
		try {
			// Mark as ready for next song and progress queue
			await this.jukeboxService.updateJukeboxState({
				isReadyForNextSong: true,
				currentVideoId: null,
				currentlyPlaying: null,
				isPlayerRunning: false,
				playerStatus: 'ready'
			});

			// Progress to next song
			await this.progressQueue();

		} catch (error) {
			console.error('❌ BackgroundQueueManager: Failed to skip song:', error);
		}
	}

	async pausePlayback(): Promise<void> {
		await this.jukeboxService.updateJukeboxState({
			isPlayerPaused: true,
			playerStatus: 'paused'
		});
	}

	async resumePlayback(): Promise<void> {
		await this.jukeboxService.updateJukeboxState({
			isPlayerPaused: false,
			playerStatus: 'playing'
		});
	}

	// ===== STATUS =====

	isRunning(): boolean {
		return this.isActive;
	}

	getInstanceId(): string {
		return this.instanceId;
	}
}