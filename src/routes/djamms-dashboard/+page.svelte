<script lang="ts">
	// DJAMMS Dashboard - Functional and Technical Specification Implementation
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { djammsStore, currentTrack, playerControls, queueInfo, venueStatus } from '$lib/stores/djamms';
	import { windowManager } from '$lib/services/windowManager';
	import { account } from '$lib/utils/appwrite';
	import { InstanceIds } from '$lib/utils/idGenerator';
	import { 
		Play,
		Pause,
		Monitor,
		Server,
		Globe,
		Wifi,
		WifiOff,
		Settings,
		Volume2,
		Video,
		Activity,
		Clock,
		Users,
		AlertTriangle,
		CheckCircle,
		XCircle,
		LogOut,
		Eye,
		EyeOff,
		Cpu,
		HardDrive,
		MemoryStick,
		Zap,
		Music,
		Headphones
	} from 'lucide-svelte';

	// Redirect to login if not authenticated
	$: if (browser && !$djammsStore.isLoading && !$djammsStore.isAuthenticated) {
		goto('/');
	}

	// Instance and connection management
	let instanceId = InstanceIds.dashboard();
	let playerInstanceStatus = 'checking'; // 'local', 'external', 'none'
	let isVideoPlayerOpen = false;

	// Activity Logs state
	let selectedLogFilter = 'all';
	let showActivityLogs = false;
	let activityLogs: LogEntry[] = [];
	let logContainer: HTMLElement;

	interface LogEntry {
		timestamp: string;
		level: 'info' | 'warning' | 'error';
		source: 'player' | 'queue-manager' | 'jukebox-kiosk' | 'admin-console' | 'system';
		message: string;
	}

	// System status reactive variables
	$: playerStatus = {
		status: $djammsStore.playerState.status,
		isConnected: $venueStatus.isConnected,
		currentTrack: $currentTrack?.title || 'None',
		position: $djammsStore.playerState.position,
		duration: $currentTrack?.duration || 0
	};

	$: serverStatus = {
		appwrite: 'connected', // TODO: Implement actual server health check
		database: 'connected',
		realtime: $djammsStore.connectionStatus === 'connected' ? 'connected' : 'disconnected',
		auth: $djammsStore.isAuthenticated ? 'authenticated' : 'unauthenticated'
	};

	$: instanceStatus = {
		id: instanceId.slice(-8),
		initialized: true,
		activeWindows: getActiveWindowsCount(),
		uptime: getUptime()
	};

	$: networkStatus = {
		connection: navigator.onLine ? 'online' : 'offline',
		latency: 'good', // TODO: Implement ping test
		bandwidth: 'sufficient' // TODO: Implement bandwidth test
	};

	// System resources (mock data for now)
	$: systemResources = {
		cpu: Math.floor(Math.random() * 30 + 10), // 10-40%
		memory: Math.floor(Math.random() * 20 + 30), // 30-50%
		storage: Math.floor(Math.random() * 10 + 60) // 60-70%
	};

	let startTime = Date.now();

	function getUptime(): string {
		const uptime = Date.now() - startTime;
		const minutes = Math.floor(uptime / 60000);
		const seconds = Math.floor((uptime % 60000) / 1000);
		return `${minutes}m ${seconds}s`;
	}

	function getActiveWindowsCount(): number {
		// TODO: Implement actual window counting
		return 1; // Dashboard is always active
	}

	// Initialize dashboard
	onMount(() => {
		if (browser && $djammsStore.isAuthenticated) {
			(async () => {
				try {
					console.log('🎵 DJAMMS Dashboard: Initializing dashboard...');
					addLog('info', 'system', 'DJAMMS Dashboard initialized successfully');
					console.log('🎵 DJAMMS Dashboard: Dashboard ready');

					// Check for existing video player instances
					checkVideoPlayerStatus();
				} catch (error) {
					console.error('🎵 DJAMMS Dashboard: Failed to initialize dashboard:', error);
					addLog('error', 'system', `Failed to initialize dashboard: ${error}`);
				}
			})();
		}

		// Set up periodic updates
		const statusInterval = setInterval(() => {
			checkVideoPlayerStatus();
			updateSystemStatus();
		}, 5000);

		return () => clearInterval(statusInterval);
	});

	// Cleanup on destroy
	onDestroy(() => {
		console.log('🎵 DJAMMS Dashboard: Disconnecting...');
		addLog('info', 'system', 'DJAMMS Dashboard disconnecting');
	});

	// Activity log management
	function addLog(level: 'info' | 'warning' | 'error', source: LogEntry['source'], message: string) {
		const newLog: LogEntry = {
			timestamp: new Date().toLocaleTimeString(),
			level,
			source,
			message
		};
		activityLogs = [newLog, ...activityLogs].slice(0, 100); // Keep last 100 logs
		
		// Auto-scroll to top when new logs arrive
		if (logContainer && showActivityLogs) {
			setTimeout(() => logContainer.scrollTop = 0, 10);
		}
	}

	// Filter logs based on selected filter
	$: filteredLogs = activityLogs.filter(log => {
		switch (selectedLogFilter) {
			case 'all': return true;
			case 'player-queue': return ['player', 'queue-manager'].includes(log.source);
			case 'jukebox-kiosk': return log.source === 'jukebox-kiosk';
			case 'admin-console': return log.source === 'admin-console';
			case 'errors': return log.level === 'error';
			default: return true;
		}
	});

	// Check video player status
	async function checkVideoPlayerStatus() {
		try {
			// TODO: Implement actual player instance detection
			// For now, we'll use a simple heuristic based on window tracking
			const hasLocalPlayer = windowManager.isWindowOpen('/videoplayer');
			
			if (hasLocalPlayer) {
				playerInstanceStatus = 'local';
				isVideoPlayerOpen = true;
				addLog('info', 'player', 'Local video player detected');
			} else {
				// TODO: Check Appwrite for external player instances
				playerInstanceStatus = 'none';
				isVideoPlayerOpen = false;
			}
		} catch (error) {
			console.error('Failed to check video player status:', error);
			addLog('error', 'system', `Failed to check video player status: ${error}`);
		}
	}

	// Update system status (mock implementation)
	function updateSystemStatus() {
		// Update system resources with slight variations
		systemResources = {
			cpu: Math.max(5, Math.min(95, systemResources.cpu + (Math.random() - 0.5) * 10)),
			memory: Math.max(20, Math.min(90, systemResources.memory + (Math.random() - 0.5) * 5)),
			storage: Math.max(50, Math.min(95, systemResources.storage + (Math.random() - 0.5) * 2))
		};
	}

	// Launcher button functions
	async function openVideoPlayer() {
		if (isVideoPlayerOpen) return;
		
		try {
			addLog('info', 'player', 'Opening video player...');
			const opened = await windowManager.openEndpoint('/videoplayer');
			if (opened) {
				isVideoPlayerOpen = true;
				playerInstanceStatus = 'local';
				addLog('info', 'player', 'Video player opened successfully');
			} else {
				addLog('warning', 'player', 'Video player window already exists - focusing existing');
			}
		} catch (error) {
			console.error('Failed to open video player:', error);
			addLog('error', 'player', `Failed to open video player: ${error}`);
		}
	}

	async function openAdminConsole() {
		try {
			addLog('info', 'admin-console', 'Opening admin console...');
			const opened = await windowManager.openEndpoint('/adminconsole');
			if (opened) {
				addLog('info', 'admin-console', 'Admin console opened successfully');
			} else {
				addLog('warning', 'admin-console', 'Admin console already open - focusing existing');
			}
		} catch (error) {
			console.error('Failed to open admin console:', error);
			addLog('error', 'admin-console', `Failed to open admin console: ${error}`);
		}
	}

	async function openJukeboxKiosk() {
		try {
			addLog('info', 'jukebox-kiosk', 'Opening jukebox kiosk...');
			// TODO: Create jukebox-kiosk route
			const opened = await windowManager.openEndpoint('/jukebox-kiosk');
			if (opened) {
				addLog('info', 'jukebox-kiosk', 'Jukebox kiosk opened successfully');
			} else {
				addLog('warning', 'jukebox-kiosk', 'Jukebox kiosk already open - focusing existing');
			}
		} catch (error) {
			console.error('Failed to open jukebox kiosk:', error);
			addLog('error', 'jukebox-kiosk', `Failed to open jukebox kiosk: ${error}`);
		}
	}

	// Logout function
	async function logout() {
		try {
			addLog('info', 'system', 'User logging out...');
			await account.deleteSession('current');
			djammsStore.setUser(null);
			goto('/');
		} catch (error) {
			console.error('Logout failed:', error);
			addLog('error', 'system', `Logout failed: ${error}`);
		}
	}

	// Helper functions for status display
	function getStatusColor(status: string): string {
		switch (status) {
			case 'connected':
			case 'authenticated':
			case 'online':
			case 'good':
			case 'sufficient':
				return 'text-green-400 bg-green-400/10 border-green-400/20';
			case 'disconnected':
			case 'unauthenticated':
			case 'offline':
			case 'poor':
			case 'limited':
				return 'text-red-400 bg-red-400/10 border-red-400/20';
			case 'warning':
			case 'fair':
				return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
			default:
				return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
		}
	}

	function getLogLevelColor(level: string): string {
		switch (level) {
			case 'error':
				return 'text-red-400';
			case 'warning':
				return 'text-yellow-400';
			case 'info':
			default:
				return 'text-green-400';
		}
	}

	function getResourceColor(percentage: number): string {
		if (percentage > 80) return 'text-red-400';
		if (percentage > 60) return 'text-yellow-400';
		return 'text-green-400';
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
	<!-- Header -->
	<header class="bg-black/20 backdrop-blur-sm border-b border-white/10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
						<span class="text-white font-bold text-sm">DJ</span>
					</div>
					<div>
						<h1 class="text-xl font-bold text-white">DJAMMS Control Center</h1>
						<p class="text-sm text-gray-400">Digital Jukebox and Media Management System</p>
					</div>
				</div>
				
				<div class="flex items-center space-x-4">
					<!-- Instance ID -->
					<div class="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
						<span class="text-sm text-purple-300">Instance: {instanceStatus.id}</span>
					</div>
					
					<!-- User Menu -->
					{#if $djammsStore.isAuthenticated}
						<div class="flex items-center space-x-3">
							<span class="text-sm text-gray-300">
								Welcome, {$djammsStore.currentUser?.username || $djammsStore.currentUser?.email}
							</span>
							<button 
								on:click={logout}
								class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
								title="Logout"
							>
								<LogOut class="w-5 h-5" />
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<div class="max-w-7xl mx-auto p-6">
		<!-- SYSTEM STATUS FRAME (Top Half) -->
		<div class="h-[50vh] mb-6">
			<div class="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 h-full">
				<div class="p-6 border-b border-white/10">
					<h2 class="text-2xl font-bold text-white">System Status</h2>
					<p class="text-gray-400 mt-1">Real-time monitoring of all DJAMMS components</p>
				</div>

				<div class="p-6 h-[calc(100%-80px)] overflow-y-auto">
					<!-- Status Widgets Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<!-- Player Status -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">PLAYER STATUS</h3>
								<Monitor class="w-4 h-4 text-blue-400" />
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Status:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(playerStatus.status)}">
										{playerStatus.status.toUpperCase()}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Connection:</span>
									<div class="flex items-center space-x-1">
										{#if playerStatus.isConnected}
											<Wifi class="w-3 h-3 text-green-400" />
										{:else}
											<WifiOff class="w-3 h-3 text-red-400" />
										{/if}
										<span class="text-xs text-white">
											{playerStatus.isConnected ? 'Connected' : 'Disconnected'}
										</span>
									</div>
								</div>
								{#if playerStatus.currentTrack !== 'None'}
									<div class="mt-2 pt-2 border-t border-slate-600/50">
										<p class="text-xs text-gray-300 truncate">{playerStatus.currentTrack}</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Server Status -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">SERVER STATUS</h3>
								<Server class="w-4 h-4 text-green-400" />
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Appwrite:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(serverStatus.appwrite)}">
										{serverStatus.appwrite.toUpperCase()}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Database:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(serverStatus.database)}">
										{serverStatus.database.toUpperCase()}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Realtime:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(serverStatus.realtime)}">
										{serverStatus.realtime.toUpperCase()}
									</span>
								</div>
							</div>
						</div>

						<!-- Instance Status -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">INSTANCE STATUS</h3>
								<Activity class="w-4 h-4 text-purple-400" />
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Instance ID:</span>
									<span class="text-xs text-white font-mono">{instanceStatus.id}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Initialized:</span>
									<div class="flex items-center space-x-1">
										{#if instanceStatus.initialized}
											<CheckCircle class="w-3 h-3 text-green-400" />
										{:else}
											<XCircle class="w-3 h-3 text-red-400" />
										{/if}
										<span class="text-xs text-white">
											{instanceStatus.initialized ? 'Yes' : 'No'}
										</span>
									</div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Uptime:</span>
									<span class="text-xs text-white">{instanceStatus.uptime}</span>
								</div>
							</div>
						</div>

						<!-- Network Status -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">NETWORK STATUS</h3>
								<Globe class="w-4 h-4 text-blue-400" />
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Connection:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(networkStatus.connection)}">
										{networkStatus.connection.toUpperCase()}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Latency:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(networkStatus.latency)}">
										{networkStatus.latency.toUpperCase()}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Bandwidth:</span>
									<span class="text-xs px-2 py-1 rounded {getStatusColor(networkStatus.bandwidth)}">
										{networkStatus.bandwidth.toUpperCase()}
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- System Resources & Audio/Video Output -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
						<!-- System Resources -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">SYSTEM RESOURCES</h3>
								<Cpu class="w-4 h-4 text-orange-400" />
							</div>
							<div class="space-y-3">
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-gray-400">CPU Usage:</span>
										<span class="text-xs font-mono {getResourceColor(systemResources.cpu)}">{systemResources.cpu}%</span>
									</div>
									<div class="w-full bg-gray-700 rounded-full h-2">
										<div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" 
											 style="width: {systemResources.cpu}%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-gray-400">Memory Usage:</span>
										<span class="text-xs font-mono {getResourceColor(systemResources.memory)}">{systemResources.memory}%</span>
									</div>
									<div class="w-full bg-gray-700 rounded-full h-2">
										<div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" 
											 style="width: {systemResources.memory}%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-gray-400">Storage Usage:</span>
										<span class="text-xs font-mono {getResourceColor(systemResources.storage)}">{systemResources.storage}%</span>
									</div>
									<div class="w-full bg-gray-700 rounded-full h-2">
										<div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" 
											 style="width: {systemResources.storage}%"></div>
									</div>
								</div>
							</div>
						</div>

						<!-- Audio/Video Output -->
						<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-white">AUDIO/VIDEO OUTPUT</h3>
								<div class="flex space-x-1">
									<Volume2 class="w-4 h-4 text-green-400" />
									<Video class="w-4 h-4 text-blue-400" />
								</div>
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Audio Device:</span>
									<span class="text-xs text-white">Default Output</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Video Output:</span>
									<span class="text-xs text-white">Primary Display</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Volume Level:</span>
									<span class="text-xs text-white">85%</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-gray-400">Quality:</span>
									<span class="text-xs px-2 py-1 rounded text-green-400 bg-green-400/10 border-green-400/20">
										HD
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Activity Logs Section -->
					<div class="bg-slate-800/50 rounded-lg border border-slate-700/50">
						<div class="flex items-center justify-between p-4 border-b border-slate-700/50">
							<h3 class="text-sm font-semibold text-white">ACTIVITY LOGS</h3>
							<div class="flex items-center space-x-3">
								<select 
									bind:value={selectedLogFilter}
									class="text-xs bg-slate-700 text-white rounded px-2 py-1 border border-slate-600"
								>
									<option value="all">All Activity</option>
									<option value="player-queue">Player & Queue-Manager</option>
									<option value="jukebox-kiosk">Jukebox-Kiosk</option>
									<option value="admin-console">Admin-Console</option>
									<option value="errors">Errors and Faults</option>
								</select>
								<button 
									on:click={() => showActivityLogs = !showActivityLogs}
									class="p-1 text-gray-400 hover:text-white transition-colors"
									title="{showActivityLogs ? 'Hide' : 'Show'} Activity Logs"
								>
									{#if showActivityLogs}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							</div>
						</div>
						
						{#if showActivityLogs}
							<div 
								bind:this={logContainer}
								class="p-4 h-48 overflow-y-auto bg-black/30 font-mono text-xs"
							>
								{#if filteredLogs.length === 0}
									<div class="text-gray-500 text-center py-8">
										No activity logs to display
									</div>
								{:else}
									{#each filteredLogs as log}
										<div class="mb-1 flex items-start space-x-2">
											<span class="text-gray-500 shrink-0">[{log.timestamp}]</span>
											<span class="shrink-0 {getLogLevelColor(log.level)} uppercase">
												{log.level}
											</span>
											<span class="text-blue-300 shrink-0">
												[{log.source}]
											</span>
											<span class="text-gray-300">{log.message}</span>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- LAUNCHER FRAME (Bottom Half) -->
		<div class="h-[40vh]">
			<div class="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 h-full">
				<div class="p-6 border-b border-white/10">
					<h2 class="text-2xl font-bold text-white">Application Launcher</h2>
					<p class="text-gray-400 mt-1">Open DJAMMS components and manage system endpoints</p>
				</div>

				<div class="p-6 h-[calc(100%-80px)] flex items-center">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
						<!-- Open Video Player Button -->
						<div class="group relative">
							<button 
								on:click={openVideoPlayer}
								disabled={isVideoPlayerOpen}
								class="w-full h-32 bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-sm rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600/20 disabled:border-gray-500/20"
							>
								<div class="p-6 h-full flex flex-col items-center justify-center">
									{#if isVideoPlayerOpen}
										<CheckCircle class="w-12 h-12 text-gray-400 mb-3" />
									{:else}
										<Play class="w-12 h-12 text-blue-400 mb-3 group-hover:text-blue-300 transition-colors" />
									{/if}
									
									<h3 class="text-lg font-semibold text-white mb-2">
										{isVideoPlayerOpen ? 'Video Player is Running' : 'Open Video Player'}
									</h3>
									
									<div class="text-sm text-center">
										{#if playerInstanceStatus === 'local'}
											<span class="text-green-400">Local Player</span>
										{:else if playerInstanceStatus === 'external'}
											<span class="text-yellow-400">External Player</span>
										{:else}
											<span class="text-gray-400">No Active Player</span>
										{/if}
									</div>
								</div>
							</button>
						</div>

						<!-- Open Admin Dashboard Button -->
						<div class="group">
							<button 
								on:click={openAdminConsole}
								class="w-full h-32 bg-gradient-to-br from-purple-600/20 to-purple-700/20 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300"
							>
								<div class="p-6 h-full flex flex-col items-center justify-center">
									<Settings class="w-12 h-12 text-purple-400 mb-3 group-hover:text-purple-300 transition-colors" />
									<h3 class="text-lg font-semibold text-white mb-2">Open Admin Dashboard</h3>
									<span class="text-sm text-gray-400">System configuration and control</span>
								</div>
							</button>
						</div>

						<!-- Open Jukebox Kiosk Button -->
						<div class="group">
							<button 
								on:click={openJukeboxKiosk}
								class="w-full h-32 bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-sm rounded-xl border border-green-500/20 hover:border-green-400/40 transition-all duration-300"
							>
								<div class="p-6 h-full flex flex-col items-center justify-center">
									<Music class="w-12 h-12 text-green-400 mb-3 group-hover:text-green-300 transition-colors" />
									<h3 class="text-lg font-semibold text-white mb-2">Open Jukebox-Kiosk</h3>
									<span class="text-sm text-gray-400">Public music request interface</span>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>