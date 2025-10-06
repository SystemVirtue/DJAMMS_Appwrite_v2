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
		User,
		Cpu,
		HardDrive,
		MemoryStick,
		Activity,
		Globe,
		Server,
		Zap,
		Database,
		Timer
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

	// System Resources Monitoring
	let systemResources = {
		// Client-side metrics (implementable)
		memoryUsage: { used: 0, total: 0, percentage: 0 },
		networkStatus: 'unknown',
		pageLoadTime: 0,
		jsHeapSize: { used: 0, total: 0, limit: 0 },
		connectionSpeed: 'unknown',
		websocketStatus: 'unknown',
		
		// Server-side metrics (partially implementable)
		appwriteHealth: 'unknown',
		apiResponseTime: 0,
		databaseStatus: 'unknown',
		
		// System metrics (not implementable from web app)
		cpuUsage: 'unable to implement / access actual CPU Usage',
		serverMemory: 'unable to implement / access server memory',
		diskSpace: 'unable to implement / access disk space',
		systemLoad: 'unable to implement / access system load'
	};

	let systemResourcesInterval: number;

	// Reactive filtered and sorted playlists
		// Reactive filtered playlists from store
	$: filteredPlaylists = $djammsStore.playlists
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

	async function loadPlaylists() {
		isLoading = true;
		error = null;
		try {
			console.log('🎵 Playlist Library Tab: Loading user playlists...');
			await djammsStore.loadPlaylists();
			// Playlists are now managed by djammsStore
			
			// Load global default playlist info
			globalDefaultPlaylist = await playlistService.getGlobalDefaultPlaylist();
			
			console.log(`🎵 Playlist Library Tab: Loaded playlists from store`);
		} catch (err) {
			console.error('🎵 Playlist Library Tab: Error loading playlists:', err);
			error = err instanceof Error ? err.message : 'Failed to load playlists';
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
				// Refresh playlists from store
				await djammsStore.loadPlaylists();
				
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
			djammsStore.update(state => ({
				...state,
				currentPlaylist: playlist
			}));
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

	// System Resources Monitoring Functions
	function updateSystemResources() {
		try {
			// Client-side memory usage (implementable)
			if ('memory' in performance) {
				const memInfo = (performance as any).memory;
				systemResources.memoryUsage = {
					used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024), // MB
					total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024), // MB
					percentage: Math.round((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100)
				};
				systemResources.jsHeapSize = {
					used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
					total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
					limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024)
				};
			}

			// Network status (implementable)
			systemResources.networkStatus = navigator.onLine ? 'online' : 'offline';

			// Connection speed estimation (implementable)
			if ('connection' in navigator) {
				const conn = (navigator as any).connection;
				systemResources.connectionSpeed = conn?.effectiveType || 'unknown';
			}

			// Page load time (implementable)
			if (performance.timing) {
				systemResources.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
			}

			// WebSocket status (implementable - check if connected to Appwrite realtime)
			systemResources.websocketStatus = $djammsStore.connectionStatus === 'connected' ? 'connected' : 'disconnected';

			// Appwrite health check (implementable)
			systemResources.appwriteHealth = $djammsStore.connectionStatus === 'connected' ? 'healthy' : 'unhealthy';

			// API response time (implementable - measure recent API calls)
			// This would require tracking API call timings
			systemResources.apiResponseTime = systemResources.apiResponseTime || 0;

			// Database status (implementable - check recent database operations)
			systemResources.databaseStatus = $djammsStore.lastSync ? 'operational' : 'unknown';

		} catch (error) {
			console.warn('System resources monitoring error:', error);
		}
	}

	onMount(() => {
		console.log('🎵 Playlist Library Tab: Component mounted');
		loadPlaylists();
		
		// Start system resources monitoring
		updateSystemResources();
		systemResourcesInterval = window.setInterval(updateSystemResources, 5000); // Update every 5 seconds
	});

	onDestroy(() => {
		console.log('🎵 Playlist Library Tab: Component destroyed');
		if (systemResourcesInterval) {
			clearInterval(systemResourcesInterval);
		}
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
			{#if $djammsStore.playerState?.status}
				{@const statusDisplay = getStatusDisplay($djammsStore.playerState.status)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="text-sm">{statusDisplay.text}</span>
				</div>
			{/if}
		</div>

		<!-- System Resources Status -->
		<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
			<!-- Memory Usage -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Activity class="w-4 h-4 text-blue-400 mb-1" />
				<div class="text-xs text-gray-400">Memory</div>
				<div class="text-sm font-semibold text-white">
					{systemResources.memoryUsage.used}MB / {systemResources.memoryUsage.total}MB
				</div>
				<div class="text-xs text-gray-500">{systemResources.memoryUsage.percentage}%</div>
			</div>

			<!-- Network Status -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Wifi class="w-4 h-4 text-green-400 mb-1" />
				<div class="text-xs text-gray-400">Network</div>
				<div class="text-sm font-semibold text-white capitalize">{systemResources.networkStatus}</div>
				<div class="text-xs text-gray-500">{systemResources.connectionSpeed}</div>
			</div>

			<!-- WebSocket Status -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Zap class="w-4 h-4 text-yellow-400 mb-1" />
				<div class="text-xs text-gray-400">WebSocket</div>
				<div class="text-sm font-semibold text-white capitalize">{systemResources.websocketStatus}</div>
				<div class="text-xs text-gray-500">Real-time</div>
			</div>

			<!-- Appwrite Health -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Server class="w-4 h-4 text-purple-400 mb-1" />
				<div class="text-xs text-gray-400">Appwrite</div>
				<div class="text-sm font-semibold text-white capitalize">{systemResources.appwriteHealth}</div>
				<div class="text-xs text-gray-500">Backend</div>
			</div>

			<!-- Database Status -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Database class="w-4 h-4 text-orange-400 mb-1" />
				<div class="text-xs text-gray-400">Database</div>
				<div class="text-sm font-semibold text-white capitalize">{systemResources.databaseStatus}</div>
				<div class="text-xs text-gray-500">Operations</div>
			</div>

			<!-- CPU Usage (Unable to implement) -->
			<div class="status-indicator bg-black/30 border border-white/20 rounded-lg p-3">
				<Cpu class="w-4 h-4 text-red-400 mb-1" />
				<div class="text-xs text-gray-400">CPU Usage</div>
				<div class="text-sm font-semibold text-white">Unable to implement</div>
				<div class="text-xs text-gray-500">Access actual CPU</div>
			</div>
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
			{#if $djammsStore.currentPlaylist}
				<span class="text-music-pink">Active: {$djammsStore.currentPlaylist.name}</span>
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
									{#if $djammsStore.currentPlaylist?.$id === playlist.$id}
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
										
										{#if $djammsStore.currentPlaylist?.$id === playlist.$id}
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
</style>