<!-- Playlist Library Tab Component - Embedded version of /playlistlibrary -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore } from '$lib/stores/djamms';
	import { playlistService } from '$lib/services/playlistService';
	import type { Playlist } from '$lib/types';
	import { 
		Library,
		Plus,
		Search,
		Play,
		MoreHorizontal,
		Edit3,
		Trash2,
		Share,
		Download,
		Lock,
		Unlock,
		Music,
		Clock,
		Users,
		Heart,
		Circle,
		Wifi,
		WifiOff,
		AlertTriangle,
		Filter,
		ChevronDown,
		Grid3X3,
		List,
		Calendar,
		User
	} from 'lucide-svelte';

	import { browser } from '$app/environment';

	// Playlists data from Appwrite
	let playlists: Playlist[] = [];
	let isLoading = true;
	let error: string | null = null;
	let globalDefaultPlaylist: Playlist | null = null;

	let searchQuery = '';
	let selectedFilter = 'all'; // 'all', 'public', 'private', 'liked'
	let sortBy = 'recent'; // 'recent', 'name', 'tracks', 'duration'
	let viewMode = 'grid'; // 'grid', 'list'
	let showCreateModal = false;

	// New playlist form
	let newPlaylistName = '';
	let newPlaylistDescription = '';
	let newPlaylistIsPublic = false;

	// Reactive filtered and sorted playlists
	$: filteredPlaylists = playlists
		.filter(playlist => {
			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				if (!playlist.name.toLowerCase().includes(query) && 
					!playlist.description?.toLowerCase().includes(query)) {
					return false;
				}
			}

			// Type filter
			switch (selectedFilter) {
				case 'public':
					return playlist.isPublic;
				case 'private':
					return !playlist.isPublic;
				case 'liked':
					return playlist.isLiked || false;
				default:
					return true;
			}
		})
		.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'tracks':
					return (b.trackCount || 0) - (a.trackCount || 0);
				case 'duration':
					return (b.totalDuration || 0) - (a.totalDuration || 0);
				case 'recent':
				default:
					return new Date(b.updated || b.created || Date.now()).getTime() - new Date(a.updated || a.created || Date.now()).getTime();
			}
		});

	function getStatusDisplay(status: any) {
		switch (status?.status) {
			case 'connected-local-playing':
				return { icon: Circle, text: 'CONNECTED (LOCAL), PLAYING', class: 'status-connected-playing' };
			case 'connected-local-paused':
				return { icon: Circle, text: 'CONNECTED (LOCAL), PAUSED', class: 'status-connected-paused' };
			case 'connected-remote-playing':
				return { icon: Wifi, text: 'CONNECTED (REMOTE), PLAYING', class: 'status-connected-playing' };
			case 'connected-remote-paused':
				return { icon: Wifi, text: 'CONNECTED (REMOTE), PAUSED', class: 'status-connected-paused' };
			case 'server-error':
				return { icon: AlertTriangle, text: 'SERVER ERROR', class: 'status-error' };
			default:
				return { icon: WifiOff, text: 'NO CONNECTED PLAYER', class: 'status-disconnected' };
		}
	}

	async function loadPlaylists() {
		isLoading = true;
		error = null;
		try {
			console.log('🎵 Playlist Library Tab: Loading user playlists...');
			const userPlaylistsData = await playlistService.getUserPlaylists();
			playlists = userPlaylistsData || [];
			setUserPlaylists(playlists);
			
			// Load global default playlist info
			globalDefaultPlaylist = await playlistService.getGlobalDefaultPlaylist();
			
			console.log(`🎵 Playlist Library Tab: Loaded ${playlists.length} playlists`);
		} catch (err) {
			console.error('🎵 Playlist Library Tab: Error loading playlists:', err);
			error = err instanceof Error ? err.message : 'Failed to load playlists';
			playlists = [];
		} finally {
			isLoading = false;
		}
	}

	async function createPlaylist() {
		if (!newPlaylistName.trim()) return;

		if (!$djammsStore.currentVenue) {
			console.error('🎵 No current venue available for playlist creation');
			error = 'Unable to create playlist: no venue selected';
			return;
		}

		try {
			console.log('🎵 Creating new playlist:', newPlaylistName);
			const newPlaylist = await playlistService.createPlaylist(
				$djammsStore.currentVenue.$id,
				newPlaylistName.trim(),
				newPlaylistDescription.trim(),
				newPlaylistIsPublic
			);

			if (newPlaylist) {
				playlists = [newPlaylist, ...playlists];
				setUserPlaylists(playlists);
				
				// Reset form
				newPlaylistName = '';
				newPlaylistDescription = '';
				newPlaylistIsPublic = false;
				showCreateModal = false;
				
				console.log('🎵 Playlist created successfully:', newPlaylist.name);
			}
		} catch (err) {
			console.error('🎵 Error creating playlist:', err);
			error = err instanceof Error ? err.message : 'Failed to create playlist';
		}
	}

	async function selectPlaylist(playlist: Playlist) {
		try {
			console.log('🎵 Playlist Library Tab: Selecting playlist:', playlist.name);
			setActivePlaylist(playlist);
			console.log('🎵 Playlist Library Tab: Active playlist set to:', playlist.name);
		} catch (err) {
			console.error('🎵 Playlist Library Tab: Error selecting playlist:', err);
			error = err instanceof Error ? err.message : 'Failed to select playlist';
		}
	}

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString();
	}

	onMount(() => {
		console.log('🎵 Playlist Library Tab: Component mounted');
		loadPlaylists();
	});

	onDestroy(() => {
		console.log('🎵 Playlist Library Tab: Component destroyed');
	});
