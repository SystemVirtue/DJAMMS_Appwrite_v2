<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { djammsStore } from '$lib/stores/djamms';
	import { playerSync } from '$lib/services/playerSync';
	import { windowManager } from '$lib/services/windowManager';
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
		gapless: true,
		highQuality: true,
		normalizeVolume: false
	};

	// Video Overlay Settings
	let overlaySettings = {
		showTitle: true,
		showArtist: true,
		showProgress: true,
		showControls: true,
		showQueue: false,
		showLyrics: false,
		overlayOpacity: 80,
		overlayPosition: 'bottom', // 'top', 'bottom', 'center'
		overlayTheme: 'dark', // 'dark', 'light', 'auto'
		hideDelay: 5
	};

	// Appearance Settings
	let appearanceSettings = {
		theme: 'dark', // 'dark', 'light', 'auto'
		accentColor: '#EC4899',
		backgroundBlur: true,
		animations: true,
		compactMode: false,
		showThumbnails: true,
		gridColumns: 4
	};

	// Keyboard Shortcuts
	let keyboardShortcuts = [
		{ id: 'play-pause', action: 'Play/Pause', key: 'Space', enabled: true },
		{ id: 'next-track', action: 'Next Track', key: 'ArrowRight', enabled: true },
		{ id: 'prev-track', action: 'Previous Track', key: 'ArrowLeft', enabled: true },
		{ id: 'volume-up', action: 'Volume Up', key: 'ArrowUp', enabled: true },
		{ id: 'volume-down', action: 'Volume Down', key: 'ArrowDown', enabled: true },
		{ id: 'shuffle', action: 'Toggle Shuffle', key: 'KeyS', enabled: true },
		{ id: 'repeat', action: 'Toggle Repeat', key: 'KeyR', enabled: true },
		{ id: 'fullscreen', action: 'Toggle Fullscreen', key: 'KeyF', enabled: true }
	];

	// System Settings
	let systemSettings = {
		instanceId: 'DJAMMS-2024-001',
		serverUrl: 'https://cloud.appwrite.io/v1',
		maxCacheSize: 500, // MB
		logLevel: 'info', // 'debug', 'info', 'warn', 'error'
		autoUpdates: true,
		analytics: false,
		crashReporting: true,
		developerMode: false
	};

	// Advanced Settings
	let advancedSettings = {
		apiTimeout: 30,
		retryAttempts: 3,
		bufferSize: 4096,
		preloadTracks: 2,
		networkPriority: 'balanced', // 'speed', 'balanced', 'quality'
		cacheStrategy: 'smart', // 'aggressive', 'smart', 'minimal'
		errorRecovery: true,
		debugMode: false
	};

	let unsavedChanges = false;
	let saveStatus = ''; // 'saving', 'saved', 'error'

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

	function markUnsaved() {
		unsavedChanges = true;
	}

	async function saveSettings() {
		saveStatus = 'saving';
		unsavedChanges = false;
		
		// Simulate API call
		setTimeout(() => {
			saveStatus = 'saved';
			setTimeout(() => saveStatus = '', 2000);
		}, 1000);
	}

	function resetSettings() {
		if (confirm('Are you sure you want to reset all settings to defaults?')) {
			// Reset all settings to defaults
			playerSettings = {
				autoPlay: true,
				shuffle: false,
				repeat: 'none',
				volume: 75,
				crossfade: 3,
				gapless: true,
				highQuality: true,
				normalizeVolume: false
			};
			markUnsaved();
		}
	}

	function exportSettings() {
		const settings = {
			playerSettings,
			overlaySettings,
			appearanceSettings,
			keyboardShortcuts,
			systemSettings,
			advancedSettings
		};
		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'djamms-settings.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function importSettings(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const result = e.target?.result;
					if (typeof result === 'string') {
						const settings = JSON.parse(result);
						// Merge imported settings
						if (settings.playerSettings) Object.assign(playerSettings, settings.playerSettings);
						if (settings.overlaySettings) Object.assign(overlaySettings, settings.overlaySettings);
						if (settings.appearanceSettings) Object.assign(appearanceSettings, settings.appearanceSettings);
						// ... merge other settings
						markUnsaved();
					}
				} catch (error) {
					alert('Invalid settings file');
				}
			};
			reader.readAsText(file);
		}
	}

	onMount(async () => {
		// Check for duplicate instance first
		if (browser && windowManager.shouldPreventDuplicate()) {
			// Show alert and redirect
			alert('Admin Console is already open in another window. Redirecting to dashboard.');
			window.location.href = '/dashboard';
			return;
		}

		// Initialize sync service for this window - this will request current status
		if (browser) {
			playerSync.initializeForWindow();
		}
	});

	onDestroy(() => {
		// Sync service cleanup is handled globally
	});
