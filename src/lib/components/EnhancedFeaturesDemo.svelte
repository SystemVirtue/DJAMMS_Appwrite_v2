<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { account } from '$lib/utils/appwrite';
	import type { 
		ParsedEnhancedPlaylist, 
		UserInstanceSettings, 
		ParsedUserQueue,
		PlaylistTrack,
		Track
	} from '$lib/types';
	
	// Import services (these will work once compile errors are resolved)
	// import { Services } from '$lib/services';
	// import { 
	// 	enhancedPlaylists, 
	// 	userInstanceSettings, 
	// 	currentUserQueue,
	// 	isPlaylistsLoading 
	// } from '$lib/stores/enhanced';

	let userId = '';
	let instanceId = 'demo-instance';
	
	let playlists: ParsedEnhancedPlaylist[] = [];
	let settings: UserInstanceSettings | null = null;
	let queue: ParsedUserQueue | null = null;
	let isLoading = false;
	let selectedPlaylist: ParsedEnhancedPlaylist | null = null;

	onMount(async () => {
		// Get current user
		try {
			const user = await account.get();
			userId = user.$id;
			instanceId = `instance-${user.$id}`;
			await loadData();
		} catch (error) {
			console.error('Failed to get user:', error);
		}
	});

	async function loadData() {
		isLoading = true;
		try {
			// Note: These service calls will work once the compile errors are resolved
			// const [userPlaylists, userSettings, userQueue] = await Promise.all([
			// 	Services.enhancedPlaylist().getUserPlaylists(userId),
			// 	Services.userSettings().getOrCreateUserSettings(userId, instanceId),
			// 	Services.userQueue().getUserQueue(userId, instanceId)
			// ]);
			
			// playlists = userPlaylists;
			// settings = userSettings;
			// queue = userQueue;
			
			// Mock data for demonstration
			playlists = [];
			settings = null;
			queue = null;
			
			console.log('Enhanced data loaded successfully');
		} catch (error) {
			console.error('Failed to load enhanced data:', error);
		} finally {
			isLoading = false;
		}
	}

	async function createEnhancedPlaylist() {
		if (!userId) return;
		
		try {
			// const newPlaylist = await Services.enhancedPlaylist().createPlaylist({
			// 	user_id: userId,
			// 	name: 'My Enhanced Playlist',
			// 	description: 'Created with enhanced features',
			// 	tracks: JSON.stringify([]),
			// 	category: 'general',
			// 	is_public: false
			// });
			
			// playlists = [...playlists, newPlaylist];
			console.log('Enhanced playlist would be created here');
		} catch (error) {
			console.error('Failed to create enhanced playlist:', error);
		}
	}

	async function updateAudioQuality(quality: 'auto' | 'high' | 'medium' | 'low') {
		if (!userId) return;
		
		try {
			// const updatedSettings = await Services.userSettings().updateAudioQuality(
			// 	userId, 
			// 	instanceId, 
			// 	quality
			// );
			// settings = updatedSettings;
			console.log(`Audio quality would be updated to: ${quality}`);
		} catch (error) {
			console.error('Failed to update audio quality:', error);
		}
	}

	async function addTrackToQueue(track: PlaylistTrack) {
		if (!userId) return;
		
		try {
			// const updatedQueue = await Services.userQueue().addTrackToQueue(
			// 	userId, 
			// 	instanceId, 
			// 	track
			// );
			// queue = updatedQueue;
			console.log('Track would be added to queue:', track);
		} catch (error) {
			console.error('Failed to add track to queue:', error);
		}
	}

	async function toggleFavorite(playlistId: string) {
		if (!userId) return;
		
		try {
			// await Services.favorites().toggleFavorite(userId, playlistId);
			console.log(`Favorite status would be toggled for playlist: ${playlistId}`);
		} catch (error) {
			console.error('Failed to toggle favorite:', error);
		}
	}

	async function recordTrackPlay(track: Track, playedDuration: number) {
		if (!userId) return;
		
		try {
			// await Services.playHistory().recordTrackPlayFromTrack(
			// 	userId,
			// 	instanceId,
			// 	track,
			// 	selectedPlaylist?.$id,
			// 	`session-${Date.now()}`,
			// 	playedDuration,
			// 	false
			// );
			console.log('Track play would be recorded:', { track, playedDuration });
		} catch (error) {
			console.error('Failed to record track play:', error);
		}
	}

	// Event handlers for form inputs
	function handleAudioQualityChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const quality = target.value as 'auto' | 'high' | 'medium' | 'low';
		updateAudioQuality(quality);
	}

	function handleVolumeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		console.log('Volume:', target.value);
	}

	function handleCrossfadeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		console.log('Crossfade:', target.value);
	}

	function handleAutoPlayChange(e: Event) {
		const target = e.target as HTMLInputElement;
		console.log('Auto-play:', target.checked);
	}

	function handleNotificationChange(e: Event) {
		const target = e.target as HTMLInputElement;
		console.log('Notifications:', target.checked);
	}