</script>

<div class="h-full flex flex-col bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<!-- Playlist Library Header -->
	<div class="p-6 glass-morphism border-b border-white/10">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-music-pink to-pink-700 rounded-xl flex items-center justify-center">
					<Library class="w-6 h-6 text-white" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">Playlist Library</h1>
					<p class="text-gray-400">Manage your music collections</p>
				</div>
			</div>

			<!-- Player Status -->
			{#if $playerStatus}
				{@const statusDisplay = getStatusDisplay($playerStatus)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="text-sm">{statusDisplay.text}</span>
				</div>
			{/if}
		</div>

		<!-- Controls Row -->
		<div class="flex items-center justify-between mb-4">
			<!-- Search and Filters -->
			<div class="flex items-center gap-4 flex-1 max-w-2xl">
				<!-- Search -->
				<div class="flex-1 relative">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search playlists..."
						bind:value={searchQuery}
						class="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-pink"
					>
				</div>

				<!-- Filter Dropdown -->
				<div class="relative">
					<select 
						bind:value={selectedFilter}
						class="appearance-none bg-black/30 border border-white/20 rounded-lg px-4 py-2 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-music-pink"
					>
						<option value="all">All Playlists</option>
						<option value="public">Public</option>
						<option value="private">Private</option>
						<option value="liked">Liked</option>
					</select>
					<ChevronDown class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
				</div>

				<!-- Sort Dropdown -->
				<div class="relative">
					<select 
						bind:value={sortBy}
						class="appearance-none bg-black/30 border border-white/20 rounded-lg px-4 py-2 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-music-pink"
					>
						<option value="recent">Recently Updated</option>
						<option value="name">Name</option>
						<option value="tracks">Track Count</option>
						<option value="duration">Duration</option>
					</select>
					<ChevronDown class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
				</div>
			</div>

			<!-- View Controls -->
			<div class="flex items-center gap-2">
				<!-- View Mode Toggle -->
				<div class="flex bg-black/30 border border-white/20 rounded-lg p-1">
					<button
						on:click={() => viewMode = 'grid'}
						class="p-2 rounded transition-colors {viewMode === 'grid' ? 'bg-music-pink text-white' : 'text-gray-400 hover:text-white'}"
					>
						<Grid3X3 class="w-4 h-4" />
					</button>
					<button
						on:click={() => viewMode = 'list'}
						class="p-2 rounded transition-colors {viewMode === 'list' ? 'bg-music-pink text-white' : 'text-gray-400 hover:text-white'}"
					>
						<List class="w-4 h-4" />
					</button>
				</div>

				<!-- Create Playlist Button -->
				<button 
					on:click={() => showCreateModal = true}
					class="flex items-center gap-2 px-4 py-2 bg-music-pink hover:bg-pink-600 rounded-lg text-white transition-colors"
				>
					<Plus class="w-4 h-4" />
					<span class="hidden sm:inline">Create</span>
				</button>
			</div>
		</div>

		<!-- Stats Row -->
		<div class="flex items-center gap-6 text-sm text-gray-400">
			<span>{playlists.length} total playlists</span>
			<span>{filteredPlaylists.length} shown</span>
			{#if globalDefaultPlaylist}
				<span>Default: {globalDefaultPlaylist.name}</span>
			{/if}
			{#if $currentActivePlaylist}
				<span class="text-music-pink">Active: {$currentActivePlaylist.name}</span>
			{/if}
		</div>
	</div>

	<!-- Playlist Content -->
	<div class="flex-1 overflow-auto">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<div class="w-8 h-8 border-4 border-music-pink border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-400">Loading playlists...</p>
				</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<AlertTriangle class="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p class="text-red-400 mb-2">Failed to load playlists</p>
					<p class="text-gray-400 text-sm">{error}</p>
					<button 
						on:click={loadPlaylists}
						class="mt-4 px-4 py-2 bg-music-pink hover:bg-pink-600 rounded-lg text-white transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if filteredPlaylists.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<Library class="w-12 h-12 text-gray-500 mx-auto mb-4" />
					<p class="text-gray-400 mb-2">
						{searchQuery || selectedFilter !== 'all' ? 'No playlists match your criteria' : 'No playlists yet'}
					</p>
					{#if searchQuery || selectedFilter !== 'all'}
						<button 
							on:click={() => {searchQuery = ''; selectedFilter = 'all';}}
							class="text-music-pink hover:text-pink-400 transition-colors"
						>
							Clear filters
						</button>
					{:else}
						<button 
							on:click={() => showCreateModal = true}
							class="mt-4 px-4 py-2 bg-music-pink hover:bg-pink-600 rounded-lg text-white transition-colors"
						>
							Create Your First Playlist
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<div class="p-6">
				{#if viewMode === 'grid'}
					<!-- Grid View -->
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
						{#each filteredPlaylists as playlist (playlist.id)}
							<div class="group glass-morphism rounded-2xl border border-white/10 hover:border-music-pink/50 transition-all duration-300 overflow-hidden">
								<!-- Playlist Cover -->
								<div class="aspect-square bg-gradient-to-br from-music-pink/20 via-purple-500/20 to-blue-500/20 relative overflow-hidden">
									{#if playlist.coverImage}
										<img 
											src={playlist.coverImage} 
											alt={playlist.name}
											class="w-full h-full object-cover"
											loading="lazy"
										>
									{:else}
										<div class="w-full h-full flex items-center justify-center">
											<Library class="w-16 h-16 text-white/50" />
										</div>
									{/if}
									
									<!-- Overlay -->
									<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
										<button 
											on:click={() => selectPlaylist(playlist)}
											class="p-4 bg-music-pink hover:bg-pink-600 rounded-full text-white transition-colors transform scale-90 group-hover:scale-100"
										>
											<Play class="w-6 h-6" />
										</button>
									</div>

									<!-- Active indicator -->
									{#if $currentActivePlaylist?.id === playlist.id}
										<div class="absolute top-3 right-3 w-3 h-3 bg-music-pink rounded-full animate-pulse"></div>
									{/if}
								</div>

								<!-- Playlist Info -->
								<div class="p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="min-w-0 flex-1">
											<h3 class="font-semibold text-white truncate group-hover:text-music-pink transition-colors">
												{playlist.name}
											</h3>
											<p class="text-sm text-gray-400 truncate">
												{playlist.description || 'No description'}
											</p>
										</div>
										
										<!-- Playlist Menu -->
										<div class="relative">
											<button class="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
												<MoreHorizontal class="w-4 h-4" />
											</button>
										</div>
									</div>

									<!-- Stats -->
									<div class="flex items-center gap-4 text-xs text-gray-500 mb-3">
										<span class="flex items-center gap-1">
											<Music class="w-3 h-3" />
											{playlist.trackCount || 0} tracks
										</span>
										<span class="flex items-center gap-1">
											<Clock class="w-3 h-3" />
											{playlist.totalDuration ? formatDuration(playlist.totalDuration) : '--'}
										</span>
										{#if playlist.isPublic}
											<span class="flex items-center gap-1">
												<Users class="w-3 h-3" />
												Public
											</span>
										{:else}
											<span class="flex items-center gap-1">
												<Lock class="w-3 h-3" />
												Private
											</span>
										{/if}
									</div>

									<!-- Actions -->
									<div class="flex items-center justify-between">
										<span class="text-xs text-gray-500">
											{formatDate(playlist.updated || playlist.created || new Date().toISOString())}
										</span>
										
										<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button class="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
												<Heart class="w-3 h-3" />
											</button>
											<button class="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
												<Share class="w-3 h-3" />
											</button>
											<button class="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
												<Edit3 class="w-3 h-3" />
											</button>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- List View -->
					<div class="space-y-2">
						{#each filteredPlaylists as playlist (playlist.id)}
							<div 
								class="group p-4 glass-morphism rounded-xl border border-white/10 hover:border-music-pink/50 transition-all duration-300 cursor-pointer"
								role="button"
								tabindex="0"
								on:click={() => selectPlaylist(playlist)}
								on:keydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										selectPlaylist(playlist);
									}
								}}
							>
								<div class="flex items-center gap-4">
									<!-- Thumbnail -->
									<div class="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-music-pink/20 via-purple-500/20 to-blue-500/20 flex-shrink-0 relative">
										{#if playlist.coverImage}
											<img 
												src={playlist.coverImage} 
												alt={playlist.name}
												class="w-full h-full object-cover"
												loading="lazy"
											>
										{:else}
											<div class="w-full h-full flex items-center justify-center">
												<Library class="w-8 h-8 text-white/50" />
											</div>
										{/if}
										
										{#if $currentActivePlaylist?.id === playlist.id}
											<div class="absolute top-1 right-1 w-2 h-2 bg-music-pink rounded-full animate-pulse"></div>
										{/if}
									</div>

									<!-- Playlist Info -->
									<div class="flex-1 min-w-0">
										<h3 class="font-semibold text-white truncate group-hover:text-music-pink transition-colors">
											{playlist.name}
										</h3>
										<p class="text-sm text-gray-400 truncate">
											{playlist.description || 'No description'}
										</p>
										<div class="flex items-center gap-4 text-xs text-gray-500 mt-1">
											<span>{playlist.trackCount || 0} tracks</span>
											<span>{playlist.totalDuration ? formatDuration(playlist.totalDuration) : '--'}</span>
											<span>{playlist.isPublic ? 'Public' : 'Private'}</span>
										</div>
									</div>

									<!-- Updated Date -->
									<div class="text-sm text-gray-500">
										{formatDate(playlist.updated || playlist.created || new Date().toISOString())}
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
										<button class="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
											<Play class="w-4 h-4" />
										</button>
										<button class="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
											<Heart class="w-4 h-4" />
										</button>
										<button class="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
											<MoreHorizontal class="w-4 h-4" />
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Create Playlist Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-youtube-darker border border-white/20 rounded-2xl p-6 w-full max-w-md">
			<h2 class="text-xl font-bold text-white mb-4">Create New Playlist</h2>
			
			<form on:submit|preventDefault={createPlaylist}>
				<div class="space-y-4">
					<!-- Playlist Name -->
					<div>
						<label for="playlist-name" class="block text-sm font-medium text-gray-300 mb-2">Playlist Name</label>
						<input
							id="playlist-name"
							type="text"
							bind:value={newPlaylistName}
							placeholder="Enter playlist name..."
							class="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-pink"
							required
						>
					</div>

					<!-- Description -->
					<div>
						<label for="playlist-description" class="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
						<textarea
							id="playlist-description"
							bind:value={newPlaylistDescription}
							placeholder="Describe your playlist..."
							rows="3"
							class="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-pink resize-none"
						></textarea>
					</div>

					<!-- Public/Private -->
					<div class="flex items-center gap-3">
						<input
							id="playlist-public"
							type="checkbox"
							bind:checked={newPlaylistIsPublic}
							class="w-4 h-4 rounded border-white/20 bg-black/30 text-music-pink focus:ring-music-pink focus:ring-2"
						>
						<label for="playlist-public" class="text-sm text-gray-300">Make this playlist public</label>
					</div>
				</div>

				<!-- Modal Actions -->
				<div class="flex items-center gap-3 mt-6">
					<button
						type="button"
						on:click={() => showCreateModal = false}
						class="flex-1 px-4 py-2 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!newPlaylistName.trim()}
						class="flex-1 px-4 py-2 bg-music-pink hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
					>
						Create
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.status-indicator {
		@apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium;
	}
	
	.status-connected-playing {
		@apply bg-green-500/20 text-green-400 border border-green-500/30;
	}
	
	.status-connected-paused {
		@apply bg-yellow-500/20 text-yellow-400 border border-yellow-500/30;
	}
	
	.status-disconnected {
		@apply bg-red-500/20 text-red-400 border border-red-500/30;
	}
	
	.status-error {
		@apply bg-red-500/20 text-red-400 border border-red-500/30;
	}
</style>