</script>

<svelte:head>
	<title>Admin Console - DJAMMS</title>
</svelte:head>

<main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-pink">
	<!-- Header -->
	<header class="flex justify-between items-center p-4 glass-morphism border-b border-white/10">
		<div class="flex items-center gap-4">
			<div class="w-10 h-10 bg-gradient-to-br from-music-pink to-pink-700 rounded-xl flex items-center justify-center">
				<Settings class="w-6 h-6 text-white" />
			</div>
			<div>
				<h1 class="text-xl font-bold text-white">Admin Console</h1>
				<p class="text-gray-400 text-sm">Configure player settings and preferences</p>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<!-- Save Status -->
			{#if unsavedChanges}
				<div class="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
					<div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
					<span class="text-yellow-500 text-sm font-medium">Unsaved Changes</span>
				</div>
			{:else if saveStatus === 'saving'}
				<div class="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
					<RefreshCw class="w-4 h-4 text-blue-500 animate-spin" />
					<span class="text-blue-500 text-sm font-medium">Saving...</span>
				</div>
			{:else if saveStatus === 'saved'}
				<div class="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
					<Check class="w-4 h-4 text-green-500" />
					<span class="text-green-500 text-sm font-medium">Saved</span>
				</div>
			{/if}

			<!-- Player Status -->
			{#if $playerStatus}
				{@const statusDisplay = getStatusDisplay($playerStatus)}
				<div class="status-indicator {statusDisplay.class}">
					<svelte:component this={statusDisplay.icon} class="w-4 h-4" />
					<span class="hidden sm:inline">{statusDisplay.text}</span>
				</div>
			{/if}

			<!-- User Info -->
			<div class="flex items-center gap-2">
				<img
					src={$djammsStore.currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.username || 'User')}&background=EC4899&color=fff`}
					alt="User Avatar"
					class="w-8 h-8 rounded-full"
				>
				<span class="text-white text-sm font-medium hidden sm:block">{$djammsStore.currentUser?.username}</span>
			</div>
		</div>
	</header>

	<!-- Tab Navigation -->
	<nav class="flex overflow-x-auto px-4 py-2 border-b border-white/10">
		<div class="flex gap-1">
			<button 
				class="tab-button"
				class:active={activeTab === 'player'}
				on:click={() => activeTab = 'player'}
			>
				<Volume2 class="w-4 h-4" />
				Player
			</button>
			<button 
				class="tab-button"
				class:active={activeTab === 'overlay'}
				on:click={() => activeTab = 'overlay'}
			>
				<Monitor class="w-4 h-4" />
				Video Overlay
			</button>
			<button 
				class="tab-button"
				class:active={activeTab === 'appearance'}
				on:click={() => activeTab = 'appearance'}
			>
				<Palette class="w-4 h-4" />
				Appearance
			</button>
			<button 
				class="tab-button"
				class:active={activeTab === 'keyboard'}
				on:click={() => activeTab = 'keyboard'}
			>
				<Keyboard class="w-4 h-4" />
				Shortcuts
			</button>
			<button 
				class="tab-button"
				class:active={activeTab === 'system'}
				on:click={() => activeTab = 'system'}
			>
				<Database class="w-4 h-4" />
				System
			</button>
			<button 
				class="tab-button"
				class:active={activeTab === 'advanced'}
				on:click={() => activeTab === 'advanced'}
			>
				<Sliders class="w-4 h-4" />
				Advanced
			</button>
		</div>
	</nav>

	<!-- Tab Content -->
	<div class="flex-1 overflow-auto p-6">
		{#if activeTab === 'player'}
			<!-- Player Settings -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">Player Preferences</h2>
				
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Playback Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Playback</h3>
						
						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={playerSettings.autoPlay}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Auto-play next track
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={playerSettings.shuffle}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Shuffle by default
							</label>
						</div>

						<div class="setting-item">
							<label for="repeat-mode" class="setting-label-block">Repeat Mode</label>
							<select 
								id="repeat-mode"
								bind:value={playerSettings.repeat}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="none">No Repeat</option>
								<option value="one">Repeat One</option>
								<option value="all">Repeat All</option>
							</select>
						</div>

						<div class="setting-item">
							<label for="default-volume" class="setting-label-block">Default Volume</label>
							<div class="flex items-center gap-3">
								<input 
									id="default-volume"
									type="range" 
									min="0" 
									max="100" 
									bind:value={playerSettings.volume}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-12">{playerSettings.volume}%</span>
							</div>
						</div>
					</div>

					<!-- Audio Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Audio Quality</h3>
						
						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={playerSettings.highQuality}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								High Quality Audio (when available)
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={playerSettings.gapless}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Gapless Playback
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={playerSettings.normalizeVolume}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Normalize Volume
							</label>
						</div>

						<div class="setting-item">
							<label for="crossfade-duration" class="setting-label-block">Crossfade Duration</label>
							<div class="flex items-center gap-3">
								<input 
									id="crossfade-duration"
									type="range" 
									min="0" 
									max="10" 
									bind:value={playerSettings.crossfade}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-12">{playerSettings.crossfade}s</span>
							</div>
						</div>
					</div>
				</div>
			</div>

		{:else if activeTab === 'overlay'}
			<!-- Video Overlay Settings -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">Video Overlay Settings</h2>
				
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Display Elements -->
					<div class="settings-section">
						<h3 class="settings-section-title">Display Elements</h3>
						
						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={overlaySettings.showTitle}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Track Title
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={overlaySettings.showArtist}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Artist Name
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={overlaySettings.showProgress}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Progress Bar
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={overlaySettings.showControls}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Player Controls
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={overlaySettings.showQueue}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Queue Preview
							</label>
						</div>
					</div>

					<!-- Overlay Appearance -->
					<div class="settings-section">
						<h3 class="settings-section-title">Appearance</h3>
						
						<div class="setting-item">
							<label for="overlay-position" class="setting-label-block">Position</label>
							<select 
								id="overlay-position"
								bind:value={overlaySettings.overlayPosition}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="top">Top</option>
								<option value="center">Center</option>
								<option value="bottom">Bottom</option>
							</select>
						</div>

						<div class="setting-item">
							<label for="overlay-theme" class="setting-label-block">Theme</label>
							<select 
								id="overlay-theme"
								bind:value={overlaySettings.overlayTheme}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="dark">Dark</option>
								<option value="light">Light</option>
								<option value="auto">Auto</option>
							</select>
						</div>

						<div class="setting-item">
							<label for="overlay-opacity" class="setting-label-block">Opacity</label>
							<div class="flex items-center gap-3">
								<input 
									id="overlay-opacity"
									type="range" 
									min="0" 
									max="100" 
									bind:value={overlaySettings.overlayOpacity}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-12">{overlaySettings.overlayOpacity}%</span>
							</div>
						</div>

						<div class="setting-item">
							<label for="auto-hide-delay" class="setting-label-block">Auto-Hide Delay</label>
							<div class="flex items-center gap-3">
								<input 
									id="auto-hide-delay"
									type="range" 
									min="0" 
									max="15" 
									bind:value={overlaySettings.hideDelay}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-12">{overlaySettings.hideDelay}s</span>
							</div>
						</div>
					</div>
				</div>
			</div>

		{:else if activeTab === 'appearance'}
			<!-- Appearance Settings -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">Appearance Settings</h2>
				
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Theme Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Theme</h3>
						
						<div class="setting-item">
							<label for="color-scheme" class="setting-label-block">Color Scheme</label>
							<select 
								id="color-scheme"
								bind:value={appearanceSettings.theme}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="dark">Dark</option>
								<option value="light">Light</option>
								<option value="auto">Auto (System)</option>
							</select>
						</div>

						<div class="setting-item">
							<label for="accent-color" class="setting-label-block">Accent Color</label>
							<input 
								id="accent-color"
								type="color" 
								bind:value={appearanceSettings.accentColor}
								on:change={markUnsaved}
								class="setting-color"
							>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={appearanceSettings.backgroundBlur}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Background Blur Effects
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={appearanceSettings.animations}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Enable Animations
							</label>
						</div>
					</div>

					<!-- Layout Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Layout</h3>
						
						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={appearanceSettings.compactMode}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Compact Mode
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={appearanceSettings.showThumbnails}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Show Thumbnails
							</label>
						</div>

						<div class="setting-item">
							<label for="grid-columns" class="setting-label-block">Grid Columns</label>
							<div class="flex items-center gap-3">
								<input 
									id="grid-columns"
									type="range" 
									min="2" 
									max="8" 
									bind:value={appearanceSettings.gridColumns}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-12">{appearanceSettings.gridColumns}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

		{:else if activeTab === 'keyboard'}
			<!-- Keyboard Shortcuts -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">Keyboard Shortcuts</h2>
				
				<div class="settings-section">
					<div class="space-y-4">
						{#each keyboardShortcuts as shortcut}
							<div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
								<div class="flex items-center gap-4">
									<label class="setting-label">
										<input 
											type="checkbox" 
											bind:checked={shortcut.enabled}
											on:change={markUnsaved}
											class="setting-checkbox"
										>
									</label>
									<div>
										<div class="text-white font-medium">{shortcut.action}</div>
									</div>
								</div>
								
								<div class="flex items-center gap-3">
									<kbd class="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-mono">
										{shortcut.key}
									</kbd>
									<button class="p-2 text-gray-400 hover:text-white transition-colors">
										<Settings class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

		{:else if activeTab === 'system'}
			<!-- System Settings -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">System Configuration</h2>
				
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Instance Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Instance</h3>
						
						<div class="setting-item">
							<label for="instance-id" class="setting-label-block">Instance ID</label>
							<input 
								id="instance-id"
								type="text" 
								bind:value={systemSettings.instanceId}
								on:input={markUnsaved}
								class="setting-input"
								readonly
							>
						</div>

						<div class="setting-item">
							<label for="server-url" class="setting-label-block">Server URL</label>
							<input 
								id="server-url"
								type="text" 
								bind:value={systemSettings.serverUrl}
								on:input={markUnsaved}
								class="setting-input"
							>
						</div>

						<div class="setting-item">
							<label for="cache-size" class="setting-label-block">Cache Size Limit (MB)</label>
							<div class="flex items-center gap-3">
								<input 
									id="cache-size"
									type="range" 
									min="100" 
									max="2000" 
									step="100"
									bind:value={systemSettings.maxCacheSize}
									on:input={markUnsaved}
									class="setting-slider"
								>
								<span class="text-white text-sm font-mono w-16">{systemSettings.maxCacheSize}MB</span>
							</div>
						</div>
					</div>

					<!-- Application Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Application</h3>
						
						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={systemSettings.autoUpdates}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Automatic Updates
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={systemSettings.analytics}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Send Anonymous Analytics
							</label>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={systemSettings.crashReporting}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Crash Reporting
							</label>
						</div>

						<div class="setting-item">
							<label for="log-level" class="setting-label-block">Log Level</label>
							<select 
								id="log-level"
								bind:value={systemSettings.logLevel}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="debug">Debug</option>
								<option value="info">Info</option>
								<option value="warn">Warning</option>
								<option value="error">Error</option>
							</select>
						</div>
					</div>
				</div>
			</div>

		{:else if activeTab === 'advanced'}
			<!-- Advanced Settings -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-2xl font-bold text-white mb-6">Advanced Configuration</h2>
				<p class="text-gray-400 mb-8">⚠️ Only modify these settings if you know what you're doing</p>
				
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Network Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Network</h3>
						
						<div class="setting-item">
							<label for="api-timeout" class="setting-label-block">API Timeout (seconds)</label>
							<input 
								id="api-timeout"
								type="number" 
								min="5" 
								max="120" 
								bind:value={advancedSettings.apiTimeout}
								on:input={markUnsaved}
								class="setting-input"
							>
						</div>

						<div class="setting-item">
							<label for="retry-attempts" class="setting-label-block">Retry Attempts</label>
							<input 
								id="retry-attempts"
								type="number" 
								min="0" 
								max="10" 
								bind:value={advancedSettings.retryAttempts}
								on:input={markUnsaved}
								class="setting-input"
							>
						</div>

						<div class="setting-item">
							<label for="network-priority" class="setting-label-block">Network Priority</label>
							<select 
								id="network-priority"
								bind:value={advancedSettings.networkPriority}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="speed">Speed</option>
								<option value="balanced">Balanced</option>
								<option value="quality">Quality</option>
							</select>
						</div>
					</div>

					<!-- Performance Settings -->
					<div class="settings-section">
						<h3 class="settings-section-title">Performance</h3>
						
						<div class="setting-item">
							<label for="buffer-size" class="setting-label-block">Buffer Size (KB)</label>
							<input 
								id="buffer-size"
								type="number" 
								min="1024" 
								max="16384" 
								step="1024"
								bind:value={advancedSettings.bufferSize}
								on:input={markUnsaved}
								class="setting-input"
							>
						</div>

						<div class="setting-item">
							<label for="preload-tracks" class="setting-label-block">Preload Tracks</label>
							<input 
								id="preload-tracks"
								type="number" 
								min="0" 
								max="10" 
								bind:value={advancedSettings.preloadTracks}
								on:input={markUnsaved}
								class="setting-input"
							>
						</div>

						<div class="setting-item">
							<label for="cache-strategy" class="setting-label-block">Cache Strategy</label>
							<select 
								id="cache-strategy"
								bind:value={advancedSettings.cacheStrategy}
								on:change={markUnsaved}
								class="setting-select"
							>
								<option value="aggressive">Aggressive</option>
								<option value="smart">Smart</option>
								<option value="minimal">Minimal</option>
							</select>
						</div>

						<div class="setting-item">
							<label class="setting-label">
								<input 
									type="checkbox" 
									bind:checked={advancedSettings.errorRecovery}
									on:change={markUnsaved}
									class="setting-checkbox"
								>
								Automatic Error Recovery
							</label>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Action Bar -->
	<footer class="flex justify-between items-center p-4 border-t border-white/10 glass-morphism">
		<div class="flex items-center gap-4">
			<!-- Import/Export -->
			<button 
				on:click={exportSettings}
				class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all flex items-center gap-2"
			>
				<Download class="w-4 h-4" />
				Export Settings
			</button>
			
			<label class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all flex items-center gap-2 cursor-pointer">
				<Upload class="w-4 h-4" />
				Import Settings
				<input type="file" accept=".json" on:change={importSettings} class="hidden">
			</label>
		</div>

		<div class="flex items-center gap-4">
			<button 
				on:click={resetSettings}
				class="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
			>
				<RotateCcw class="w-4 h-4" />
				Reset to Defaults
			</button>
			
			<button 
				on:click={saveSettings}
				disabled={!unsavedChanges}
				class="px-6 py-2 bg-gradient-to-r from-music-pink to-pink-700 hover:from-music-pink/90 hover:to-pink-700/90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2"
			>
				<Save class="w-4 h-4" />
				{saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</footer>
</main>

<style>
	.tab-button {
		padding: 0.5rem 1rem;
		color: #9ca3af;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	.tab-button:hover {
		color: white;
	}
	
	.tab-button.active {
		color: white;
		background-color: #ec4899;
	}

	.settings-section {
		background-color: rgba(255, 255, 255, 0.05);
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 1.5rem;
	}

	.settings-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: white;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.setting-item {
		margin-bottom: 1rem;
	}
	
	.setting-item:last-child {
		margin-bottom: 0;
	}

	.setting-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: white;
		cursor: pointer;
	}

	.setting-label-block {
		display: block;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.setting-checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: #ec4899;
	}

	.setting-input {
		width: 100%;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: white;
	}
	
	.setting-input::placeholder {
		color: #9ca3af;
	}
	
	.setting-input:focus {
		outline: none;
		border-color: #ec4899;
	}

	.setting-select {
		width: 100%;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: white;
	}
	
	.setting-select:focus {
		outline: none;
		border-color: #ec4899;
	}

	.setting-slider {
		flex: 1;
		accent-color: #ec4899;
	}

	.setting-color {
		width: 3rem;
		height: 2rem;
		background-color: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		cursor: pointer;
	}
</style>