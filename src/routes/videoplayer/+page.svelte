<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore, currentTrack, playerControls, venueStatus } from '$lib/stores/djamms';
	import { playerSync } from '$lib/services/playerSync';
	import { windowManager } from '$lib/services/windowManager';
	import { getDJAMMSService } from '$lib/services/serviceInit';
	import { client, DATABASE_ID } from '$lib/utils/appwrite';
	import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize2, Clock, Users, CheckCircle, AlertCircle, Music } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { InstanceIds } from '$lib/utils/idGenerator';
	import type { PageData } from './$types';

	// Accept SvelteKit data prop (external reference only)
	export const data = undefined;

	let playerContainer: HTMLDivElement;
	let player: any;
	let isPlayerReady = false;
	let currentVideo = ''; // Will be set from current active playlist
	let instanceId = InstanceIds.player();
	let statusUpdateInterval: NodeJS.Timeout | number;
	let shouldAutoPlay = true; // Auto-play the first song when player opens
	let djammsService = getDJAMMSService(); // New unified service
	
	// Timeline control variables
	let currentTime = 0;
	let duration = 0;
	let isDragging = false;
	
	// Load YouTube IFrame API
	onMount(async () => {
		// Check for duplicate instance first
		if (browser && windowManager.shouldPreventDuplicate()) {
			// Show alert and redirect
			alert('Video Player is already open in another window. Redirecting to dashboard.');
			window.location.href = '/djamms-dashboard';
			return;
		}

		// Set up instance ID for this player window
		if (browser) {
			// For now, just log the instance ID - venue player instance management will be handled differently
			console.log('🎵 VideoPlayer: Player instance ID:', instanceId);
		}

		// Subscribe to current track changes for automatic track changes
		currentTrack.subscribe(($track: any) => {
			if ($track && $track.video_id && $track.video_id !== currentVideo) {
				console.log('🎵 VideoPlayer: New track from venue:', $track.title);
				loadNewVideo($track.video_id, $track.title || 'Unknown Track');
			}
		});

		// Player state is managed through venue state - no local initialization needed

		// Initialize sync service to listen for requests from other windows
		if (browser) {
			playerSync.initialize();

			// Listen for track change requests from queue manager
			window.addEventListener('track-change-request', handleTrackChangeRequest);
		}

	// Load YouTube IFrame API first
	if (browser && !window.YT) {
		try {
			const script = document.createElement('script');
			script.src = 'https://www.youtube.com/iframe_api';
			script.onerror = (error) => {
				console.error('🎵 VideoPlayer: Failed to load YouTube API script:', error);
			};
			document.head.appendChild(script);
			
			// Wait for API to load
			window.onYouTubeIframeAPIReady = () => {
				try {
					console.log('🎵 YouTube API loaded');
					// Try to load first track and initialize player
					tryInitializeWithPlaylist();
				} catch (error) {
					console.error('🎵 VideoPlayer: Error in YouTube API ready callback:', error);
				}
			};
		} catch (error) {
			console.error('🎵 VideoPlayer: Error loading YouTube API:', error);
		}
	} else {
		// API already loaded, try to initialize
		tryInitializeWithPlaylist();
	}
	});

	// Function to try initializing with playlist data
	async function tryInitializeWithPlaylist() {
		console.log('🎵 VideoPlayer: YouTube API ready, checking for current track...');

		try {
			// Check if there's already a current video from venue state
			let currentVenue = $djammsStore.currentVenue;
			
			// If no venue is set, load user venues and set the first one (or default)
			if (!currentVenue) {
				console.log('🎵 VideoPlayer: No current venue set, loading user venues...');
				try {
					const user = $djammsStore.currentUser;
					if (user) {
						await djammsStore.loadUserVenues(user.$id);
						const userVenues = $djammsStore.userVenues;
						
						if (userVenues.length > 0) {
							// Set the first venue as current (or find 'default' if it exists)
							const defaultVenue = userVenues.find(v => v.venue_id === 'default') || userVenues[0];
							console.log('🎵 VideoPlayer: Setting current venue to:', defaultVenue.venue_name);
							await djammsStore.setCurrentVenue(defaultVenue.$id);
							
							// Wait a moment for the venue state to update
							await new Promise(resolve => setTimeout(resolve, 100));
							currentVenue = $djammsStore.currentVenue;
						} else {
							console.log('🎵 VideoPlayer: No venues found for user');
						}
					} else {
						console.log('🎵 VideoPlayer: No authenticated user');
					}
				} catch (error) {
					console.error('🎵 VideoPlayer: Failed to load/set venue:', error);
				}
			}
			
			if (currentVenue && currentVenue.now_playing) {
				console.log('🎵 VideoPlayer: Found current track, loading:', currentVenue.now_playing.title);
				loadNewVideo(currentVenue.now_playing.video_id, currentVenue.now_playing.title);
			} else {
				console.log('🎵 VideoPlayer: No current track, checking if playlist is loaded...');

				// Check if we have songs available - this will trigger fallback loading if needed
				try {
					await djammsStore.loadPlaylists();
					console.log('🎵 VideoPlayer: Playlists loaded, checking for available tracks...');

					// After loading playlists, check if we now have a current track or venue queue
					const updatedVenue = $djammsStore.currentVenue;
					if (updatedVenue && updatedVenue.now_playing) {
						console.log('🎵 VideoPlayer: Found track after playlist load, loading:', updatedVenue.now_playing.title);
						loadNewVideo(updatedVenue.now_playing.video_id, updatedVenue.now_playing.title);
					} else if (updatedVenue && updatedVenue.active_queue && updatedVenue.active_queue.length > 0) {
						console.log('🎵 VideoPlayer: Found active queue, loading first track');
						const firstTrack = updatedVenue.active_queue[0];
						loadNewVideo(firstTrack.video_id, firstTrack.title || 'Unknown Track');
					} else {
						console.log('🎵 VideoPlayer: No tracks available after playlist load, showing empty state');
						// Initialize player with empty state to hide loading spinner
						isPlayerReady = true;
					}
				} catch (error) {
					console.error('🎵 VideoPlayer: Failed to load playlists:', error);
					console.error('🎵 VideoPlayer: Showing empty state due to load failure');
					// Initialize player with empty state to hide loading spinner
					isPlayerReady = true;
				}
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error checking current state:', error);
			// Initialize player with empty state to hide loading spinner
			isPlayerReady = true;
		}
	}

	onDestroy(() => {
		// Clear intervals
		if (statusUpdateInterval) {
			clearInterval(statusUpdateInterval);
		}
		
		// Remove event listeners
		if (browser) {
			window.removeEventListener('track-change-request', handleTrackChangeRequest);
		}
		
		// Clean up drag event listeners
		if (browser) {
			document.removeEventListener('mousemove', handleDrag);
			document.removeEventListener('mouseup', stopDragging);
		}
		
		// Broadcast disconnection to other windows
		if (browser) {
			playerSync.broadcastDisconnection(instanceId);
		}

		// Player state cleanup is handled through venue state management
		
		// Cleanup player
		try {
			if (player && player.destroy) {
				player.destroy();
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error destroying player:', error);
		}
	});

	// Function to get the first track from venue queue
	function loadFirstTrackFromQueue() {
		try {
			const venue = $djammsStore.currentVenue;
			if (venue && venue.active_queue && venue.active_queue.length > 0) {
				// Get the first track from the active queue
				const firstTrack = venue.active_queue[0];

				console.log('🎵 VideoPlayer: Loading first track from venue queue:', firstTrack.title);
				currentVideo = firstTrack.video_id;

				// Send command to update now playing in venue
				djammsStore.sendCommand('update_now_playing', firstTrack);

				return firstTrack;
			} else {
				console.warn('🎵 VideoPlayer: No tracks available in current playlist');
				return null;
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error loading first track from queue:', error);
			return null;
		}
	}

	function initializePlayer() {
		try {
			if (!playerContainer) return;

			// currentVideo should already be set by handleTrackChangeRequest
			if (!currentVideo) {
				console.error('🎵 VideoPlayer: Cannot initialize - no video ID available');
				return;
			}

			console.log('🎵 VideoPlayer: Initializing YouTube player with video:', currentVideo);

			player = new window.YT.Player(playerContainer, {
				height: '100%',
				width: '100%',
				videoId: currentVideo,
				playerVars: {
					autoplay: shouldAutoPlay ? 1 : 0,
					controls: 0, // Hide default controls
					disablekb: 1,
					fs: 0,
					iv_load_policy: 3,
					modestbranding: 1,
					rel: 0,
					showinfo: 0
				},
				events: {
					onReady: onPlayerReady,
					onStateChange: onPlayerStateChange
				}
			});
		} catch (error) {
			console.error('🎵 VideoPlayer: Error initializing player:', error);
			// Try to reinitialize after a delay
			setTimeout(() => {
				console.log('🎵 VideoPlayer: Retrying player initialization...');
				initializePlayer();
			}, 2000);
		}
	}

	function onPlayerReady() {
		try {
			isPlayerReady = true;
			player.setVolume(75);
			
			// Set up periodic status updates
			if (statusUpdateInterval) {
				clearInterval(statusUpdateInterval);
			}
			statusUpdateInterval = setInterval(updatePlayerProgress, 1000);
		} catch (error) {
			console.error('🎵 VideoPlayer: Error in onPlayerReady:', error);
		}
	}

	function onPlayerStateChange(event: any) {
		try {
			const state = event.data;
			const isPlaying = state === window.YT.PlayerState.PLAYING;
			const isEnded = state === window.YT.PlayerState.ENDED;
			
			// Handle video end - trigger queue progression
			if (isEnded) {
				console.log('🎵 Video ended, signaling ready for next song');
				// Send command to skip to next track
				djammsStore.sendCommand('skip_next');
				return;
			}

			// Send command to update player state
			djammsStore.sendCommand('update_player_state', {
				status: isPlaying ? 'playing' : 'paused',
				position: currentTime
			});

			// Broadcast state change to all windows
			if (browser) {
				broadcastStateChange(isPlaying);
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error in onPlayerStateChange:', error);
		}
	}

	// Broadcast state changes to other windows via PlayerSyncService
	function broadcastStateChange(isPlaying: boolean) {
		if (browser) {
			const status = isPlaying ? 'connected-local-playing' : 'connected-local-paused';
			playerSync.broadcastStateChange(status, instanceId);
		}
	}

	// Update player progress periodically
	function updatePlayerProgress() {
		try {
			if (!isPlayerReady || !player) return;
			
			const currentVideoTime = player.getCurrentTime();
			const videoDuration = player.getDuration();
			const youtubePlayerState = player.getPlayerState();
			const isPlaying = youtubePlayerState === window.YT.PlayerState.PLAYING;
			
			// Update timeline variables (only if not currently dragging)
			if (!isDragging) {
				currentTime = currentVideoTime;
				duration = videoDuration || 0;
			}

			// Send command to update player position
			djammsStore.sendCommand('update_player_position', { position: currentVideoTime });
		} catch (error) {
			console.error('🎵 VideoPlayer: Error updating player progress:', error);
		}
	}

	// Handle track change requests from queue manager
	function handleTrackChangeRequest(event: Event) {
		const customEvent = event as CustomEvent;
		const track = customEvent.detail;
		if (!track || !track.video_id) return;

		console.log('🎵 VideoPlayer: Received track change request:', track.title);

		// Update current video and venue state
		currentVideo = track.video_id;

		// Send command to update now playing
		djammsStore.sendCommand('update_now_playing', track);
		
		// Initialize player if not already done, otherwise load the new video
		if (!player && window.YT && playerContainer) {
			console.log('🎵 VideoPlayer: Initializing player with requested track');
			initializePlayer();
		} else if (isPlayerReady && player) {
			console.log('🎵 VideoPlayer: Loading new track in existing player');
			player.loadVideoById(track.video_id);
		}
	}

	// Handle automatic track loading from jukebox state changes
	function loadNewVideo(videoId: string, title: string) {
		try {
			console.log('🎵 VideoPlayer: Loading new video from jukebox:', title);
			
			// Update current video
			currentVideo = videoId;
			
			// Initialize player if not already done, otherwise load the new video
			if (!player && browser && window.YT && playerContainer) {
				console.log('🎵 VideoPlayer: Initializing player with new track');
				initializePlayer();
			} else if (isPlayerReady && player) {
				console.log('🎵 VideoPlayer: Loading new track in existing player');
				player.loadVideoById(videoId);
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error loading new video:', error);
		}
	}

	// Control functions
	function togglePlayPause() {
		try {
			if (!isPlayerReady) return;
			
			const state = player.getPlayerState();
			if (state === window.YT.PlayerState.PLAYING) {
				player.pauseVideo();
			} else {
				player.playVideo();
			}
		} catch (error) {
			console.error('🎵 VideoPlayer: Error toggling play/pause:', error);
		}
	}

	function skipForward() {
		try {
			if (!isPlayerReady) return;
			const currentTime = player.getCurrentTime();
			player.seekTo(currentTime + 10);
		} catch (error) {
			console.error('🎵 VideoPlayer: Error skipping forward:', error);
		}
	}

	function skipBackward() {
		try {
			if (!isPlayerReady) return;
			const currentTime = player.getCurrentTime();
			player.seekTo(Math.max(0, currentTime - 10));
		} catch (error) {
			console.error('🎵 VideoPlayer: Error skipping backward:', error);
		}
	}

	function adjustVolume(delta: number) {
		try {
			if (!isPlayerReady) return;
			const currentVolume = player.getVolume();
			const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
			player.setVolume(newVolume);
		} catch (error) {
			console.error('🎵 VideoPlayer: Error adjusting volume:', error);
		}
	}

	// Timeline control functions
	function seekTo(time: number) {
		try {
			if (!isPlayerReady) return;
			player.seekTo(time);
			currentTime = time;
		} catch (error) {
			console.error('🎵 VideoPlayer: Error seeking to time:', error);
		}
	}

	function handleTimelineClick(event: MouseEvent) {
		if (!isPlayerReady || duration === 0) return;
		
		const timeline = event.currentTarget as HTMLElement;
		const rect = timeline.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, clickX / rect.width));
		const newTime = percentage * duration;
		
		seekTo(newTime);
	}

	function startDragging(event: MouseEvent) {
		if (!browser) return;
		isDragging = true;
		if (browser) {
			document.addEventListener('mousemove', handleDrag);
			document.addEventListener('mouseup', stopDragging);
		}
		event.preventDefault();
	}

	function stopDragging() {
		if (isDragging) {
			isDragging = false;
			// Seek to the final position when drag ends
			if (isPlayerReady) {
				seekTo(currentTime);
			}
		}
		if (browser) {
			document.removeEventListener('mousemove', handleDrag);
			document.removeEventListener('mouseup', stopDragging);
		}
	}

	function handleDrag(event: MouseEvent) {
		if (!isDragging || duration === 0 || !browser) return;
		
		// Find the timeline element
		if (!browser) return;
		const timeline = document.querySelector('[data-timeline]') as HTMLElement;
		if (!timeline) return;
		
		const rect = timeline.getBoundingClientRect();
		const dragX = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, dragX / rect.width));
		const newTime = percentage * duration;
		
		currentTime = newTime;
		event.preventDefault();
	}

	function handleTimelineKeydown(event: KeyboardEvent) {
		if (event.code === 'Enter' || event.code === 'Space') {
			event.preventDefault();
			handleTimelineClick(event as any);
		}
	}
	function formatTime(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '0:00';
		
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		switch (event.code) {
			case 'Space':
				event.preventDefault();
				togglePlayPause();
				break;
			case 'ArrowRight':
				event.preventDefault();
				if (event.shiftKey) {
					// Shift + Right Arrow = seek forward 30s
					seekTo(Math.min(duration, currentTime + 30));
				} else {
					// Right Arrow = skip forward 10s
					skipForward();
				}
				break;
			case 'ArrowLeft':
				event.preventDefault();
				if (event.shiftKey) {
					// Shift + Left Arrow = seek backward 30s
					seekTo(Math.max(0, currentTime - 30));
				} else {
					// Left Arrow = skip backward 10s
					skipBackward();
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				adjustVolume(10);
				break;
			case 'ArrowDown':
				event.preventDefault();
				adjustVolume(-10);
				break;
			case 'KeyF':
				event.preventDefault();
				try {
					if (player && player.getIframe) {
						player.getIframe().requestFullscreen();
					}
				} catch (error) {
					console.error('🎵 VideoPlayer: Error requesting fullscreen:', error);
				}
				break;
			case 'Home':
				event.preventDefault();
				seekTo(0);
				break;
			case 'End':
				event.preventDefault();
				if (duration > 0) {
					seekTo(duration);
				}
				break;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Video Player - DJAMMS</title>
</svelte:head>

<main class="youtube-player">
	<!-- Authentication Check -->
	{#if $djammsStore.isLoading}
		<!-- Loading authentication state -->
		<div class="absolute inset-0 bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple flex items-center justify-center">
			<div class="text-center p-8 max-w-2xl">
				<div class="w-16 h-16 border-4 border-youtube-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<h2 class="text-white text-xl font-semibold mb-2">Checking Authentication...</h2>
				<p class="text-gray-400">Verifying your login status</p>
			</div>
		</div>
	{:else if !$djammsStore.isAuthenticated}
		<div class="absolute inset-0 bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple flex items-center justify-center">
			<div class="text-center p-8 max-w-2xl">
				<Users class="w-20 h-20 text-red-400 mx-auto mb-6" />
				<h2 class="text-white text-3xl font-bold mb-4">Authentication Required</h2>
				<p class="text-red-300 text-xl mb-6">You need to be signed in to access the DJAMMS video player.</p>
				<p class="text-gray-400 mb-8">Please sign in to continue using DJAMMS.</p>

				<div class="flex gap-4 justify-center">
					<button
						on:click={() => window.location.href = '/djamms-dashboard'}
						class="px-6 py-3 bg-youtube-red hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
					>
						Return to Dashboard
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Video Player Container (only for approved users) -->
		<div bind:this={playerContainer} class="absolute inset-0"></div>
		
		<!-- Loading Overlay -->
		{#if !isPlayerReady}
			<div class="absolute inset-0 bg-black flex items-center justify-center">
				<div class="text-center">
					<div class="w-16 h-16 border-4 border-youtube-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<h2 class="text-white text-xl font-semibold mb-2">Loading Player...</h2>
					<p class="text-gray-400">Initializing YouTube video player</p>
				</div>
			</div>
		{:else if !currentVideo}
			<!-- No songs in queue state -->
			<div class="absolute inset-0 bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple flex items-center justify-center">
				<div class="text-center p-8 max-w-2xl">
					<Music class="w-20 h-20 text-youtube-red mx-auto mb-6" />
					<h2 class="text-white text-3xl font-bold mb-4">No Songs in Queue</h2>
					<p class="text-gray-300 text-xl mb-6">The playlist is empty. Add some songs to get started!</p>
					<p class="text-gray-400 mb-8">Use the queue manager to add tracks to your playlist.</p>

					<div class="flex gap-4 justify-center">
						<button
							on:click={() => window.open('/adminconsole#queue', '_blank')}
							class="px-6 py-3 bg-youtube-red hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
						>
							Open Queue Manager
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Custom Controls Overlay (only for approved users) -->
	<div class="floating-controls">
		<div class="glass-morphism rounded-full px-6 py-3 flex items-center gap-4">
			<button
				on:click={skipBackward}
				class="p-2 text-white hover:text-youtube-red transition-colors"
				title="Skip backward 10s (←)"
			>
				<SkipBack class="w-6 h-6" />
			</button>
			
			<button
				on:click={togglePlayPause}
				class="p-3 bg-youtube-red hover:bg-youtube-red/80 rounded-full text-white transition-colors"
				title="Play/Pause (Space)"
			>
				{#if $playerControls.canPause}
					<Pause class="w-8 h-8" />
				{:else}
					<Play class="w-8 h-8 ml-1" />
				{/if}
			</button>
			
			<button
				on:click={skipForward}
				class="p-2 text-white hover:text-youtube-red transition-colors"
				title="Skip forward 10s (→)"
			>
				<SkipForward class="w-6 h-6" />
			</button>

			<div class="w-px h-8 bg-white/20 mx-2"></div>

			<button
				on:click={() => adjustVolume(-10)}
				class="p-2 text-white hover:text-youtube-red transition-colors"
				title="Volume down (↓)"
			>
				<Volume2 class="w-5 h-5" />
			</button>

			<button
				on:click={() => adjustVolume(10)}
				class="p-2 text-white hover:text-youtube-red transition-colors"
				title="Volume up (↑)"
			>
				<Volume2 class="w-5 h-5" />
			</button>

			<button
				on:click={() => player?.getIframe()?.requestFullscreen()}
				class="p-2 text-white hover:text-youtube-red transition-colors"
				title="Fullscreen (F)"
			>
				<Maximize2 class="w-5 h-5" />
			</button>
		</div>
	</div>

	<!-- Timeline Control Bar -->
	{#if isPlayerReady && duration > 0}
		<div class="absolute bottom-4 left-4 right-4">
			<div class="glass-morphism rounded-lg px-4 py-3">
				<!-- Time Display -->
				<div class="flex items-center justify-between text-white text-sm mb-2">
					<span class="font-medium">{formatTime(currentTime)}</span>
					{#if $currentTrack?.title}
						<span class="text-center flex-1 truncate px-4">
							{$currentTrack.title}
						</span>
					{/if}
					<span class="font-medium">{formatTime(duration)}</span>
				</div>
				
				<!-- Timeline Bar -->
				<div class="relative">
					<!-- Background Track -->
					<div 
						class="w-full h-2 bg-white/20 rounded-full cursor-pointer"
						data-timeline
						on:click={handleTimelineClick}
						on:keydown={handleTimelineKeydown}
						role="slider"
						tabindex="0"
						aria-label="Seek timeline"
						aria-valuenow={currentTime}
						aria-valuemin="0"
						aria-valuemax={duration}
					>
						<!-- Progress Fill -->
						<div 
							class="h-full bg-youtube-red rounded-full transition-all duration-100 ease-out"
							style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
						></div>
						
						<!-- Seek Handle -->
						<div 
							class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all duration-100 ease-out {isDragging ? 'scale-125' : ''}"
							style="left: calc({duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)"
							on:mousedown={startDragging}
							role="button"
							tabindex="0"
							aria-label="Drag to seek"
						></div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Keyboard Shortcuts Help (only for authenticated users) -->
	{#if $djammsStore.isAuthenticated}
		<div class="absolute top-4 right-4">
			<div class="glass-morphism rounded-lg p-3 text-white text-sm opacity-75">
				<div class="font-semibold mb-2">Keyboard Shortcuts</div>
				<div class="space-y-1 text-xs">
					<div><kbd class="bg-white/20 px-1 rounded">Space</kbd> Play/Pause</div>
					<div><kbd class="bg-white/20 px-1 rounded">←→</kbd> Skip 10s</div>
					<div><kbd class="bg-white/20 px-1 rounded">Shift+←→</kbd> Seek 30s</div>
					<div><kbd class="bg-white/20 px-1 rounded">↑↓</kbd> Volume</div>
					<div><kbd class="bg-white/20 px-1 rounded">Home/End</kbd> Start/End</div>
					<div><kbd class="bg-white/20 px-1 rounded">F</kbd> Fullscreen</div>
				</div>
			</div>
		</div>
	{/if}
	{/if}
</main>