// Core Jukebox Orchestrator - The Five Key Functions
import { JukeboxService } from './jukeboxService';
import { BackgroundQueueManager } from './backgroundQueueManager';
import type { 
	JukeboxState, 
	PriorityQueueItem, 
	InMemoryPlaylistItem 
} from '../types/jukebox';

export class JukeboxOrchestrator {
	private jukeboxService: JukeboxService;
	private playerWindow: Window | null = null;
	private backgroundQueueManager: BackgroundQueueManager | null = null;
	private instanceId: string;

	constructor(jukeboxService: JukeboxService, instanceId: string = 'default') {
		this.jukeboxService = jukeboxService;
		this.instanceId = instanceId;
		this.initializeRealtimeListeners();
	}

	// ===== 1. LOAD PLAYLIST =====
	async loadPlaylist(playlistId: string = 'global_default_playlist'): Promise<void> {
		console.log('🎵 Orchestrator: Loading playlist...');
		
		try {
			// Fetch and populate inMemoryPlaylist via service
			const playlist = await this.jukeboxService.loadPlaylist(playlistId);
			
			if (playlist.length === 0) {
				console.warn('🎵 Orchestrator: Playlist is empty, implementing fallback...');
				// TODO: Implement robust error handling and fallback mechanism
				// Primary source failure -> secondary source (public playlist scraping)
				return;
			}

			console.log(`🎵 Orchestrator: Loaded ${playlist.length} songs into memory`);
			
			// Initialize jukebox state if needed
			let state = await this.jukeboxService.getJukeboxState();
			if (!state) {
				state = await this.jukeboxService.initializeJukeboxState();
			}

			// Mark ready for first song if playlist is loaded and player is idle
			if (state.playerStatus === 'ready' && state.isReadyForNextSong) {
				await this.playNextSong();
			}

		} catch (error) {
			console.error('🎵 Orchestrator: Failed to load playlist:', error);
			throw error;
		}
	}

	// ===== 2. ADD REQUEST TO QUEUE =====
	async addRequestToQueue(
		videoId: string, 
		title: string, 
		channelTitle: string,
		thumbnail?: string,
		duration?: string
	): Promise<void> {
		console.log('🎵 Orchestrator: Adding request to queue:', title);

		try {
			await this.jukeboxService.addRequestToQueue({
				videoId,
				title,
				channelTitle,
				thumbnail,
				duration
			});

			console.log('🎵 Orchestrator: Song added to priority queue successfully');
			
			// Check if we should immediately play this song
			const state = await this.jukeboxService.getJukeboxState();
			if (state?.isReadyForNextSong && !state.isPlayerRunning) {
				await this.playNextSong();
			}

		} catch (error) {
			console.error('🎵 Orchestrator: Failed to add request:', error);
			throw error;
		}
	}

	// ===== 3. PLAY NEXT SONG (The Critical Orchestrator) =====
	async playNextSong(): Promise<void> {
		console.log('🎵 Orchestrator: Determining next song to play...');

		try {
			const state = await this.jukeboxService.getJukeboxState();
			if (!state) {
				console.error('🎵 Orchestrator: No jukebox state available');
				return;
			}

			let nextSong: PriorityQueueItem | InMemoryPlaylistItem | null = null;
			let isFromQueue = false;

			// STEP 1: Check priority queue first
			const queue = await this.jukeboxService.getPriorityQueue();
			if (queue.length > 0) {
				nextSong = queue[0];
				isFromQueue = true;
				console.log('🎵 Orchestrator: Playing from priority queue:', nextSong.title);
				
				// Remove from queue after selection
				await this.jukeboxService.removeFromPriorityQueue(nextSong.$id!);
			} else {
				// STEP 2: Get from inMemoryPlaylist (cycling logic)
				console.log('🎵 Orchestrator: Priority queue empty, getting from playlist...');
				nextSong = await this.jukeboxService.getNextFromPlaylist(state.lastPlayedVideoId || undefined);
			}

			if (!nextSong) {
				console.warn('🎵 Orchestrator: No songs available to play');
				return;
			}

			// STEP 3: Duplicate check (prevent immediate repeats)
			if (state.lastPlayedVideoId === nextSong.videoId && !isFromQueue) {
				console.log('🎵 Orchestrator: Skipping duplicate song, finding alternative...');
				// Recursively call to find a different song
				await this.playNextSong();
				return;
			}

			// STEP 4: Play the selected song
			await this.playSong(nextSong.videoId, nextSong.title, nextSong.channelTitle);

		} catch (error) {
			console.error('🎵 Orchestrator: Error in playNextSong:', error);
		}
	}

