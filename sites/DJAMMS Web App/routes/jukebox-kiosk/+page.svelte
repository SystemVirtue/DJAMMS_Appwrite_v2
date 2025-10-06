<script lang="ts">
	// Jukebox Kiosk - Public Interface for Music Requests
	import { onMount } from 'svelte';
	import { Music, Search, Plus, Users, Clock } from 'lucide-svelte';

	let searchQuery = '';
	let isSearching = false;

	onMount(() => {
		console.log('🎵 Jukebox Kiosk: Initialized');
	});

	async function searchMusic() {
		if (!searchQuery.trim()) return;
		
		isSearching = true;
		try {
			console.log('Searching for:', searchQuery);
			// TODO: Implement music search functionality
			await new Promise(resolve => setTimeout(resolve, 1000)); // Mock search delay
		} finally {
			isSearching = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-green-900">
	<!-- Header -->
	<header class="bg-black/30 backdrop-blur-sm border-b border-white/10">
		<div class="max-w-4xl mx-auto px-6 py-6">
			<div class="text-center">
				<div class="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
					<Music class="w-8 h-8 text-white" />
				</div>
				<h1 class="text-3xl font-bold text-white mb-2">Jukebox Kiosk</h1>
				<p class="text-green-200">Request your favorite songs and see what's playing</p>
			</div>
		</div>
	</header>

	<div class="max-w-4xl mx-auto p-6">
		<!-- Now Playing Section -->
		<div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
			<h2 class="text-xl font-bold text-white mb-4">Now Playing</h2>
			<div class="text-center py-8">
				<div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
					<Music class="w-12 h-12 text-green-400" />
				</div>
				<p class="text-gray-400">No song currently playing</p>
				<p class="text-sm text-gray-500 mt-2">Make a request to get the party started!</p>
			</div>
		</div>

		<!-- Search and Request Section -->
		<div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
			<h2 class="text-xl font-bold text-white mb-4">Request a Song</h2>
			
			<div class="flex space-x-3 mb-6">
				<div class="flex-1">
					<input
						bind:value={searchQuery}
						placeholder="Search for songs, artists, or albums..."
						class="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none"
						on:keydown={(e) => e.key === 'Enter' && searchMusic()}
					/>
				</div>
				<button
					on:click={searchMusic}
					disabled={isSearching || !searchQuery.trim()}
					class="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					{#if isSearching}
						<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					{:else}
						<Search class="w-5 h-5" />
					{/if}
				</button>
			</div>

			<div class="text-center py-12 text-gray-500">
				<Search class="w-16 h-16 mx-auto mb-4 opacity-50" />
				<p>Enter a search term to find songs</p>
			</div>
		</div>

		<!-- Coming Up Section -->
		<div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10">
			<h2 class="text-xl font-bold text-white mb-4">Coming Up</h2>
			<div class="text-center py-8">
				<Clock class="w-12 h-12 text-gray-500 mx-auto mb-4" />
				<p class="text-gray-400">No songs in queue</p>
			</div>
		</div>
	</div>
</div>