<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore, currentTrack, playerControls, queueInfo, venueStatus } from '$lib/stores/djamms';
	import { playerSync } from '$lib/services/playerSync';
	import { windowManager } from '$lib/services/windowManager';
	import { playlistService } from '$lib/services/playlistService';
	import { getDJAMMSService } from '$lib/services/serviceInit';
	import { browser } from '$app/environment';
	import { InstanceIds } from '$lib/utils/idGenerator';
	import type { Track } from '$lib/types';
	import {
		ListMusic,
		Play,
		Pause,
		SkipForward,
		SkipBack,
		Volume2,
		Shuffle,
		Repeat,
		MoreHorizontal,
		GripVertical,
		X,
		Plus,
		Search,
		Filter,
		Circle,
		Wifi,
		WifiOff,
		AlertTriangle,
		Heart
	} from 'lucide-svelte';

	// Instance identifier for this queue manager window
	let instanceId = InstanceIds.queue();

	// Queue data from venue state
	let isLoading = true;
	let error: string | null = null;
	let globalDefaultPlaylist: any = null;

	let searchQuery = '';
	let volume = 75;
	let isShuffleOn = false;
	let repeatMode = 'none'; // 'none', 'one', 'all'
	let djammsService = getDJAMMSService(); // Initialize unified service

	// Reactive statements for venue state
	$: queue = $djammsStore.activeQueue || [];
	$: isPlaying = $playerControls.canPause;
	$: currentTime = $djammsStore.playerState.position || 0;
	$: duration = $currentTrack?.duration || 0;

	// Load global default playlist info using v3 service
	async function loadGlobalDefaultPlaylist() {
		try {
			const globalPlaylist = await djammsService.getDefaultPlaylist();
			if (globalPlaylist) {
				globalDefaultPlaylist = {
					...globalPlaylist,
					tracks: typeof globalPlaylist.tracks === 'string' ? JSON.parse(globalPlaylist.tracks) : globalPlaylist.tracks
				};
				console.log('Loaded global default playlist:', globalPlaylist.name);
			}
		} catch (err) {
			console.error('Failed to load global default playlist:', err);
		}
	}

	// Load queue from venue state
	async function loadQueueFromVenue() {
		try {
			isLoading = true;
			error = null;

			const venue = $djammsStore.currentVenue;
			if (venue && venue.active_queue) {
				// Queue is already managed by venue state, just ensure it's loaded
				console.log('Loaded queue from venue:', venue.venue_name, { queue: venue.active_queue });
			} else {
				console.warn('No venue available to load queue from');
			}
		} catch (err) {
			console.error('Failed to load queue from venue:', err);
			error = 'Failed to load queue from venue.';
		} finally {
			isLoading = false;
		}
	}

	// Reactive statement to reload queue when venue changes
	$: if (browser && $djammsStore.currentVenue) {
		loadQueueFromVenue();
	}

	// Filtered queue for search
	$: filteredQueue = queue.filter(track =>
		track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
		track.artist.toLowerCase().includes(searchQuery.toLowerCase())
	);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getVenueStatusDisplay(status: any) {
		if (status.isConnected) {
			switch ($djammsStore.playerState.status) {
				case 'playing':
					return { icon: Circle, text: 'CONNECTED, PLAYING', class: 'status-connected-playing' };
				case 'paused':
					return { icon: Circle, text: 'CONNECTED, PAUSED', class: 'status-connected-paused' };
				default:
					return { icon: Wifi, text: 'CONNECTED, IDLE', class: 'status-connected-paused' };
			}
		} else {
			return { icon: WifiOff, text: 'DISCONNECTED', class: 'status-disconnected' };
		}
	}

	function removeFromQueue(trackToRemove: Track) {
		djammsStore.sendCommand('remove_from_queue', { trackId: trackToRemove.video_id });
	}

	function moveTrackUp(index: number) {
		if (index > 0) {
			djammsStore.sendCommand('reorder_queue', {
				fromIndex: index,
				toIndex: index - 1
			});
		}
	}

	function moveTrackDown(index: number) {
		if (index < queue.length - 1) {
			djammsStore.sendCommand('reorder_queue', {
				fromIndex: index,
				toIndex: index + 1
			});
		}
	}

	function playTrack(track: Track) {
		console.log('🎵 Queue Manager: Request to play track:', track.title);
		djammsStore.sendCommand('play_track', { track });
	}

	// Function to load global default playlist into queue
	async function loadGlobalDefaultIntoQueue() {
		try {
			if (globalDefaultPlaylist) {
				// Load tracks into venue queue
				const tracks = globalDefaultPlaylist.tracks || [];
				djammsStore.sendCommand('load_playlist_tracks', { tracks });
			}
		} catch (err) {
			console.error('Failed to load global default playlist into queue:', err);
			error = 'Failed to load global default playlist.';
		}
	}

	onMount(async () => {
		// Wait for authentication to initialize
		if ($djammsStore.isLoading) {
			// Wait for auth to complete
			await new Promise(resolve => {
				const unsubscribe = djammsStore.subscribe(state => {
					if (!state.isLoading) {
						unsubscribe();
						resolve(void 0);
					}
				});
			});
		}

		// Check authentication
		if (!$djammsStore.isAuthenticated) {
			console.log('🔐 Queue Manager: User not authenticated, closing window');
			alert('Authentication required. Please log in first.');
			window.close();
			return;
		}

		// Check for duplicate instance
		if (browser && windowManager.shouldPreventDuplicate()) {
			alert('Queue Manager is already open in another window.');
			window.close();
			return;
		}

		// Initialize sync service for this window
		if (browser) {
			playerSync.initializeForWindow();
		}

		// Load global default playlist info
		await loadGlobalDefaultPlaylist();

		// Load venue data and playlists
		await djammsStore.loadPlaylists();
		if ($djammsStore.currentUser) {
			await djammsStore.loadUserVenues($djammsStore.currentUser.$id);
		}
	});

	onDestroy(() => {
		// Sync service cleanup is handled globally
	});