</script>

<div class="enhanced-features-demo">
	<h1>Enhanced Collections Demo</h1>
	
	{#if isLoading}
		<div class="loading">
			<p>Loading enhanced data...</p>
		</div>
	{:else}
		<!-- Enhanced Playlists Section -->
		<section class="playlists-section">
			<h2>Enhanced Playlists</h2>
			<button on:click={createEnhancedPlaylist} class="btn-primary">
				Create Enhanced Playlist
			</button>
			
			{#if playlists.length > 0}
				<div class="playlists-grid">
					{#each playlists as playlist}
						<div class="playlist-card" class:selected={selectedPlaylist?.$id === playlist.$id}>
							<h3>{playlist.name}</h3>
							<p>{playlist.description}</p>
							<div class="metadata">
								<span class="category">📁 {playlist.category}</span>
								<span class="play-count">▶️ {playlist.play_count} plays</span>
								<span class="duration">⏱️ {Math.floor((playlist.total_duration || 0) / 60)}min</span>
								<span class="visibility">{playlist.is_public ? '🌍 Public' : '🔒 Private'}</span>
							</div>
							<div class="actions">
								<button on:click={() => selectedPlaylist = playlist}>Select</button>
								<button on:click={() => toggleFavorite(playlist.$id)}>❤️</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">No enhanced playlists yet. Create one to get started!</p>
			{/if}
		</section>

		<!-- User Settings Section -->
		<section class="settings-section">
			<h2>User Instance Settings</h2>
			
			{#if settings}
				<div class="settings-grid">
					<div class="setting">
						<label for="audio-quality">Audio Quality:</label>
						<select 
							id="audio-quality" 
							value={settings.audio_quality || 'auto'}
							on:change={handleAudioQualityChange}
						>
							<option value="auto">Auto</option>
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
					</div>
					
					<div class="setting">
						<label for="volume">Volume Level:</label>
						<input 
							id="volume" 
							type="range" 
							min="0" 
							max="100" 
							value={settings.volume_level || 80}
							on:input={handleVolumeInput}
						/>
						<span>{settings.volume_level || 80}%</span>
					</div>
					
					<div class="setting">
						<label for="crossfade">Crossfade Duration:</label>
						<input 
							id="crossfade" 
							type="range" 
							min="0" 
							max="10" 
							value={settings.crossfade_duration || 3}
							on:input={handleCrossfadeInput}
						/>
						<span>{settings.crossfade_duration || 3}s</span>
					</div>
					
					<div class="setting">
						<label>
							<input 
								type="checkbox" 
								checked={settings.auto_play !== false}
								on:change={handleAutoPlayChange}
							/>
							Auto-play enabled
						</label>
					</div>
					
					<div class="setting">
						<label>
							<input 
								type="checkbox" 
								checked={settings.notification_enabled !== false}
								on:change={handleNotificationChange}
							/>
							Notifications enabled
						</label>
					</div>
				</div>
			{:else}
				<p>Settings will be auto-created when you interact with the app.</p>
			{/if}
		</section>

		<!-- Queue Management Section -->
		<section class="queue-section">
			<h2>Queue Management</h2>
			
			{#if queue}
				<div class="queue-info">
					<p><strong>Queue Length:</strong> {queue.queue_tracks.length} tracks</p>
					<p><strong>Current Index:</strong> {queue.current_index}</p>
					<p><strong>Shuffle:</strong> {queue.shuffle_enabled ? '🔀 On' : '📄 Off'}</p>
					<p><strong>Repeat:</strong> 
						{#if queue.repeat_mode === 'one'}🔂 One
						{:else if queue.repeat_mode === 'all'}🔁 All
						{:else}➡️ None
						{/if}
					</p>
				</div>
				
				<div class="queue-tracks">
					{#each queue.queue_tracks as track, index}
						<div class="queue-track" class:current={index === queue.current_index}>
							<span class="index">{index + 1}</span>
							<span class="title">{track.title}</span>
							<span class="artist">{track.artist}</span>
							<button on:click={() => recordTrackPlay(track, track.duration * 0.8)}>
								Record Play
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<p>No active queue. Add tracks from a playlist to get started!</p>
			{/if}
		</section>

		<!-- Demo Actions -->
		<section class="demo-actions">
			<h2>Demo Actions</h2>
			<p class="note">
				<strong>Note:</strong> This is a demonstration component. 
				The actual service calls are commented out due to TypeScript compilation issues, 
				but the integration patterns are shown above.
			</p>
			
			<div class="actions-grid">
				<button on:click={() => console.log('Would load user statistics')}>
					Load Listening Stats
				</button>
				<button on:click={() => console.log('Would check migration status')}>
					Check Migration Status
				</button>
				<button on:click={() => console.log('Would load favorites')}>
					Load Favorites
				</button>
				<button on:click={() => console.log('Would load recently played')}>
					Load Recently Played
				</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.enhanced-features-demo {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.loading {
		text-align: center;
		padding: 2rem;
	}

	section {
		margin-bottom: 3rem;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	h1, h2 {
		color: white;
		margin-bottom: 1rem;
	}

	.playlists-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.playlist-card {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s ease;
	}

	.playlist-card:hover, .playlist-card.selected {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.playlist-card h3 {
		margin: 0 0 0.5rem 0;
		color: white;
	}

	.playlist-card p {
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.metadata {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.8rem;
	}

	.metadata span {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.8);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.setting {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.setting label {
		color: white;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.setting input, .setting select {
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: white;
	}

	.queue-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.queue-info p {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.8rem;
		border-radius: 6px;
		margin: 0;
		color: white;
	}

	.queue-tracks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.queue-track {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		gap: 1rem;
		align-items: center;
		padding: 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
	}

	.queue-track.current {
		background: rgba(79, 172, 254, 0.2);
		border: 1px solid rgba(79, 172, 254, 0.5);
	}

	.queue-track .index {
		color: rgba(255, 255, 255, 0.6);
		font-weight: bold;
		min-width: 2rem;
	}

	.queue-track .title {
		color: white;
		font-weight: 500;
	}

	.queue-track .artist {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	button {
		padding: 0.6rem 1.2rem;
		background: rgba(79, 172, 254, 0.8);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	button:hover {
		background: rgba(79, 172, 254, 1);
	}

	.btn-primary {
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		font-weight: 500;
	}

	.empty-state {
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
		padding: 2rem;
		font-style: italic;
	}

	.note {
		background: rgba(255, 193, 7, 0.1);
		border: 1px solid rgba(255, 193, 7, 0.3);
		color: rgba(255, 193, 7, 0.9);
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}
</style>