	// ===== 4. PLAY SONG =====
	async playSong(videoId: string, title: string, channelTitle: string): Promise<void> {
		console.log('🎵 Orchestrator: Playing song:', title);

		try {
			// STEP 1: Update jukebox state with new current track
			await this.jukeboxService.updateJukeboxState({
				currentVideoId: videoId,
				currentlyPlaying: title,
				isPlayerRunning: true,
				isPlayerPaused: false,
				playerStatus: 'loading',
				isReadyForNextSong: false,
				currentPosition: 0
			});

			// STEP 2: Ensure player window is available
			await this.ensurePlayerWindow();

			// STEP 3: Send command to player via Appwrite (real-time)
			// The player window subscribed to JukeboxState will receive this update
			// and load the new video automatically

			console.log('🎵 Orchestrator: Song command sent via Appwrite real-time');

		} catch (error) {
			console.error('🎵 Orchestrator: Failed to play song:', error);
			
			// Update state to reflect error
			await this.jukeboxService.updateJukeboxState({
				playerStatus: 'error',
				isReadyForNextSong: true
			});
		}
	}

	// ===== 5. HANDLE VIDEO ENDED =====
	async handleVideoEnded(): Promise<void> {
		console.log('🎵 Orchestrator: Video ended, preparing for next song...');

		try {
			// Update state to reflect end and prepare for next song
			const state = await this.jukeboxService.getJukeboxState();
			if (!state) return;

			await this.jukeboxService.updateJukeboxState({
				lastPlayedVideoId: state.currentVideoId,
				currentVideoId: null,
				currentlyPlaying: null,
				isPlayerRunning: false,
				isPlayerPaused: false,
				playerStatus: 'ready',
				isReadyForNextSong: true,
				currentPosition: 0,
				totalDuration: 0
			});

			console.log('🎵 Orchestrator: State updated to ready for next song');
			console.log('🎵 Orchestrator: Background queue manager will handle automatic progression');
			
			// NOTE: We don't call playNextSong() here anymore!
			// The BackgroundQueueManager will detect the state change via real-time
			// and automatically call progressQueue() to handle the next song.

		} catch (error) {
			console.error('🎵 Orchestrator: Error handling video end:', error);
		}
	}

	// ===== HELPER METHODS =====

	private async ensurePlayerWindow(): Promise<void> {
		// Check if player window exists and is still open
		if (this.playerWindow && !this.playerWindow.closed) {
			return; // Player window is ready
		}

		// Open new player window if needed
		// This should integrate with your existing window management
		console.log('🎵 Orchestrator: Player window check - assuming videoplayer route handles this');
	}

	private initializeRealtimeListeners(): void {
		// Subscribe to jukebox state changes
		this.jukeboxService.subscribeToJukeboxState((state: JukeboxState) => {
			this.handleStateChange(state);
		});
	}

	private async handleStateChange(state: JukeboxState): Promise<void> {
		// Handle specific state changes that require orchestration
		if (state.playerStatus === 'ended' && state.isReadyForNextSong) {
			await this.handleVideoEnded();
		}
	}

	// ===== PUBLIC CONTROL METHODS =====

	async pausePlayer(): Promise<void> {
		await this.jukeboxService.updateJukeboxState({
			isPlayerPaused: true,
			playerStatus: 'paused'
		});
	}

	async resumePlayer(): Promise<void> {
		await this.jukeboxService.updateJukeboxState({
			isPlayerPaused: false,
			playerStatus: 'playing'
		});
	}