</script>

<svelte:head>
	<title>Queue Manager - DJAMMS</title>
</svelte:head>

<main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<!-- Header -->
	<header class="flex justify-between items-center p-4 glass-morphism border-b border-white/10">
		<div class="flex items-center gap-4">
			<div class="w-10 h-10 bg-gradient-to-br from-music-purple to-purple-700 rounded-xl flex items-center justify-center">
				<Play class="w-6 h-6 text-white" />
			</div>
			<div>
				<h1 class="text-xl font-bold text-white">Queue Manager</h1>
				<p class="text-gray-400 text-sm">Manage your music queue and playback</p>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<!-- Venue Status -->
			{#if $venueStatus}
				{@const statusDisplay = getVenueStatusDisplay($venueStatus)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="hidden sm:inline">{statusDisplay.text}</span>
				</div>
			{/if}

			<!-- User Info -->
			<div class="flex items-center gap-2">
				<img
					src={`https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.email || 'User')}&background=7C3AED&color=fff`}
					alt="User Avatar"
					class="w-8 h-8 rounded-full"
				>
				<span class="text-white text-sm font-medium hidden sm:block">{$djammsStore.currentUser?.email}</span>
			</div>
		</div>
	</header>

	<!-- Current Playlist Display -->
	<div class="px-4 py-3 bg-surface-50-900-token border-b border-white/10">
		<div class="flex items-center justify-between">
			<div class="text-center flex-1">
				<span class="text-sm text-gray-400">Venue Queue: </span>
				<span class="text-white font-medium">{$djammsStore.currentVenue?.venue_name || 'No venue selected'}</span>
			</div>
			
			<!-- Global Default Playlist Info -->
			{#if globalDefaultPlaylist}
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-500">Default Available:</span>
					<button
						on:click={loadGlobalDefaultIntoQueue}
						class="text-xs px-2 py-1 bg-music-purple/20 hover:bg-music-purple/30 text-music-purple border border-music-purple/30 rounded-full transition-colors"
						title="Load {globalDefaultPlaylist.name} into queue"
					>
						{globalDefaultPlaylist.name}
					</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-1 flex overflow-hidden">
		<!-- Now Playing Section -->
		<div class="w-1/3 border-r border-white/10 flex flex-col">
			<!-- Now Playing Header -->
			<div class="p-6 border-b border-white/10">
				<h2 class="text-lg font-semibold text-white mb-4">Now Playing</h2>
				
				{#if isLoading}
					<!-- Loading State -->
					<div class="text-center mb-6">
						<div class="w-48 h-48 mx-auto rounded-2xl bg-white/10 animate-pulse mb-4"></div>
						<div class="h-6 bg-white/10 rounded mb-2 animate-pulse"></div>
						<div class="h-4 bg-white/10 rounded w-2/3 mx-auto animate-pulse"></div>
					</div>
				{:else if error}
					<!-- Error State -->
					<div class="text-center mb-6">
						<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
							<AlertTriangle class="w-8 h-8 text-red-400" />
						</div>
						<p class="text-red-400 text-sm mb-4">{error}</p>
						<button 
							on:click={() => loadQueueFromVenue()}
							class="px-4 py-2 bg-gradient-to-r from-music-purple to-purple-700 text-white rounded-full text-sm"
						>
							Retry
						</button>
					</div>
				{:else if $currentTrack && $currentTrack.video_id}
					<!-- Album Art & Info -->
					<div class="text-center mb-6">
						<div class="relative mb-4">
							<img 
								src={$currentTrack.thumbnail}
								alt={$currentTrack.title}
								class="w-48 h-48 mx-auto rounded-2xl shadow-2xl"
							>
							<div class="absolute -bottom-2 -right-2 p-2 bg-youtube-red rounded-full shadow-lg">
								{#if isPlaying}
									<Pause class="w-5 h-5 text-white" />
								{:else}
									<Play class="w-5 h-5 text-white" />
								{/if}
							</div>
						</div>
						
						<h3 class="text-xl font-bold text-white mb-1">{$currentTrack.title}</h3>
						<p class="text-gray-400 mb-4">{$currentTrack.artist}</p>
						
						<!-- Progress Bar -->
						<div class="mb-4">
							<div class="w-full bg-white/20 rounded-full h-2 mb-2">
								<div 
									class="bg-gradient-to-r from-youtube-red to-music-purple h-2 rounded-full transition-all duration-300"
									style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
								></div>
							</div>
							<div class="flex justify-between text-xs text-gray-400">
								<span>{formatTime(currentTime)}</span>
								<span>{formatTime(duration)}</span>
							</div>
						</div>
					</div>
				{:else}
					<!-- No Track Playing -->
					<div class="text-center mb-6">
						<div class="w-48 h-48 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
							<ListMusic class="w-16 h-16 text-gray-400" />
						</div>
						<h3 class="text-lg font-semibold text-white mb-1">No Track Selected</h3>
						<p class="text-gray-400">Select a track from your queue to start playing</p>
					</div>
				{/if}
				
				<!-- Controls -->
				<div class="flex justify-center items-center gap-4 mb-6">
					<button 
						class="p-2 text-gray-400 hover:text-white transition-colors"
						class:text-music-purple={isShuffleOn}
						on:click={() => isShuffleOn = !isShuffleOn}
					>
						<Shuffle class="w-5 h-5" />
					</button>
					
					<button class="p-3 text-white hover:text-gray-300 transition-colors">
						<SkipBack class="w-6 h-6" />
					</button>
					
					<button 
						class="p-4 bg-gradient-to-r from-youtube-red to-music-purple hover:from-youtube-red/90 hover:to-music-purple/90 rounded-full text-white transition-all transform hover:scale-105"
						on:click={() => djammsStore.sendCommand(isPlaying ? 'pause' : 'play')}
					>
						{#if isPlaying}
							<Pause class="w-8 h-8" />
						{:else}
							<Play class="w-8 h-8 ml-1" />
						{/if}
					</button>
					
					<button class="p-3 text-white hover:text-gray-300 transition-colors">
						<SkipForward class="w-6 h-6" />
					</button>
					
					<button 
						class="p-2 text-gray-400 hover:text-white transition-colors"
						class:text-music-purple={repeatMode !== 'none'}
						on:click={() => {
							repeatMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
						}}
					>
						<Repeat class="w-5 h-5" />
						{#if repeatMode === 'one'}
							<span class="absolute -mt-6 ml-2 text-xs">1</span>
						{/if}
					</button>
				</div>
				
				<!-- Volume Control -->
				<div class="flex items-center gap-3">
					<Volume2 class="w-5 h-5 text-gray-400" />
					<div class="flex-1">
						<input 
							type="range" 
							min="0" 
							max="100" 
							bind:value={volume}
							class="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer"
						>
					</div>
					<span class="text-sm text-gray-400 w-10">{volume}%</span>
				</div>
			</div>

			<!-- Additional Actions -->
			<div class="p-6">
				<div class="grid grid-cols-2 gap-3">
					<button class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-sm font-medium transition-colors">
						<Heart class="w-4 h-4 mx-auto mb-1" />
						Like
					</button>
					<button class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-sm font-medium transition-colors">
						<Plus class="w-4 h-4 mx-auto mb-1" />
						Add to Playlist
					</button>
				</div>
			</div>
		</div>

		<!-- Queue Section -->
		<div class="flex-1 flex flex-col">
			<!-- Search Bar -->
			<div class="p-6 border-b border-white/10">
				<h2 class="text-lg font-semibold text-white mb-4">Queue</h2>
				<div class="relative">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input 
						type="text"
						placeholder="Search for songs to add to queue..."
						bind:value={searchQuery}
						class="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-music-purple focus:bg-white/15 transition-all"
					>
				</div>
			</div>

			<!-- Queue List -->
			<div class="flex-1 overflow-auto p-6">
				{#if isLoading}
					<!-- Loading State -->
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
								<div class="w-8 h-8 bg-white/10 rounded-lg animate-pulse"></div>
								<div class="w-12 h-12 bg-white/10 rounded-lg animate-pulse"></div>
								<div class="flex-1">
									<div class="h-4 bg-white/10 rounded mb-2 animate-pulse"></div>
									<div class="h-3 bg-white/10 rounded w-2/3 animate-pulse"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else if error}
					<!-- Error State -->
					<div class="text-center py-16">
						<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
							<AlertTriangle class="w-8 h-8 text-red-400" />
						</div>
						<h3 class="text-lg font-semibold text-white mb-2">Failed to Load Queue</h3>
						<p class="text-gray-400 mb-4">{error}</p>
						<button 
							on:click={() => loadQueueFromVenue()}
							class="px-6 py-3 bg-gradient-to-r from-youtube-red to-music-purple text-white rounded-full font-medium hover:shadow-lg transition-all"
						>
							Try Again
						</button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each filteredQueue as track, index}
							<div class="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
								<!-- Drag Handle -->
								<button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all">
									<GripVertical class="w-4 h-4" />
								</button>

								<!-- Position Number -->
								<div class="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-sm font-medium text-white">
									{index + 1}
								</div>

								<!-- Thumbnail -->
								<button
									type="button"
									class="p-0 border-0 bg-transparent cursor-pointer hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-music-purple focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
									on:click={() => playTrack(track)}
									title="Play {track.title}"
								>
									<img 
										src={track.thumbnail}
										alt={track.title}
										class="w-12 h-12 rounded-lg object-cover"
									/>
								</button>

								<!-- Track Info -->
								<div 
									class="flex-1 min-w-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-music-purple rounded" 
									role="button"
									tabindex="0"
									on:click={() => playTrack(track)}
									on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? playTrack(track) : null}
									aria-label="Play {track.title} by {track.artist}"
								>
									<h3 class="font-semibold text-white truncate hover:text-music-purple transition-colors">{track.title}</h3>
									<p class="text-gray-400 text-sm truncate">{track.artist}</p>
								</div>

								<!-- Duration -->
								<div class="text-gray-400 text-sm">
									{formatTime(track.duration)}
								</div>

								<!-- Queue Actions -->
								<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button 
										on:click={() => moveTrackUp(index)}
										disabled={index === 0}
										class="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
										</svg>
									</button>
									
									<button 
										on:click={() => moveTrackDown(index)}
										disabled={index === filteredQueue.length - 1}
										class="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
										</svg>
									</button>

									<button class="p-2 text-gray-400 hover:text-white transition-colors">
										<MoreHorizontal class="w-4 h-4" />
									</button>

									<button 
										on:click={() => removeFromQueue(track)}
										class="p-2 text-gray-400 hover:text-red-400 transition-colors"
									>
										<X class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>

					<!-- Empty State -->
					{#if filteredQueue.length === 0 && !searchQuery}
						<div class="text-center py-16">
							<div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
								<Play class="w-8 h-8 text-gray-400" />
							</div>
							<h3 class="text-lg font-semibold text-white mb-2">Queue is Empty</h3>
							<p class="text-gray-400 mb-4">Add songs to your queue to start playing music</p>
							<button 
								on:click={() => loadQueueFromVenue()}
								class="px-6 py-3 bg-gradient-to-r from-youtube-red to-music-purple text-white rounded-full font-medium hover:shadow-lg transition-all"
							>
								Reload Queue
							</button>
						</div>
					{:else if filteredQueue.length === 0 && searchQuery}
						<!-- No Search Results -->
						<div class="text-center py-16">
							<div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
								<Search class="w-8 h-8 text-gray-400" />
							</div>
							<h3 class="text-lg font-semibold text-white mb-2">No Results Found</h3>
							<p class="text-gray-400 mb-4">No tracks match "{searchQuery}"</p>
							<button 
								on:click={() => searchQuery = ''}
								class="px-6 py-3 bg-gradient-to-r from-youtube-red to-music-purple text-white rounded-full font-medium hover:shadow-lg transition-all"
							>
								Clear Search
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</main>