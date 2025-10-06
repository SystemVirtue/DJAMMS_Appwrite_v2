<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore, venueStatus } from '$lib/stores/djamms';
	import { playerSync } from '$lib/services/playerSync';
	import { windowManager } from '$lib/services/windowManager';
	import { playlistService } from '$lib/services/playlistService';
	import { getDJAMMSService } from '$lib/services/serviceInit';
	import type { Playlist, PlaylistTrack } from '$lib/types';
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
		ChevronDown
	} from 'lucide-svelte';

	import { browser } from '$app/environment';

	// Playlists data from Appwrite
	let playlists: Playlist[] = [];
	let djammsService = getDJAMMSService(); // Initialize unified service
	let isLoading = true;
	let error: string | null = null;
	let globalDefaultPlaylist: Playlist | null = null;

	let searchQuery = '';
	let selectedFilter = 'all'; // 'all', 'public', 'private', 'liked'
	let sortBy = 'recent'; // 'recent', 'name', 'tracks', 'duration'
	let viewMode = 'grid'; // 'grid', 'list'
	let showCreateModal = false;
	let selectedPlaylist = null;

	// Playlist selector state
	let showPlaylistDropdown = false;

	// Filtered and sorted playlists - only show playlists user has access to
	$: filteredPlaylists = playlists
		.filter(playlist => {
			// Only show playlists that are public OR belong to current user
			const currentUserId = $djammsStore.currentUser?.$id;
			const hasAccess = playlist.is_public || (currentUserId && playlist.owner_id === currentUserId);
			
			if (!hasAccess) return false;
			
			const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				playlist.description?.toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesFilter = selectedFilter === 'all' ? true :
				selectedFilter === 'public' ? playlist.is_public :
				selectedFilter === 'private' ? !playlist.is_public :
				false; // TODO: Add liked filter logic
			
			return matchesSearch && matchesFilter;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'tracks':
					return (Array.isArray(b.tracks) ? b.tracks.length : 0) - (Array.isArray(a.tracks) ? a.tracks.length : 0);
				case 'duration':
					const aTracks = Array.isArray(a.tracks) ? a.tracks : [];
					const bTracks = Array.isArray(b.tracks) ? b.tracks : [];
					const aDuration = aTracks.reduce((sum: number, track: any) => sum + (track.duration || 0), 0);
					const bDuration = bTracks.reduce((sum: number, track: any) => sum + (track.duration || 0), 0);
					return bDuration - aDuration;
				case 'recent':
				default:
					return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
			}
		});

	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric' 
		});
	}

	// Load playlists from Appwrite using v3 service
	async function loadPlaylists() {
		try {
			isLoading = true;
			error = null;

			// Load playlists using djammsStore
			await djammsStore.loadPlaylists();

			// Get playlists from store (they are now managed by djammsStore)
			playlists = $djammsStore.playlists || [];

			// Also try to get the global default playlist
			const globalPlaylist = await djammsService.getDefaultPlaylist();
			if (globalPlaylist) {
				// Cast to the main types.ts Playlist interface
				globalDefaultPlaylist = globalPlaylist as unknown as Playlist;
				// Add global playlist if it's not already in the list
				const exists = playlists.find(p => p.$id === globalPlaylist.$id);
				if (!exists) {
					playlists = [globalDefaultPlaylist, ...playlists];
				}
			}

			console.log('Loaded playlists:', playlists);
		} catch (err) {
			console.error('Failed to load playlists from Appwrite:', err);
			error = 'Failed to load playlists. Using fallback data.';

			// Use fallback playlists
			playlists = playlistService.getFallbackPlaylists();
		} finally {
			isLoading = false;
		}
	}

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

	function editPlaylist(playlistId: string) {
		console.log('Editing playlist:', playlistId);
		// TODO: Open edit modal
	}

	function deletePlaylist(playlistId: string) {
		if (confirm('Are you sure you want to delete this playlist?')) {
			playlistService.deletePlaylist(playlistId)
				.then(() => {
					playlists = playlists.filter(p => p.$id !== playlistId);
				})
				.catch((err) => {
					console.error('Failed to delete playlist:', err);
					alert('Failed to delete playlist. Please try again.');
				});
		}
	}

	function togglePlaylistVisibility(playlistId: string) {
		const playlist = playlists.find(p => p.$id === playlistId);
		if (!playlist) return;
		
		playlistService.updatePlaylist(playlistId, { is_public: !playlist.is_public })
			.then((updatedPlaylist) => {
				playlists = playlists.map(p => 
					p.$id === playlistId ? updatedPlaylist : p
				);
			})
			.catch((err) => {
				console.error('Failed to update playlist visibility:', err);
				alert('Failed to update playlist visibility. Please try again.');
			});
	}

	// Playlist selector functions
	function togglePlaylistDropdown() {
		showPlaylistDropdown = !showPlaylistDropdown;
	}

	function selectPlaylist(playlist: Playlist) {
		djammsStore.sendCommand('set_active_playlist', { playlist });
		showPlaylistDropdown = false;
		console.log('Selected playlist:', playlist.name);
	}

	function playPlaylist(playlistId: string) {
		console.log('Playing playlist:', playlistId);
		const playlist = playlists.find(p => p.$id === playlistId);
		if (playlist) {
			// Set as active playlist and load into queue
			djammsStore.sendCommand('load_playlist_tracks', { tracks: playlist.tracks || [] });
			// Redirect to queue manager or video player
			window.location.href = '/queuemanager';
		}
	}

	// Function to load a playlist into the queue
	function loadPlaylistIntoQueue(playlist: Playlist) {
		// Load playlist tracks into venue queue
		djammsStore.sendCommand('load_playlist_tracks', { tracks: playlist.tracks || [] });
		// Navigate to queue manager to see the loaded queue
		window.location.href = '/queuemanager';
	}

	// Close dropdown when clicking outside
	function getTotalDuration(playlists: Playlist[]): number {
		return playlists.reduce((sum, p) => sum + (Array.isArray(p.tracks) ? p.tracks.reduce((trackSum: number, track: any) => trackSum + (track.duration || 0), 0) : 0), 0);
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (showPlaylistDropdown && !target.closest('.playlist-selector')) {
			showPlaylistDropdown = false;
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
			console.log('🔐 Playlist Library: User not authenticated, closing window');
			alert('Authentication required. Please log in first.');
			window.close();
			return;
		}

		// Check for duplicate instance first
		if (browser && windowManager.shouldPreventDuplicate()) {
			// Show alert and close window
			alert('Playlist Library is already open in another window.');
			window.close();
			return;
		}

		// Initialize sync service for this window - this will request current status
		if (browser) {
			playerSync.initializeForWindow();

			// Add click outside handler
			document.addEventListener('click', handleClickOutside);
		}

		// Load playlists from Appwrite
		await loadPlaylists();
	});

	onDestroy(() => {
		// Sync service cleanup is handled globally
		if (browser) {
			document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<svelte:head>
	<title>Playlist Library - DJAMMS</title>
</svelte:head>

<main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-pink">
	<!-- Header -->
	<header class="flex justify-between items-center p-4 glass-morphism border-b border-white/10">
		<div class="flex items-center gap-4">
			<div class="w-10 h-10 bg-gradient-to-br from-music-pink to-pink-700 rounded-xl flex items-center justify-center">
				<Library class="w-6 h-6 text-white" />
			</div>
			<div>
				<h1 class="text-xl font-bold text-white">Playlist Library</h1>
				<p class="text-gray-400 text-sm">Create, organize, and manage your playlists</p>
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
					src={`https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.email || 'User')}&background=EC4899&color=fff`}
					alt="User Avatar"
					class="w-8 h-8 rounded-full"
				>
				<span class="text-white text-sm font-medium hidden sm:block">{$djammsStore.currentUser?.email}</span>
			</div>
		</div>
	</header>

	<!-- Venue Info -->
	<div class="p-4 border-b border-white/10 bg-white/5">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-white font-medium">Current Venue:</span>
				<div class="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
					<span class="text-white font-medium">{$djammsStore.currentVenue?.venue_name || 'No venue selected'}</span>
				</div>
			</div>

			<!-- Load Playlist Button & Dropdown -->
			<div class="relative playlist-selector">
				<button
					on:click={togglePlaylistDropdown}
					class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-music-pink to-pink-700 text-white rounded-lg hover:from-music-pink/90 hover:to-pink-700/90 transition-all"
				>
					<span>Load Playlist</span>
					<div class="w-4 h-4 transition-transform {showPlaylistDropdown ? 'rotate-180' : ''}">
						<ChevronDown class="w-4 h-4" />
					</div>
				</button>

				<!-- Dropdown -->
				{#if showPlaylistDropdown}
					<div class="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-white/20 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
						{#if filteredPlaylists.length > 0}
							{#each filteredPlaylists as playlist}
								<button
									on:click={() => loadPlaylistIntoQueue(playlist)}
									class="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors text-left"
								>
									<img 
										src={playlist.thumbnail}
										alt={playlist.name}
										class="w-10 h-10 rounded-lg object-cover"
									/>
									<div class="flex-1 min-w-0">
										<h3 class="text-white font-medium truncate">{playlist.name}</h3>
										<p class="text-gray-400 text-sm truncate">{playlist.tracks?.length || 0} tracks</p>
									</div>
									{#if playlist.is_public}
										<Unlock class="w-4 h-4 text-green-400" />
									{:else}
										<Lock class="w-4 h-4 text-gray-400" />
									{/if}
								</button>
							{/each}
						{:else}
							<div class="p-4 text-center text-gray-400">
								No playlists available
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Controls Bar -->
	<div class="p-6 border-b border-white/10">
		<div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
			<!-- Search & Create -->
			<div class="flex gap-4 flex-1">
				<div class="relative flex-1 max-w-md">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input 
						type="text"
						placeholder="Search playlists..."
						bind:value={searchQuery}
						class="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-music-pink focus:bg-white/15 transition-all"
					>
				</div>
				
				<button 
					on:click={() => showCreateModal = true}
					class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 hover:from-music-pink/90 hover:to-pink-700/90 text-white rounded-xl font-medium transition-all flex items-center gap-2"
				>
					<Plus class="w-5 h-5" />
					Create Playlist
				</button>
			</div>

			<!-- Filters & View Options -->
			<div class="flex gap-4 items-center">
				<!-- Filter -->
				<div class="flex bg-white/10 rounded-xl border border-white/20">
					<button 
						class="px-4 py-2 rounded-l-xl text-sm font-medium transition-colors"
						class:bg-music-pink={selectedFilter === 'all'}
						class:text-white={selectedFilter === 'all'}
						class:text-gray-400={selectedFilter !== 'all'}
						on:click={() => selectedFilter = 'all'}
					>
						All
					</button>
					<button 
						class="px-4 py-2 text-sm font-medium transition-colors"
						class:bg-music-pink={selectedFilter === 'public'}
						class:text-white={selectedFilter === 'public'}
						class:text-gray-400={selectedFilter !== 'public'}
						on:click={() => selectedFilter = 'public'}
					>
						Public
					</button>
					<button 
						class="px-4 py-2 rounded-r-xl text-sm font-medium transition-colors"
						class:bg-music-pink={selectedFilter === 'private'}
						class:text-white={selectedFilter === 'private'}
						class:text-gray-400={selectedFilter !== 'private'}
						on:click={() => selectedFilter = 'private'}
					>
						Private
					</button>
				</div>

				<!-- Sort -->
				<select 
					bind:value={sortBy}
					class="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-music-pink"
				>
					<option value="recent">Recently Played</option>
					<option value="name">Name</option>
					<option value="tracks">Track Count</option>
					<option value="duration">Duration</option>
				</select>

				<!-- View Mode Toggle -->
				<div class="flex bg-white/10 rounded-xl border border-white/20">
					<button 
						class="p-2 rounded-l-xl transition-colors"
						class:bg-music-pink={viewMode === 'grid'}
						class:text-white={viewMode === 'grid'}
						class:text-gray-400={viewMode !== 'grid'}
						on:click={() => viewMode = 'grid'}
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
						</svg>
					</button>
					<button 
						class="p-2 rounded-r-xl transition-colors"
						class:bg-music-pink={viewMode === 'list'}
						class:text-white={viewMode === 'list'}
						class:text-gray-400={viewMode !== 'list'}
						on:click={() => viewMode = 'list'}
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Playlists Content -->
	<div class="flex-1 overflow-auto p-6">
		{#if isLoading}
			<!-- Loading State -->
			<div class="text-center py-16">
				<div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
					<Library class="w-8 h-8 text-gray-400" />
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Loading Playlists...</h3>
				<p class="text-gray-400">Fetching your music collection from the cloud</p>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="text-center py-16">
				<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
					<AlertTriangle class="w-8 h-8 text-red-400" />
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Failed to Load Playlists</h3>
				<p class="text-gray-400 mb-4">{error}</p>
				<button 
					on:click={loadPlaylists}
					class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 text-white rounded-full font-medium hover:shadow-lg transition-all"
				>
					Try Again
				</button>
			</div>
		{:else if viewMode === 'grid'}
			<!-- Global Default Playlist Section -->
			{#if globalDefaultPlaylist}
				<div class="mb-8">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-xl font-bold text-white">Featured Playlist</h2>
						<span class="px-3 py-1 bg-gradient-to-r from-music-purple to-purple-700 text-white text-xs font-medium rounded-full">
							Global Default
						</span>
					</div>
					
					<div class="bg-gradient-to-r from-music-purple/10 to-purple-700/10 border border-music-purple/20 rounded-2xl p-6">
						<div class="flex gap-6">
							<!-- Large Thumbnail -->
							<div class="relative flex-shrink-0">
								<img 
									src={globalDefaultPlaylist.thumbnail}
									alt={globalDefaultPlaylist.name}
									class="w-32 h-32 rounded-xl object-cover shadow-lg"
								>
								<div class="absolute inset-0 bg-black/20 rounded-xl"></div>
							</div>
							
							<!-- Playlist Info -->
							<div class="flex-1 flex flex-col justify-between">
								<div>
									<h3 class="text-2xl font-bold text-white mb-2">{globalDefaultPlaylist.name}</h3>
									<p class="text-gray-300 mb-4 line-clamp-2">{globalDefaultPlaylist.description || 'The default playlist for all users'}</p>
									
									<div class="flex items-center gap-6 text-sm text-gray-300 mb-4">
										<span class="flex items-center gap-2">
											<Music class="w-4 h-4" />
											{Array.isArray(globalDefaultPlaylist.tracks) ? globalDefaultPlaylist.tracks.length : 0} tracks
										</span>
										<span class="flex items-center gap-2">
											<Clock class="w-4 h-4" />
											{formatTime(getTotalDuration([globalDefaultPlaylist]))}
										</span>
										<span class="flex items-center gap-2">
											<Users class="w-4 h-4" />
											Global
										</span>
									</div>
								</div>
								
								<!-- Actions -->
								<div class="flex items-center gap-3">
									<button 
										on:click={() => {
											if (globalDefaultPlaylist) {
												loadPlaylistIntoQueue(globalDefaultPlaylist);
											}
										}}
										class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 hover:from-music-pink/90 hover:to-pink-700/90 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
									>
										<Play class="w-5 h-5 inline mr-2" />
										Load into Queue
									</button>
									
									<button 
										on:click={() => {
											if (globalDefaultPlaylist) {
												playPlaylist(globalDefaultPlaylist.$id);
											}
										}}
										class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all border border-white/20"
									>
										Play Now
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Grid View -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
				{#each filteredPlaylists as playlist}
					<div class="group bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
						<!-- Playlist Cover -->
						<div class="relative">
							<img 
								src={playlist.thumbnail}
								alt={playlist.name}
								class="w-full h-48 object-cover rounded-t-2xl"
							>
							
							<!-- Play Button Overlay -->
							<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl flex items-center justify-center">
								<button 
									on:click={() => playPlaylist(playlist.$id)}
									class="p-4 bg-music-pink hover:bg-music-pink/90 rounded-full text-white transition-all transform hover:scale-110"
								>
									<Play class="w-8 h-8 ml-1" />
								</button>
							</div>

							<!-- Privacy Indicator -->
							<div class="absolute top-3 right-3">
								<div class="p-2 bg-black/60 rounded-lg">
									{#if playlist.is_public}
										<Unlock class="w-4 h-4 text-green-400" />
									{:else}
										<Lock class="w-4 h-4 text-gray-400" />
									{/if}
								</div>
							</div>
						</div>

						<!-- Playlist Info -->
						<div class="p-4">
							<h3 class="font-semibold text-white text-lg mb-1 truncate">{playlist.name}</h3>
							<p class="text-gray-400 text-sm mb-3 line-clamp-2">{playlist.description}</p>
							
							<!-- Stats -->
							<div class="flex items-center gap-4 text-xs text-gray-400 mb-3">
								<span class="flex items-center gap-1">
									<Music class="w-3 h-3" />
									{Array.isArray(playlist.tracks) ? playlist.tracks.length : 0}
								</span>
								<span class="flex items-center gap-1">
									<Clock class="w-3 h-3" />
									{formatTime(getTotalDuration([playlist]))}
								</span>
							</div>

							<!-- Actions -->
							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">
									{formatDate(playlist.$updatedAt)}
								</span>
								
								<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button 
										on:click={() => editPlaylist(playlist.$id)}
										class="p-2 text-gray-400 hover:text-white transition-colors"
										title="Edit"
									>
										<Edit3 class="w-4 h-4" />
									</button>
									
									<button 
										on:click={() => togglePlaylistVisibility(playlist.$id)}
										class="p-2 text-gray-400 hover:text-white transition-colors"
										title="Toggle Privacy"
									>
										<Share class="w-4 h-4" />
									</button>
									
									<button class="p-2 text-gray-400 hover:text-white transition-colors">
										<MoreHorizontal class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Empty State for Grid View -->
			{#if filteredPlaylists.length === 0}
				<div class="text-center py-16">
					<div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<Library class="w-8 h-8 text-gray-400" />
					</div>
					<h3 class="text-lg font-semibold text-white mb-2">No Playlists Found</h3>
					<p class="text-gray-400 mb-4">Create your first playlist or adjust your search filters</p>
					<button 
						on:click={() => showCreateModal = true}
						class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 text-white rounded-full font-medium hover:shadow-lg transition-all"
					>
						Create Your First Playlist
					</button>
				</div>
			{/if}
		{:else}
			<!-- Global Default Playlist Section for List View -->
			{#if globalDefaultPlaylist}
				<div class="mb-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-xl font-bold text-white">Featured Playlist</h2>
						<span class="px-3 py-1 bg-gradient-to-r from-music-purple to-purple-700 text-white text-xs font-medium rounded-full">
							Global Default
						</span>
					</div>
					
					<div class="bg-gradient-to-r from-music-purple/10 to-purple-700/10 border border-music-purple/20 rounded-xl p-4">
						<div class="flex items-center gap-4">
							<!-- Thumbnail -->
							<img 
								src={globalDefaultPlaylist.thumbnail}
								alt={globalDefaultPlaylist.name}
								class="w-20 h-20 rounded-lg object-cover shadow-lg"
							>
							
							<!-- Info -->
							<div class="flex-1">
								<h3 class="text-xl font-bold text-white mb-1">{globalDefaultPlaylist.name}</h3>
								<p class="text-gray-300 mb-2 line-clamp-1">{globalDefaultPlaylist.description || 'The default playlist for all users'}</p>
								
								<div class="flex items-center gap-4 text-sm text-gray-400">
									<span class="flex items-center gap-1">
										<Music class="w-3 h-3" />
										{Array.isArray(globalDefaultPlaylist.tracks) ? globalDefaultPlaylist.tracks.length : 0}
									</span>
									<span class="flex items-center gap-1">
										<Clock class="w-3 h-3" />
										{formatTime(getTotalDuration([globalDefaultPlaylist]))}
									</span>
									<span class="flex items-center gap-1">
										<Users class="w-3 h-3" />
										Global
									</span>
								</div>
							</div>
							
							<!-- Actions -->
							<div class="flex items-center gap-2">
								<button 
									on:click={() => {
										if (globalDefaultPlaylist) {
											loadPlaylistIntoQueue(globalDefaultPlaylist);
										}
									}}
									class="px-4 py-2 bg-gradient-to-r from-music-pink to-pink-700 hover:from-music-pink/90 hover:to-pink-700/90 text-white rounded-lg font-medium transition-all text-sm"
								>
									<Play class="w-4 h-4 inline mr-1" />
									Load Queue
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- List View -->
			<div class="space-y-3">
				{#each filteredPlaylists as playlist}
					<div class="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
						<!-- Thumbnail -->
						<div class="relative">
							<img 
								src={playlist.thumbnail}
								alt={playlist.name}
								class="w-16 h-16 rounded-lg object-cover"
							>
							<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
								<button 
									on:click={() => playPlaylist(playlist.$id)}
									class="p-2 bg-music-pink hover:bg-music-pink/90 rounded-full text-white transition-all"
								>
									<Play class="w-4 h-4 ml-0.5" />
								</button>
							</div>
						</div>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-semibold text-white truncate">{playlist.name}</h3>
								{#if playlist.is_public}
									<Unlock class="w-4 h-4 text-green-400" />
								{:else}
									<Lock class="w-4 h-4 text-gray-400" />
								{/if}
							</div>
							<p class="text-gray-400 text-sm truncate">{playlist.description}</p>
						</div>

						<!-- Stats -->
						<div class="flex items-center gap-6 text-sm text-gray-400">
							<span class="flex items-center gap-1">
								<Music class="w-4 h-4" />
								{Array.isArray(playlist.tracks) ? playlist.tracks.length : 0}
							</span>
							<span class="flex items-center gap-1">
								<Clock class="w-4 h-4" />
								{formatTime(getTotalDuration([playlist]))}
							</span>
							<span>{formatDate(playlist.$updatedAt)}</span>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button 
								on:click={() => editPlaylist(playlist.$id)}
								class="p-2 text-gray-400 hover:text-white transition-colors"
								title="Edit"
							>
								<Edit3 class="w-4 h-4" />
							</button>
							
							<button 
								on:click={() => togglePlaylistVisibility(playlist.$id)}
								class="p-2 text-gray-400 hover:text-white transition-colors"
								title="Share"
							>
								<Share class="w-4 h-4" />
							</button>

							<button 
								on:click={() => deletePlaylist(playlist.$id)}
								class="p-2 text-gray-400 hover:text-red-400 transition-colors"
								title="Delete"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Empty State for List View -->
			{#if filteredPlaylists.length === 0}
				<div class="text-center py-16">
					<div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<Library class="w-8 h-8 text-gray-400" />
					</div>
					<h3 class="text-lg font-semibold text-white mb-2">No Playlists Found</h3>
					<p class="text-gray-400 mb-4">Create your first playlist or adjust your search filters</p>
					<button 
						on:click={() => showCreateModal = true}
						class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 text-white rounded-full font-medium hover:shadow-lg transition-all"
					>
						Create Your First Playlist
					</button>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Stats Footer -->
	<footer class="p-4 border-t border-white/10 text-center text-gray-400 text-sm">
		Showing {filteredPlaylists.length} of {playlists.length} playlists • 
		Total: {playlists.reduce((sum, p) => sum + (p.tracks?.length || 0), 0)} tracks • 
		{formatTime(getTotalDuration(playlists))} of music
	</footer>
</main>