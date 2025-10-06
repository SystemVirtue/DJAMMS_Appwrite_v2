<!-- Queue Manager Tab Component - Embedded version of /queuemanager -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore } from '$lib/stores/djamms';
	import { currentTrack, playerControls, queueInfo } from '$lib/stores/djamms';
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

	// Tab-specific instance identifier
	let instanceId = InstanceIds.queueManagerTab();

	// Queue data from Appwrite
	let queue: Track[] = [];
	let isLoading = true;
	let error: string | null = null;
	let globalDefaultPlaylist: any = null;

	let searchQuery = '';
	let volume = 75;
	let isShuffleOn = false;
	let repeatMode = 'none'; // 'none', 'one', 'all'

	// UI State
	let showVolumeSlider = false;
	let draggedIndex: number | null = null;
	let dropIndicatorIndex: number | null = null;

	// Reactive current playlist name
	$: currentPlaylistName = $djammsStore.currentPlaylist?.name || 'No Active Playlist';
	
	// Reactive filtered queue
	$: filteredQueue = $djammsStore.activeQueue.filter(track => 
		track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
		track.channelTitle?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	async function loadQueue() {
		isLoading = true;
		error = null;
		try {
			// Queue is now reactive from djammsStore.activeQueue
			queue = $djammsStore.activeQueue || [];
			console.log(`🎵 Queue Manager Tab: Loaded ${queue.length} tracks from active queue`);
		} catch (err) {
			console.error('🎵 Queue Manager Tab: Error loading queue:', err);
			error = err instanceof Error ? err.message : 'Failed to load queue';
			queue = [];
		} finally {
			isLoading = false;
		}
	}

	function getStatusDisplay(status: string) {
		switch (status) {
			case 'playing':
				return { icon: Circle, text: 'CONNECTED (LOCAL), PLAYING', class: 'status-connected-playing' };
			case 'paused':
				return { icon: Circle, text: 'CONNECTED (LOCAL), PAUSED', class: 'status-connected-paused' };
			case 'idle':
				return { icon: WifiOff, text: 'IDLE', class: 'status-disconnected' };
			case 'stopped':
				return { icon: WifiOff, text: 'STOPPED', class: 'status-disconnected' };
			default:
				return { icon: WifiOff, text: 'NO CONNECTED PLAYER', class: 'status-disconnected' };
		}
	}

	function toggleShuffle() {
		isShuffleOn = !isShuffleOn;
		console.log('🎵 Queue Manager Tab: Shuffle toggled:', isShuffleOn);
	}

	function toggleRepeat() {
		const modes = ['none', 'one', 'all'];
		const currentIndex = modes.indexOf(repeatMode);
		repeatMode = modes[(currentIndex + 1) % modes.length];
		console.log('🎵 Queue Manager Tab: Repeat mode changed to:', repeatMode);
	}

	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Drag and drop functions
	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dropIndicatorIndex = index;
	}

	function handleDragLeave() {
		dropIndicatorIndex = null;
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const draggedTrack = queue[draggedIndex];
			const newQueue = [...queue];
			
			// Remove dragged item
			newQueue.splice(draggedIndex, 1);
			
			// Insert at new position (adjust index if dropping after the dragged item)
			const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
			newQueue.splice(insertIndex, 0, draggedTrack);
			
			queue = newQueue;
			console.log('🎵 Queue Manager Tab: Moved track from', draggedIndex, 'to', insertIndex);
		}
		
		draggedIndex = null;
		dropIndicatorIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dropIndicatorIndex = null;
	}

	onMount(() => {
		console.log('🎵 Queue Manager Tab: Component mounted with instance ID:', instanceId);
		
		// Load initial queue
		loadQueue();
		
		// Set up reactive subscription to djammsStore changes
		const unsubscribe = djammsStore.subscribe((state) => {
			if (state.activeQueue) {
				console.log('🎵 Queue Manager Tab: Active queue changed, reloading...');
				loadQueue();
			}
		});

		return unsubscribe;
	});

	onDestroy(() => {
		console.log('🎵 Queue Manager Tab: Component destroyed');
	});