	async stopPlayer(): Promise<void> {
		await this.jukeboxService.updateJukeboxState({
			isPlayerRunning: false,
			isPlayerPaused: false,
			currentVideoId: null,
			currentlyPlaying: null,
			playerStatus: 'ready',
			isReadyForNextSong: true,
			currentPosition: 0
		});
	}

	async skipToNext(): Promise<void> {
		await this.playNextSong();
	}

	async skipToPrevious(): Promise<void> {
		console.log('🎵 Orchestrator: Skip to previous requested');
		
		try {
			const state = await this.jukeboxService.getJukeboxState();
			if (!state) return;

			// For "previous", we have a few options:
			// 1. If we're less than 5 seconds into current song, go to actual previous song
			// 2. If we're more than 5 seconds in, restart current song
			// 3. Look at recently played songs to go backwards

			if (state.currentPosition < 5 && state.lastPlayedVideoId) {
				// Go to the last played song
				console.log('🎵 Orchestrator: Going to last played song:', state.lastPlayedVideoId);
				
				// Try to find the last played song in the playlist
				const lastSong = await this.jukeboxService.getNextFromPlaylist(state.lastPlayedVideoId);
				if (lastSong) {
					await this.playSong(lastSong.videoId, lastSong.title, lastSong.channelTitle);
				} else {
					console.log('🎵 Orchestrator: Last played song not found, restarting current');
					await this.restartCurrentSong();
				}
			} else {
				// Restart current song
				console.log('🎵 Orchestrator: Restarting current song');
				await this.restartCurrentSong();
			}

		} catch (error) {
			console.error('🎵 Orchestrator: Error in skipToPrevious:', error);
		}
	}

	private async restartCurrentSong(): Promise<void> {
		const state = await this.jukeboxService.getJukeboxState();
		if (state?.currentVideoId && state.currentlyPlaying) {
			// Reset position and reload the same song
			await this.jukeboxService.updateJukeboxState({
				currentPosition: 0,
				playerStatus: 'loading'
			});
			
			// This will trigger the video player to restart the current video
			await this.playSong(state.currentVideoId, state.currentlyPlaying, 'Unknown');
		}
	}

	// ===== BACKGROUND QUEUE MANAGEMENT =====

	async startBackgroundQueueManager(): Promise<void> {
		if (this.backgroundQueueManager?.isRunning()) {
			console.log('🎵 Orchestrator: Background queue manager already running');
			return;
		}

		console.log('🎵 Orchestrator: Starting background queue manager...');

		try {
			this.backgroundQueueManager = new BackgroundQueueManager(this.jukeboxService, this.instanceId);
			await this.backgroundQueueManager.start();
			console.log('✅ Orchestrator: Background queue manager started');
		} catch (error) {
			console.error('❌ Orchestrator: Failed to start background queue manager:', error);
			this.backgroundQueueManager = null;
			throw error;
		}
	}

	async stopBackgroundQueueManager(): Promise<void> {
		if (!this.backgroundQueueManager) {
			console.log('🎵 Orchestrator: Background queue manager not running');
			return;
		}

		console.log('🎵 Orchestrator: Stopping background queue manager...');

		try {
			await this.backgroundQueueManager.stop();
			this.backgroundQueueManager = null;
			console.log('✅ Orchestrator: Background queue manager stopped');
		} catch (error) {
			console.error('❌ Orchestrator: Failed to stop background queue manager:', error);
		}
	}

	isBackgroundQueueManagerRunning(): boolean {
		return this.backgroundQueueManager?.isRunning() || false;
	}

	// Use background queue manager for queue operations if available
	async addToBackgroundQueue(videoId: string, title: string, channelTitle: string, thumbnail?: string, duration?: string): Promise<void> {
		if (this.backgroundQueueManager) {
			await this.backgroundQueueManager.addToQueue(videoId, title, channelTitle, thumbnail, duration);
		} else {
			// Fallback to regular queue
			await this.addRequestToQueue(videoId, title, channelTitle, thumbnail, duration);
		}
	}

	async skipCurrentSong(): Promise<void> {
		if (this.backgroundQueueManager) {
			await this.backgroundQueueManager.skipCurrent();
		} else {
			// Fallback to regular method
			await this.playNextSong();
		}
	}
}