<!-- Admin Console Tab Component - Embedded version of /adminconsole -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore, playerStatus } from '$lib/stores/djamms';
	import { 
		Settings,
		User,
		Monitor,
		Sliders,
		Palette,
		Shield,
		Globe,
		Volume2,
		Keyboard,
		Bell,
		Database,
		Wifi,
		WifiOff,
		Circle,
		AlertTriangle,
		Save,
		RotateCcw,
		Download,
		Upload,
		Copy,
		Check,
		X,
		Eye,
		EyeOff,
		Lock,
		Unlock,
		RefreshCw,
		Trash2,
		Plus
	} from 'lucide-svelte';

	import { browser } from '$app/environment';

	// Active tab
	let activeTab = 'player';

	// Player Preferences
	let playerSettings = {
		autoPlay: true,
		shuffle: false,
		repeat: 'none', // 'none', 'one', 'all'
		volume: 75,
		crossfade: 3,
		quality: 'high', // 'low', 'medium', 'high', 'highest'
		buffer: 10,
		skipIntro: true,
		skipOutro: false
	};

	// UI Preferences
	let uiSettings = {
		theme: 'dark', // 'dark', 'light', 'auto'
		accentColor: 'purple', // 'purple', 'pink', 'blue', 'green', 'red'
		compactMode: false,
		showThumbnails: true,
		animationsEnabled: true,
		transparencyEffects: true,
		fontScale: 100 // 75, 100, 125, 150
	};

	// Privacy & Security
	let privacySettings = {
		shareActivity: false,
		allowRemoteControl: true,
		saveHistory: true,
		publicProfile: false,
		analytics: true,
		crashReports: true
	};

	// System Settings
	let systemSettings = {
		maxCacheSize: 1000, // MB
		backgroundSync: true,
		offlineMode: false,
		powerSaver: false,
		notifications: true,
		updateChannel: 'stable' // 'stable', 'beta', 'dev'
	};

	// Performance monitoring
	let performanceData = {
		memoryUsage: 0,
		cacheSize: 0,
		networkUsage: 0,
		uptime: 0,
		errors: 0
	};

	// Backup/Export data
	let exportData = {
		includeSettings: true,
		includePlaylists: true,
		includeHistory: false,
		includeCache: false
	};

	let isExporting = false;
	let isImporting = false;
	let importFile: File | null = null;

	// Handle file input change
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		importFile = target?.files?.[0] || null;
	}

	// Toast notifications
	let toastMessage = '';
	let toastType = 'info'; // 'info', 'success', 'error'
	let showToast = false;

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
			case 'no-connected-player':
				return { icon: WifiOff, text: 'NO CONNECTED PLAYER', class: 'status-disconnected' };
			default:
				return { icon: WifiOff, text: 'NO CONNECTED PLAYER', class: 'status-disconnected' };
		}
	}

	function showToastMessage(message: string, type: 'info' | 'success' | 'error' = 'info') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	async function saveSettings() {
		try {
			// Simulate saving settings
			console.log('🔧 Saving admin console settings...');
			
			// Here you would integrate with your settings service
			// await settingsService.saveSettings({
			//   player: playerSettings,
			//   ui: uiSettings,
			//   privacy: privacySettings,
			//   system: systemSettings
			// });
			
			showToastMessage('Settings saved successfully', 'success');
		} catch (error) {
			console.error('🔧 Error saving settings:', error);
			showToastMessage('Failed to save settings', 'error');
		}
	}

	function resetSettings() {
		if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
			// Reset to defaults
			playerSettings = {
				autoPlay: true,
				shuffle: false,
				repeat: 'none',
				volume: 75,
				crossfade: 3,
				quality: 'high',
				buffer: 10,
				skipIntro: true,
				skipOutro: false
			};

			uiSettings = {
				theme: 'dark',
				accentColor: 'purple',
				compactMode: false,
				showThumbnails: true,
				animationsEnabled: true,
				transparencyEffects: true,
				fontScale: 100
			};

			privacySettings = {
				shareActivity: false,
				allowRemoteControl: true,
				saveHistory: true,
				publicProfile: false,
				analytics: true,
				crashReports: true
			};

			systemSettings = {
				maxCacheSize: 1000,
				backgroundSync: true,
				offlineMode: false,
				powerSaver: false,
				notifications: true,
				updateChannel: 'stable'
			};

			showToastMessage('Settings reset to defaults', 'info');
		}
	}

	async function exportSettings() {
		isExporting = true;
		try {
			const settingsData = {
				version: '2.0',
				timestamp: new Date().toISOString(),
				settings: exportData.includeSettings ? {
					player: playerSettings,
					ui: uiSettings,
					privacy: privacySettings,
					system: systemSettings
				} : null,
				playlists: exportData.includePlaylists ? [] : null, // Would fetch actual playlists
				history: exportData.includeHistory ? [] : null,
				cache: exportData.includeCache ? performanceData : null
			};

			const blob = new Blob([JSON.stringify(settingsData, null, 2)], { 
				type: 'application/json' 
			});
			
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `djamms-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showToastMessage('Settings exported successfully', 'success');
		} catch (error) {
			console.error('🔧 Export failed:', error);
			showToastMessage('Export failed', 'error');
		} finally {
			isExporting = false;
		}
	}

	async function importSettings() {
		if (!importFile) return;
		
		isImporting = true;
		try {
			const text = await importFile.text();
			const data = JSON.parse(text);
			
			if (data.settings) {
				if (data.settings.player) playerSettings = { ...playerSettings, ...data.settings.player };
				if (data.settings.ui) uiSettings = { ...uiSettings, ...data.settings.ui };
				if (data.settings.privacy) privacySettings = { ...privacySettings, ...data.settings.privacy };
				if (data.settings.system) systemSettings = { ...systemSettings, ...data.settings.system };
			}
			
			showToastMessage('Settings imported successfully', 'success');
			importFile = null;
		} catch (error) {
			console.error('🔧 Import failed:', error);
			showToastMessage('Import failed - invalid file format', 'error');
		} finally {
			isImporting = false;
		}
	}

	function clearCache() {
		if (confirm('Clear all cached data? This may slow down the next startup.')) {
			console.log('🔧 Clearing cache...');
			showToastMessage('Cache cleared successfully', 'success');
			performanceData.cacheSize = 0;
		}
	}

	// Tabs configuration
	const adminTabs = [
		{
			id: 'player',
			title: 'Player',
			icon: Play,
			description: 'Playback and audio settings'
		},
		{
			id: 'ui',
			title: 'Interface',
			icon: Palette,
			description: 'Theme and appearance settings'
		},
		{
			id: 'privacy',
			title: 'Privacy',
			icon: Shield,
			description: 'Privacy and security settings'
		},
		{
			id: 'system',
			title: 'System',
			icon: Monitor,
			description: 'Performance and system settings'
		},
		{
			id: 'backup',
			title: 'Backup',
			icon: Database,
			description: 'Export and import settings'
		}
	];

	onMount(() => {
		console.log('🔧 Admin Console Tab: Component mounted');
		
		// Simulate loading performance data
		performanceData = {
			memoryUsage: Math.floor(Math.random() * 500) + 200,
			cacheSize: Math.floor(Math.random() * 200) + 50,
			networkUsage: Math.floor(Math.random() * 10) + 2,
			uptime: Math.floor(Date.now() / 1000 - Math.random() * 86400),
			errors: Math.floor(Math.random() * 3)
		};
	});

	onDestroy(() => {
		console.log('🔧 Admin Console Tab: Component destroyed');
	});

	// Import Play icon for admin tabs
	import { Play } from 'lucide-svelte';
</script>

<div class="h-full flex flex-col bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<!-- Admin Console Header -->
	<div class="p-6 glass-morphism border-b border-white/10">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
					<Settings class="w-6 h-6 text-white" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">Admin Console</h1>
					<p class="text-gray-400">Configure player settings and preferences</p>
				</div>
			</div>

			<!-- Player Status -->
			{#if $playerStatus.isConnected}
				{@const statusDisplay = getStatusDisplay($playerStatus)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="text-sm">{statusDisplay.text}</span>
				</div>
			{/if}
		</div>

		<!-- Tab Navigation -->
		<div class="flex items-center gap-2 overflow-x-auto pb-2">
			{#each adminTabs as tab}
				<button
					on:click={() => activeTab = tab.id}
					class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap {activeTab === tab.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-black/20 text-gray-400 hover:text-white hover:bg-black/30 border border-transparent'}"
				>
					<svelte:component this={tab.icon} class="w-4 h-4" />
					<div class="text-left">
						<div class="font-medium">{tab.title}</div>
						<div class="text-xs opacity-70">{tab.description}</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Tab Content -->
	<div class="flex-1 overflow-auto">
		<div class="p-6">
			{#if activeTab === 'player'}
				<!-- Player Settings -->
				<div class="max-w-4xl space-y-6">
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Playback Settings</h3>
						<div class="grid md:grid-cols-2 gap-6">
							<!-- Auto Play -->
							<div class="flex items-center justify-between">
								<div>
									<label for="auto-play" class="text-white font-medium">Auto Play</label>
									<p class="text-sm text-gray-400">Automatically start playing when tracks are added</p>
								</div>
								<input id="auto-play" type="checkbox" bind:checked={playerSettings.autoPlay} class="toggle" />
							</div>

							<!-- Shuffle -->
							<div class="flex items-center justify-between">
								<div>
									<label for="shuffle-default" class="text-white font-medium">Shuffle by Default</label>
									<p class="text-sm text-gray-400">Enable shuffle when starting playback</p>
								</div>
								<input id="shuffle-default" type="checkbox" bind:checked={playerSettings.shuffle} class="toggle" />
							</div>

							<!-- Repeat Mode -->
							<div>
								<label for="repeat-mode" class="block text-white font-medium mb-2">Default Repeat Mode</label>
								<select id="repeat-mode" bind:value={playerSettings.repeat} class="setting-select">
									<option value="none">No Repeat</option>
									<option value="one">Repeat One</option>
									<option value="all">Repeat All</option>
								</select>
							</div>

							<!-- Volume -->
							<div>
								<label for="default-volume" class="block text-white font-medium mb-2">Default Volume</label>
								<div class="flex items-center gap-3">
									<input id="default-volume" type="range" min="0" max="100" bind:value={playerSettings.volume} class="flex-1" />
									<span class="text-sm text-gray-400 w-12">{playerSettings.volume}%</span>
								</div>
							</div>

							<!-- Crossfade -->
							<div>
								<label for="crossfade-duration" class="block text-white font-medium mb-2">Crossfade Duration</label>
								<div class="flex items-center gap-3">
									<input id="crossfade-duration" type="range" min="0" max="10" bind:value={playerSettings.crossfade} class="flex-1" />
									<span class="text-sm text-gray-400 w-12">{playerSettings.crossfade}s</span>
								</div>
							</div>

							<!-- Quality -->
							<div>
								<label for="audio-quality" class="block text-white font-medium mb-2">Audio Quality</label>
								<select id="audio-quality" bind:value={playerSettings.quality} class="setting-select">
									<option value="low">Low (144p)</option>
									<option value="medium">Medium (360p)</option>
									<option value="high">High (720p)</option>
									<option value="highest">Highest Available</option>
								</select>
							</div>
						</div>
					</div>

					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
						<div class="grid md:grid-cols-2 gap-6">
							<!-- Buffer Size -->
							<div>
								<label for="buffer-size" class="block text-white font-medium mb-2">Buffer Size</label>
								<div class="flex items-center gap-3">
									<input id="buffer-size" type="range" min="5" max="30" bind:value={playerSettings.buffer} class="flex-1" />
									<span class="text-sm text-gray-400 w-12">{playerSettings.buffer}s</span>
								</div>
							</div>

							<!-- Skip Intro -->
							<div class="flex items-center justify-between">
								<div>
									<label for="skip-intros" class="text-white font-medium">Skip Intros</label>
									<p class="text-sm text-gray-400">Automatically skip video intros when detected</p>
								</div>
								<input id="skip-intros" type="checkbox" bind:checked={playerSettings.skipIntro} class="toggle" />
							</div>

							<!-- Skip Outro -->
							<div class="flex items-center justify-between">
								<div>
									<label for="skip-outros" class="text-white font-medium">Skip Outros</label>
									<p class="text-sm text-gray-400">Automatically skip video outros when detected</p>
								</div>
								<input id="skip-outros" type="checkbox" bind:checked={playerSettings.skipOutro} class="toggle" />
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'ui'}
				<!-- UI Settings -->
				<div class="max-w-4xl space-y-6">
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Appearance</h3>
						<div class="grid md:grid-cols-2 gap-6">
							<!-- Theme -->
							<div>
								<label for="ui-theme" class="block text-white font-medium mb-2">Theme</label>
								<select id="ui-theme" bind:value={uiSettings.theme} class="setting-select">
									<option value="dark">Dark</option>
									<option value="light">Light</option>
									<option value="auto">Auto (System)</option>
								</select>
							</div>

							<!-- Accent Color -->
							<div>
								<label for="accent-color" class="block text-white font-medium mb-2">Accent Color</label>
								<div id="accent-color" class="flex items-center gap-2">
									{#each ['purple', 'pink', 'blue', 'green', 'red'] as color}
										<button
											on:click={() => uiSettings.accentColor = color}
											class="w-8 h-8 rounded-full border-2 {uiSettings.accentColor === color ? 'border-white' : 'border-transparent'}"
											class:bg-purple-500={color === 'purple'}
											class:bg-pink-500={color === 'pink'}
											class:bg-blue-500={color === 'blue'}
											class:bg-green-500={color === 'green'}
											class:bg-red-500={color === 'red'}
										></button>
									{/each}
								</div>
							</div>

							<!-- Font Scale -->
							<div>
								<label for="font-size" class="block text-white font-medium mb-2">Font Size</label>
								<select id="font-size" bind:value={uiSettings.fontScale} class="setting-select">
									<option value={75}>Small (75%)</option>
									<option value={100}>Normal (100%)</option>
									<option value={125}>Large (125%)</option>
									<option value={150}>Extra Large (150%)</option>
								</select>
							</div>

							<!-- Compact Mode -->
							<div class="flex items-center justify-between">
								<div>
									<label for="compact-mode" class="text-white font-medium">Compact Mode</label>
									<p class="text-sm text-gray-400">Use smaller UI elements to fit more content</p>
								</div>
								<input id="compact-mode" type="checkbox" bind:checked={uiSettings.compactMode} class="toggle" />
							</div>
						</div>
					</div>

					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Visual Effects</h3>
						<div class="grid md:grid-cols-2 gap-6">
							<!-- Show Thumbnails -->
							<div class="flex items-center justify-between">
								<div>
									<label for="show-thumbnails" class="text-white font-medium">Show Thumbnails</label>
									<p class="text-sm text-gray-400">Display video thumbnails in playlists</p>
								</div>
								<input id="show-thumbnails" type="checkbox" bind:checked={uiSettings.showThumbnails} class="toggle" />
							</div>

							<!-- Animations -->
							<div class="flex items-center justify-between">
								<div>
									<label for="enable-animations" class="text-white font-medium">Enable Animations</label>
									<p class="text-sm text-gray-400">Use smooth transitions and animations</p>
								</div>
								<input id="enable-animations" type="checkbox" bind:checked={uiSettings.animationsEnabled} class="toggle" />
							</div>

							<!-- Transparency Effects -->
							<div class="flex items-center justify-between">
								<div>
									<label for="glass-effects" class="text-white font-medium">Glass Effects</label>
									<p class="text-sm text-gray-400">Enable glass morphism and transparency</p>
								</div>
								<input id="glass-effects" type="checkbox" bind:checked={uiSettings.transparencyEffects} class="toggle" />
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'privacy'}
				<!-- Privacy Settings -->
				<div class="max-w-4xl space-y-6">
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Privacy & Sharing</h3>
						<div class="space-y-6">
							<!-- Share Activity -->
							<div class="flex items-center justify-between">
								<div>
									<label for="share-activity" class="text-white font-medium">Share Activity Status</label>
									<p class="text-sm text-gray-400">Let other users see what you're currently playing</p>
								</div>
								<input id="share-activity" type="checkbox" bind:checked={privacySettings.shareActivity} class="toggle" />
							</div>

							<!-- Remote Control -->
							<div class="flex items-center justify-between">
								<div>
									<label for="allow-remote-control" class="text-white font-medium">Allow Remote Control</label>
									<p class="text-sm text-gray-400">Allow other devices to control this player</p>
								</div>
								<input id="allow-remote-control" type="checkbox" bind:checked={privacySettings.allowRemoteControl} class="toggle" />
							</div>

							<!-- Save History -->
							<div class="flex items-center justify-between">
								<div>
									<label for="save-history" class="text-white font-medium">Save Listening History</label>
									<p class="text-sm text-gray-400">Keep a record of played tracks for recommendations</p>
								</div>
								<input id="save-history" type="checkbox" bind:checked={privacySettings.saveHistory} class="toggle" />
							</div>

							<!-- Public Profile -->
							<div class="flex items-center justify-between">
								<div>
									<label for="public-profile" class="text-white font-medium">Public Profile</label>
									<p class="text-sm text-gray-400">Make your profile and playlists discoverable</p>
								</div>
								<input id="public-profile" type="checkbox" bind:checked={privacySettings.publicProfile} class="toggle" />
							</div>
						</div>
					</div>

					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Data & Analytics</h3>
						<div class="space-y-6">
							<!-- Analytics -->
							<div class="flex items-center justify-between">
								<div>
									<label for="usage-analytics" class="text-white font-medium">Usage Analytics</label>
									<p class="text-sm text-gray-400">Help improve DJAMMS by sharing anonymous usage data</p>
								</div>
								<input id="usage-analytics" type="checkbox" bind:checked={privacySettings.analytics} class="toggle" />
							</div>

							<!-- Crash Reports -->
							<div class="flex items-center justify-between">
								<div>
									<label for="crash-reports" class="text-white font-medium">Crash Reports</label>
									<p class="text-sm text-gray-400">Automatically send crash reports to help fix bugs</p>
								</div>
								<input id="crash-reports" type="checkbox" bind:checked={privacySettings.crashReports} class="toggle" />
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'system'}
				<!-- System Settings -->
				<div class="max-w-4xl space-y-6">
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Performance</h3>
						<div class="grid md:grid-cols-2 gap-6">
							<!-- Cache Size -->
							<div>
								<label for="max-cache-size" class="block text-white font-medium mb-2">Max Cache Size (MB)</label>
								<div class="flex items-center gap-3">
									<input id="max-cache-size" type="range" min="100" max="5000" step="100" bind:value={systemSettings.maxCacheSize} class="flex-1" />
									<span class="text-sm text-gray-400 w-16">{systemSettings.maxCacheSize}MB</span>
								</div>
							</div>

							<!-- Background Sync -->
							<div class="flex items-center justify-between">
								<div>
									<label for="background-sync" class="text-white font-medium">Background Sync</label>
									<p class="text-sm text-gray-400">Keep playlists synchronized when app is idle</p>
								</div>
								<input id="background-sync" type="checkbox" bind:checked={systemSettings.backgroundSync} class="toggle" />
							</div>

							<!-- Offline Mode -->
							<div class="flex items-center justify-between">
								<div>
									<label for="offline-mode" class="text-white font-medium">Offline Mode</label>
									<p class="text-sm text-gray-400">Cache tracks for offline playback</p>
								</div>
								<input id="offline-mode" type="checkbox" bind:checked={systemSettings.offlineMode} class="toggle" />
							</div>

							<!-- Power Saver -->
							<div class="flex items-center justify-between">
								<div>
									<label for="power-saver" class="text-white font-medium">Power Saver Mode</label>
									<p class="text-sm text-gray-400">Reduce CPU usage and battery drain</p>
								</div>
								<input id="power-saver" type="checkbox" bind:checked={systemSettings.powerSaver} class="toggle" />
							</div>

							<!-- Notifications -->
							<div class="flex items-center justify-between">
								<div>
									<label for="system-notifications" class="text-white font-medium">System Notifications</label>
									<p class="text-sm text-gray-400">Show desktop notifications for track changes</p>
								</div>
								<input id="system-notifications" type="checkbox" bind:checked={systemSettings.notifications} class="toggle" />
							</div>

							<!-- Update Channel -->
							<div>
								<label for="update-channel" class="block text-white font-medium mb-2">Update Channel</label>
								<select id="update-channel" bind:value={systemSettings.updateChannel} class="setting-select">
									<option value="stable">Stable (Recommended)</option>
									<option value="beta">Beta (Early Access)</option>
									<option value="dev">Development (Latest)</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Performance Monitor -->
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">System Monitor</h3>
						<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div class="bg-black/20 rounded-lg p-4">
								<div class="flex items-center gap-2 mb-2">
									<Monitor class="w-4 h-4 text-blue-400" />
									<span class="text-sm text-gray-400">Memory Usage</span>
								</div>
								<span class="text-xl font-bold text-white">{performanceData.memoryUsage}MB</span>
							</div>
							
							<div class="bg-black/20 rounded-lg p-4">
								<div class="flex items-center gap-2 mb-2">
									<Database class="w-4 h-4 text-green-400" />
									<span class="text-sm text-gray-400">Cache Size</span>
								</div>
								<span class="text-xl font-bold text-white">{performanceData.cacheSize}MB</span>
								<button 
									on:click={clearCache}
									class="text-xs text-red-400 hover:text-red-300 mt-1 block"
								>
									Clear Cache
								</button>
							</div>
							
							<div class="bg-black/20 rounded-lg p-4">
								<div class="flex items-center gap-2 mb-2">
									<Globe class="w-4 h-4 text-purple-400" />
									<span class="text-sm text-gray-400">Network</span>
								</div>
								<span class="text-xl font-bold text-white">{performanceData.networkUsage}MB/s</span>
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'backup'}
				<!-- Backup & Export -->
				<div class="max-w-4xl space-y-6">
					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Export Settings</h3>
						<div class="space-y-4 mb-6">
							<div class="flex items-center gap-3">
								<input id="export-settings" type="checkbox" bind:checked={exportData.includeSettings} class="checkbox" />
								<label for="export-settings" class="text-white">Include Settings</label>
							</div>
							<div class="flex items-center gap-3">
								<input id="export-playlists" type="checkbox" bind:checked={exportData.includePlaylists} class="checkbox" />
								<label for="export-playlists" class="text-white">Include Playlists</label>
							</div>
							<div class="flex items-center gap-3">
								<input id="export-history" type="checkbox" bind:checked={exportData.includeHistory} class="checkbox" />
								<label for="export-history" class="text-white">Include Listening History</label>
							</div>
							<div class="flex items-center gap-3">
								<input id="export-cache" type="checkbox" bind:checked={exportData.includeCache} class="checkbox" />
								<label for="export-cache" class="text-white">Include Performance Data</label>
							</div>
						</div>
						
						<button 
							on:click={exportSettings}
							disabled={isExporting}
							class="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
						>
							{#if isExporting}
								<RefreshCw class="w-4 h-4 animate-spin" />
								Exporting...
							{:else}
								<Download class="w-4 h-4" />
								Export Backup
							{/if}
						</button>
					</div>

					<div class="glass-morphism rounded-2xl p-6">
						<h3 class="text-lg font-semibold text-white mb-4">Import Settings</h3>
						<div class="space-y-4">
							<div class="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
								<input 
									type="file" 
									accept=".json"
									on:change={handleFileChange}
									class="hidden"
									id="import-file"
								/>
								<label for="import-file" class="cursor-pointer">
									<Upload class="w-8 h-8 text-gray-400 mx-auto mb-2" />
									<p class="text-gray-400">Click to select backup file</p>
									{#if importFile}
										<p class="text-white mt-2">{importFile.name}</p>
									{/if}
								</label>
							</div>
							
							{#if importFile}
								<button 
									on:click={importSettings}
									disabled={isImporting}
									class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
								>
									{#if isImporting}
										<RefreshCw class="w-4 h-4 animate-spin" />
										Importing...
									{:else}
										<Upload class="w-4 h-4" />
										Import Settings
									{/if}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Action Buttons (fixed at bottom) -->
	<div class="p-6 border-t border-white/10 glass-morphism">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<button 
					on:click={saveSettings}
					class="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white transition-colors"
				>
					<Save class="w-4 h-4" />
					Save Changes
				</button>
				
				<button 
					on:click={resetSettings}
					class="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-colors"
				>
					<RotateCcw class="w-4 h-4" />
					Reset to Defaults
				</button>
			</div>

			<div class="text-xs text-gray-500">
				Auto-save enabled • Last saved: Never
			</div>
		</div>
	</div>
</div>

<!-- Toast Notification -->
{#if showToast}
	<div class="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right">
		<div class="flex items-center gap-3 px-4 py-3 glass-morphism border border-white/20 rounded-lg text-white shadow-lg">
			{#if toastType === 'success'}
				<Check class="w-4 h-4 text-green-400" />
			{:else if toastType === 'error'}
				<X class="w-4 h-4 text-red-400" />
			{:else}
				<Circle class="w-4 h-4 text-blue-400" />
			{/if}
			<span>{toastMessage}</span>
		</div>
	</div>
{/if}

<style lang="postcss">
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

	.setting-select {
		@apply w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500;
	}

	.toggle {
		@apply w-12 h-6 bg-gray-600 rounded-full relative appearance-none cursor-pointer transition-colors;
	}

	.toggle:checked {
		@apply bg-blue-500;
	}

	.toggle::before {
		content: '';
		@apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform;
	}

	.toggle:checked::before {
		@apply transform translate-x-6;
	}

	.checkbox {
		@apply w-4 h-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500 focus:ring-2;
	}

	@keyframes slide-in-from-right {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.animate-in {
		animation: slide-in-from-right 0.3s ease-out;
	}
</style>