<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { djammsStore, venueStatus, currentTrack, playerControls, queueInfo, playerStatus } from '$lib/stores/djamms';
	import { playerSync } from '$lib/services/playerSync';
	import { windowManager } from '$lib/services/windowManager';
	import { getDJAMMSService } from '$lib/services/serviceInit';
	import { browser } from '$app/environment';
	import { account } from '$lib/utils/appwrite';
	import type { PageData } from './$types';

	// Import tab components
	import QueueManagerTab from './tabs/QueueManagerTab.svelte';
	import PlaylistLibraryTab from './tabs/PlaylistLibraryTab.svelte';
	import AdminConsoleTab from './tabs/AdminConsoleTab.svelte';

	// Accept SvelteKit props (external reference only)
	export const data = undefined;

	import {
		Play,
		ListMusic,
		Library,
		Settings,
		Circle,
		Wifi,
		WifiOff,
		AlertTriangle,
		LogOut,
		Home,
		X,
		Clock,
		CheckCircle,
		Users
	} from 'lucide-svelte';

	// Redirect to login if not authenticated (wait for loading to finish)
	$: if (browser && !$djammsStore.isLoading && !$djammsStore.isAuthenticated) {
		goto('/');
	}	// Tabbed interface state
	let activeTab = 'dashboard'; // 'dashboard', 'queuemanager', 'playlistlibrary', 'adminconsole'
	let openWindows: any[] = [];
	let djammsService = getDJAMMSService(); // Initialize unified service

	async function logout() {
		try {
			await account.deleteSession('current');
			djammsStore.setUser(null);
			goto('/');
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}

	function openTab(tabName: string) {
		activeTab = tabName;
	}

	function closeTab() {
		activeTab = 'dashboard';
	}

	// Legacy window manager functions (kept for compatibility)
	async function openWindow(path: string) {
		// Convert path to tab name
		const pathToTab = {
			'/queuemanager': 'queuemanager',
			'/playlistlibrary': 'playlistlibrary',
			'/adminconsole': 'adminconsole'
		};
		
		const tabName = pathToTab[path as keyof typeof pathToTab];
		if (tabName) {
			openTab(tabName);
		}
	}

	function updateOpenWindows() {
		openWindows = windowManager.getOpenWindows();
	}

	function getStatusDisplay() {
		const status = $djammsStore.playerState.status;
		const connection = $djammsStore.connectionStatus;

		switch (status) {
			case 'playing':
				return {
					icon: Circle,
					text: connection === 'connected' ? 'CONNECTED, PLAYING' : 'PLAYING (LOCAL)',
					class: 'status-connected-playing'
				};
			case 'paused':
				return {
					icon: Circle,
					text: connection === 'connected' ? 'CONNECTED, PAUSED' : 'PAUSED (LOCAL)',
					class: 'status-connected-paused'
				};
			case 'idle':
				return {
					icon: WifiOff,
					text: 'READY',
					class: 'status-disconnected'
				};
			case 'stopped':
				return {
					icon: AlertTriangle,
					text: 'STOPPED',
					class: 'status-error'
				};
			default:
				return {
					icon: WifiOff,
					text: 'NO CONNECTED PLAYER',
					class: 'status-disconnected'
				};
		}
	}

	// Tab configuration
	const tabs = [
		{
			id: 'dashboard',
			title: 'Dashboard',
			icon: Home,
			component: null
		},
		{
			id: 'queuemanager',
			title: 'Queue Manager',
			description: 'Manage current playlist and playback queue',
			icon: ListMusic,
			gradient: 'from-music-purple to-purple-700',
			component: QueueManagerTab
		},
		{
			id: 'playlistlibrary',
			title: 'Playlist Library',
			description: 'Create, edit and organize your playlists',
			icon: Library,
			gradient: 'from-music-pink to-pink-700',
			component: PlaylistLibraryTab
		},
		{
			id: 'adminconsole',
			title: 'Admin Console',
			description: 'Configure player settings and preferences',
			icon: Settings,
			gradient: 'from-blue-500 to-blue-700',
			component: AdminConsoleTab
		}
	];

	onMount(() => {
		// Initialize player sync for backward compatibility
		playerSync.initialize();

		// Load user venues and playlists
		if ($djammsStore.currentUser) {
			djammsStore.loadUserVenues($djammsStore.currentUser.user_id);
			djammsStore.loadPlaylists();
		}

		// Initialize current playlist - load from localStorage or set to global default
		console.log('🎵 Dashboard: Initializing current playlist...');

		// For now, we'll use the first playlist as default
		// TODO: Implement proper playlist persistence in venue-centric architecture
		if ($djammsStore.playlists.length > 0 && !$djammsStore.currentPlaylist) {
			djammsStore.setCurrentPlaylist($djammsStore.playlists[0]);
			console.log('🎵 Dashboard: Set first available playlist as active:', $djammsStore.playlists[0].name);
		}

		// Update open windows list initially
		updateOpenWindows();

		// Update open windows every 2 seconds
		const windowUpdateInterval = setInterval(() => {
			updateOpenWindows();
		}, 2000);

		return () => {
			clearInterval(windowUpdateInterval);
		};
	});	onDestroy(() => {
		// Sync service cleanup is handled globally
	});

	const dashboardCards = [
		{
			id: 'videoplayer',
			title: 'Start Video Player',
			description: 'Open fullscreen YouTube video player window',
			icon: Play,
			path: '/videoplayer',
			gradient: 'from-youtube-red to-red-700',
			action: async () => {
				if (browser) {
					await windowManager.openEndpoint('/videoplayer');
				}
			}
		},
		{
			id: 'queuemanager',
			title: 'Open Queue Manager',
			description: 'Manage current playlist and playback queue',
			icon: ListMusic,
			path: '/queuemanager',
			gradient: 'from-music-purple to-purple-700',
			action: () => openTab('queuemanager')
		},
		{
			id: 'playlistlibrary',
			title: 'Playlist Library',
			description: 'Create, edit and organize your playlists',
			icon: Library,
			path: '/playlistlibrary',
			gradient: 'from-music-pink to-pink-700',
			action: () => openTab('playlistlibrary')
		},
		{
			id: 'adminconsole',
			title: 'Admin Console',
			description: 'Configure player settings and preferences',
			icon: Settings,
			path: '/adminconsole',
			gradient: 'from-blue-500 to-blue-700',
			action: () => openTab('adminconsole')
		}
	];
</script>

<svelte:head>
	<title>Dashboard - DJAMMS</title>
</svelte:head>

<main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<!-- Header -->
	<header class="flex justify-between items-center p-6 glass-morphism border-b border-white/10">
		<div class="flex items-center gap-4">
			<div class="w-10 h-10 bg-gradient-to-br from-youtube-red to-music-purple rounded-xl flex items-center justify-center">
				<Play class="w-6 h-6 text-white" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-white">DJAMMS Dashboard</h1>
				<p class="text-gray-400 text-sm">Welcome back, {$djammsStore.currentUser?.username || 'User'}</p>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<!-- Player Status -->
			{#if true}
				{@const statusDisplay = getStatusDisplay()}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="hidden sm:inline">{statusDisplay.text}</span>
				</div>
			{/if}

			<!-- User Menu -->
			<div class="flex items-center gap-2">
				<img
					src={$djammsStore.currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.username || 'User')}&background=7C3AED&color=fff`}
					alt="User Avatar"
					class="w-8 h-8 rounded-full"
				>
				<button
					on:click={logout}
					class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
					title="Logout"
				>
					<LogOut class="w-5 h-5" />
				</button>
			</div>
		</div>
	</header>

	<!-- Tab Navigation (when not on dashboard) -->
	{#if activeTab !== 'dashboard'}
		<div class="flex items-center justify-between px-6 py-3 bg-black/20 border-b border-white/10">
			<div class="flex items-center gap-4">
				{#each tabs as tab}
					{#if tab.id !== 'dashboard'}
						<button
							on:click={() => openTab(tab.id)}
							class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors {activeTab === tab.id ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}"
						>
							<svelte:component this={tab.icon} class="w-4 h-4" />
							<span class="hidden sm:inline">{tab.title}</span>
						</button>
					{/if}
				{/each}
			</div>

			<div class="flex items-center gap-2">
				<button
					on:click={() => openTab('dashboard')}
					class="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
					title="Back to Dashboard"
				>
					<Home class="w-4 h-4" />
					<span class="hidden sm:inline">Dashboard</span>
				</button>
				<button
					on:click={closeTab}
					class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
					title="Close Tab"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Main Content Area -->
	<div class="flex-1 overflow-hidden">
		{#if activeTab === 'dashboard'}
			<!-- Dashboard Content -->
			<div class="h-full p-6 overflow-auto">
				<div class="max-w-6xl mx-auto">
					<!-- Welcome Section -->
					<div class="mb-8 text-center">
						<h2 class="text-4xl font-bold text-white mb-4">
							Your Digital Jukebox
						</h2>
						<p class="text-gray-300 text-lg max-w-2xl mx-auto">
							Choose an interface to start managing your music experience. Use tabs for integrated workflow or open separate windows for multi-screen setups.
						</p>
					</div>

					<!-- User Status Banner -->
					{#if $djammsStore.currentUser}
						{#if $djammsStore.currentUser.role === 'admin' || $djammsStore.currentUser.role === 'developer' || $djammsStore.currentUser.is_developer}
							<div class="mb-8 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
								<CheckCircle class="w-6 h-6 text-green-400" />
								<div>
									<h3 class="text-green-400 font-semibold">Full Access Approved</h3>
									<p class="text-green-300 text-sm">Your account has full DJAMMS access. All features are available.</p>
								</div>
							</div>
						{:else}
							<div class="mb-8 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-3">
								<Users class="w-6 h-6 text-blue-400" />
								<div>
									<h3 class="text-blue-400 font-semibold">Standard User Access</h3>
									<p class="text-blue-300 text-sm">You have standard user access to DJAMMS features.</p>
								</div>
							</div>
						{/if}
					{:else}
						<div class="mb-8 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center gap-3">
							<Clock class="w-6 h-6 text-yellow-400 animate-spin" />
							<div>
								<h3 class="text-yellow-400 font-semibold">Loading User Data</h3>
								<p class="text-yellow-300 text-sm">Loading your user profile and permissions...</p>
							</div>
						</div>
					{/if}

					<!-- Dashboard Cards Grid -->
					<div class="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
						{#each dashboardCards as card}
							<div class="group relative overflow-hidden">
								<button
									on:click={$djammsStore.isAuthenticated ? card.action : undefined}
									disabled={!$djammsStore.isAuthenticated}
									class="w-full p-8 bg-gradient-to-br {card.gradient} rounded-2xl text-white text-left transform transition-all duration-300 {$djammsStore.isAuthenticated ? 'hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/20 cursor-pointer' : 'opacity-50 cursor-not-allowed'}"
								>
									<!-- Background Pattern -->
									<div class="absolute inset-0 opacity-10">
										<div class="absolute inset-0 bg-white" style="background-image: radial-gradient(circle, rgba(255,255,255,0.1) 2px, transparent 2px); background-size: 20px 20px;"></div>
									</div>
									
									<!-- Disabled Overlay -->
									{#if !$djammsStore.isAuthenticated}
										<div class="absolute inset-0 bg-black/30 flex items-center justify-center">
											<div class="flex flex-col items-center gap-2 text-center">
												<Users class="w-8 h-8 text-white/60" />
												<span class="text-white/80 text-sm font-medium">Authentication Required</span>
											</div>
										</div>
									{/if}
									
									<!-- Card Content -->
									<div class="relative z-10">
										<div class="flex items-center justify-between mb-4">
											<div class="p-3 bg-white/20 rounded-xl w-fit">
												<svelte:component this={card.icon} class="w-8 h-8" />
											</div>
											
											<!-- Tab/Window Status Indicator -->
											{#if card.id === 'videoplayer'}
												{#if openWindows.some(w => w.endpoint === card.path)}
													<div class="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
														<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
														<span class="text-green-400 text-xs font-medium">OPEN</span>
													</div>
												{/if}
											{:else}
												<div class="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
													<span class="text-blue-400 text-xs font-medium">TAB</span>
												</div>
											{/if}
										</div>
										
										<h3 class="text-xl font-bold mb-2">{card.title}</h3>
										<p class="text-white/80 text-sm leading-relaxed">{card.description}</p>
										
										<!-- Action hint -->
										<div class="mt-4 text-xs text-white/60">
											{#if $djammsStore.isAuthenticated}
												{#if card.id === 'videoplayer'}
													{#if openWindows.some(w => w.endpoint === card.path)}
														Click to focus existing window
													{:else}
														Click to open new window
													{/if}
												{:else}
													Click to open as tab
												{/if}
											{:else}
												Sign in to access this feature
											{/if}
										</div>
										
										<!-- Hover Arrow (only when enabled) -->
										{#if $djammsStore.isAuthenticated}
											<div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
												{#if card.id === 'videoplayer'}
													<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
													</svg>
												{:else}
													<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
													</svg>
												{/if}
											</div>
										{/if}
									</div>
								</button>
							</div>
						{/each}
					</div>

					<!-- Quick Actions -->
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-xl font-semibold text-white mb-4">Quick Actions</h3>
						<div class="grid md:grid-cols-3 gap-4">
							<button 
								on:click={() => openTab('playlistlibrary')}
								class="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left transition-colors">
								<h4 class="text-white font-medium mb-1">Create New Playlist</h4>
								<p class="text-gray-400 text-sm">Start building your music collection</p>
							</button>
							
							<button 
								on:click={() => openTab('playlistlibrary')}
								class="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left transition-colors">
								<h4 class="text-white font-medium mb-1">Import Playlist</h4>
								<p class="text-gray-400 text-sm">Import from YouTube or other sources</p>
							</button>
							
							<button 
								on:click={() => openTab('adminconsole')}
								class="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left transition-colors">
								<h4 class="text-white font-medium mb-1">Backup Settings</h4>
								<p class="text-gray-400 text-sm">Save your configuration</p>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer (only shown on dashboard) -->
			<footer class="p-4 border-t border-white/10 text-center">
				<p class="text-gray-500 text-sm">
					DJAMMS v2.0 • Integrated Tabbed Interface
				</p>
			</footer>
		{:else}
			<!-- Tab Content -->
			<div class="h-full">
				{#if activeTab === 'queuemanager'}
					<QueueManagerTab />
				{:else if activeTab === 'playlistlibrary'}
					<PlaylistLibraryTab />
				{:else if activeTab === 'adminconsole'}
					<AdminConsoleTab />
				{/if}
			</div>
		{/if}
	</div>
</main>