</script>

<div class="h-full flex flex-col bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<!-- Queue Manager Header -->
	<div class="p-6 glass-morphism border-b border-white/10">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-music-purple to-purple-700 rounded-xl flex items-center justify-center">
					<ListMusic class="w-6 h-6 text-white" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">Queue Manager</h1>
					<p class="text-gray-400">Active Playlist: {currentPlaylistName}</p>
				</div>
			</div>

			<!-- Player Status -->
			{#if $djammsStore.playerState?.status}
				{@const statusDisplay = getStatusDisplay($djammsStore.playerState.status)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="text-sm">{statusDisplay.text}</span>
				</div>
			{/if}
		</div>

		<!-- Search and Controls -->
		<div class="flex items-center gap-4 mb-4">
			<!-- Search -->
			<div class="flex-1 relative">
				<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
				<input
					type="text"
					placeholder="Search queue..."
					bind:value={searchQuery}
					class="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-purple"
				>
			</div>

			<!-- Filter Button -->
			<button class="p-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-400 hover:text-white transition-colors">
				<Filter class="w-4 h-4" />
			</button>

			<!-- Add Track Button -->
			<button class="flex items-center gap-2 px-4 py-2 bg-music-purple hover:bg-music-purple/80 rounded-lg text-white transition-colors">
				<Plus class="w-4 h-4" />
				<span class="hidden sm:inline">Add</span>
			</button>
		</div>

		<!-- Playback Controls -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<!-- Previous -->
				<button class="p-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-400 hover:text-white transition-colors">
					<SkipBack class="w-5 h-5" />
				</button>

				<!-- Play/Pause -->
				<button class="p-3 bg-youtube-red hover:bg-red-600 rounded-xl text-white transition-colors">
					{#if $djammsStore.playerState?.status === 'playing'}
						<Pause class="w-6 h-6" />
					{:else}
						<Play class="w-6 h-6" />
					{/if}
				</button>

				<!-- Next -->
				<button class="p-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-400 hover:text-white transition-colors">
					<SkipForward class="w-5 h-5" />
				</button>

				<!-- Shuffle -->
				<button 
					on:click={toggleShuffle}
					class="p-2 border border-white/20 rounded-lg transition-colors {isShuffleOn ? 'bg-music-purple text-white' : 'bg-black/30 hover:bg-black/50 text-gray-400 hover:text-white'}"
				>
					<Shuffle class="w-4 h-4" />
				</button>

				<!-- Repeat -->
				<button 
					on:click={toggleRepeat}
					class="p-2 border border-white/20 rounded-lg transition-colors {repeatMode !== 'none' ? 'bg-music-purple text-white' : 'bg-black/30 hover:bg-black/50 text-gray-400 hover:text-white'}"
				>
					<Repeat class="w-4 h-4" />
					{#if repeatMode === 'one'}
						<span class="absolute -top-1 -right-1 w-3 h-3 bg-music-purple rounded-full flex items-center justify-center text-xs">1</span>
					{/if}
				</button>
			</div>

			<!-- Volume Control -->
			<div class="flex items-center gap-2 relative">
				<button 
					on:click={() => showVolumeSlider = !showVolumeSlider}
					class="p-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-400 hover:text-white transition-colors"
				>
					<Volume2 class="w-4 h-4" />
				</button>
				
				{#if showVolumeSlider}
					<div class="absolute right-0 bottom-full mb-2 p-3 bg-black/90 border border-white/20 rounded-lg">
						<input
							type="range"
							min="0"
							max="100"
							bind:value={volume}
							class="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
						>
						<div class="text-center text-xs text-gray-400 mt-1">{volume}%</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Queue List -->
	<div class="flex-1 overflow-auto">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<div class="w-8 h-8 border-4 border-music-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-400">Loading queue...</p>
				</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<AlertTriangle class="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p class="text-red-400 mb-2">Failed to load queue</p>
					<p class="text-gray-400 text-sm">{error}</p>
					<button 
						on:click={loadQueue}
						class="mt-4 px-4 py-2 bg-music-purple hover:bg-music-purple/80 rounded-lg text-white transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if filteredQueue.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<ListMusic class="w-12 h-12 text-gray-500 mx-auto mb-4" />
					<p class="text-gray-400 mb-2">
						{searchQuery ? 'No tracks match your search' : 'No tracks in queue'}
					</p>
					{#if searchQuery}
						<button 
							on:click={() => searchQuery = ''}
							class="text-music-purple hover:text-music-purple/80 transition-colors"
						>
							Clear search
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<div class="p-6">
				<div class="space-y-2">
					{#each filteredQueue as track, index (track.video_id)}
						<div
							class="group relative p-4 glass-morphism rounded-xl border border-white/10 hover:border-music-purple/50 transition-all duration-300 cursor-pointer"
							class:opacity-50={draggedIndex === index}
							class:border-music-purple={dropIndicatorIndex === index}
							role="button"
							aria-label="Queue item: {track.title}. Drag to reorder."
							tabindex="0"
							draggable="true"
							on:dragstart={(event) => handleDragStart(event, index)}
							on:dragover={(event) => handleDragOver(event, index)}
							on:dragleave={handleDragLeave}
							on:drop={(event) => handleDrop(event, index)}
							on:dragend={handleDragEnd}
						>
							<!-- Drop indicator -->
							{#if dropIndicatorIndex === index}
								<div class="absolute -top-1 left-0 right-0 h-0.5 bg-music-purple rounded-full"></div>
							{/if}

							<div class="flex items-center gap-4">
								<!-- Drag Handle -->
								<div class="drag-handle text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing">
									<GripVertical class="w-4 h-4" />
								</div>

								<!-- Track Number -->
								<div class="w-8 text-center text-sm text-gray-400 font-mono">
									{index + 1}
								</div>

								<!-- Thumbnail -->
								<div class="w-12 h-12 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
									{#if track.thumbnail}
										<img
											src={track.thumbnail}
											alt={track.title}
											class="w-full h-full object-cover"
											loading="lazy"
										>
									{:else}
										<div class="w-full h-full flex items-center justify-center">
											<ListMusic class="w-6 h-6 text-gray-500" />
										</div>
									{/if}
								</div>

								<!-- Track Info -->
								<div class="flex-1 min-w-0">
									<h3 class="text-white font-medium truncate group-hover:text-music-purple transition-colors">
										{track.title}
									</h3>
									<p class="text-gray-400 text-sm truncate">
										{track.channelTitle || 'Unknown Artist'}
									</p>
								</div>

								<!-- Duration -->
								<div class="text-sm text-gray-400 font-mono">
									{track.duration ? formatDuration(track.duration) : '--:--'}
								</div>

								<!-- Actions -->
								<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
										<Heart class="w-4 h-4" />
									</button>
									
									<button class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
										<MoreHorizontal class="w-4 h-4" />
									</button>
									
									<button class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
										<X class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Queue Stats Footer -->
	<div class="p-4 border-t border-white/10 glass-morphism">
		<div class="flex items-center justify-between text-sm text-gray-400">
			<span>{filteredQueue.length} tracks in queue</span>
			<span>Total: {filteredQueue.reduce((sum, track) => sum + (track.duration || 0), 0)} seconds</span>
		</div>
	</div>
</div>

<style>
	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0.5rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	.status-connected-playing {
		background-color: rgba(34, 197, 94, 0.2);
		color: rgb(74, 222, 128);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}
	
	.status-connected-paused {
		background-color: rgba(245, 158, 11, 0.2);
		color: rgb(250, 204, 21);
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
	
	.status-disconnected {
		background-color: rgba(239, 68, 68, 0.2);
		color: rgb(248, 113, 113);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	
	.status-error {
		background-color: rgba(239, 68, 68, 0.2);
		color: rgb(248, 113, 113);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 1rem;
		height: 1rem;
		background-color: rgb(147, 51, 234);
		border-radius: 9999px;
		cursor: pointer;
	}
	
	.slider::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		background-color: rgb(147, 51, 234);
		border-radius: 9999px;
		cursor: pointer;
		border: 0;
	}
</style>