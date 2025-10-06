<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { djammsStore } from '$lib/stores/djamms';
	import { account } from '$lib/utils/appwrite';
	import { Play, Music, Headphones, Zap } from 'lucide-svelte';
	import type { PageData } from './$types';

	// Accept SvelteKit props (external reference only)
	export const data = undefined;
	export const params = undefined;

	let isLoading = false;

	$: if ($djammsStore.isAuthenticated) {
		goto('/djamms-dashboard');
	}

	onMount(() => {
		// Check if user is already logged in
		if ($djammsStore.isAuthenticated) {
			goto('/djamms-dashboard');
		}
	});

	async function handleGoogleLogin() {
		isLoading = true;
		try {
			// Construct custom OAuth URL to force account selection
			const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
			const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
			const successUrl = encodeURIComponent(`${window.location.origin}/djamms-dashboard`);
			const failureUrl = encodeURIComponent(`${window.location.origin}/auth/error`);
			const cacheBuster = Date.now(); // Prevent browser caching

			// Force Google to show account selection with multiple parameters
			const oauthUrl = `${endpoint}/account/sessions/oauth2/google?project=${projectId}&success=${successUrl}&failure=${failureUrl}&scope=email%20profile&approval_prompt=force&prompt=consent%20select_account&state=${cacheBuster}`;

			// Redirect to the custom OAuth URL
			window.location.href = oauthUrl;
		} catch (error) {
			console.error('Login failed:', error);
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>DJAMMS - Digital Jukebox & Media Manager</title>
	<meta name="description" content="Your personal YouTube music video player and media management system" />
</svelte:head>

<main class="flex items-center justify-center min-h-screen p-4 gradient-background">
	<div class="relative max-w-4xl mx-auto">
		<!-- Animated Background Elements -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute top-10 left-10 w-20 h-20 bg-youtube-red/20 rounded-full blur-xl animate-float"></div>
			<div class="absolute top-32 right-20 w-16 h-16 bg-music-purple/20 rounded-full blur-xl animate-float" style="animation-delay: 1s;"></div>
			<div class="absolute bottom-20 left-1/4 w-24 h-24 bg-music-pink/20 rounded-full blur-xl animate-float" style="animation-delay: 2s;"></div>
		</div>

		<!-- Main Content -->
		<div class="relative glass-morphism rounded-3xl p-8 md:p-12 text-center">
			<!-- Logo Section -->
			<div class="mb-8">
				<div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-youtube-red to-music-purple rounded-2xl shadow-2xl">
					<Play class="w-10 h-10 text-white" />
				</div>
				<h1 class="text-5xl md:text-6xl font-bold text-white mb-4">
					<span class="bg-gradient-to-r from-youtube-red via-music-purple to-music-pink bg-clip-text text-transparent">
						DJAMMS
					</span>
				</h1>
				<p class="text-xl text-gray-300 max-w-2xl mx-auto">
					Digital Jukebox & Media Management System
				</p>
				<p class="text-gray-400 mt-2">
					Your personal YouTube music video player with multi-window management
				</p>
			</div>

			<!-- Features Grid -->
			<div class="grid md:grid-cols-3 gap-6 mb-8">
				<div class="p-6 bg-white/5 rounded-xl border border-white/10">
					<Music class="w-8 h-8 text-youtube-red mx-auto mb-3" />
					<h3 class="text-white font-semibold mb-2">Multi-Window Player</h3>
					<p class="text-gray-400 text-sm">Separate video player, queue manager, and playlist library windows</p>
				</div>
				<div class="p-6 bg-white/5 rounded-xl border border-white/10">
					<Headphones class="w-8 h-8 text-music-purple mx-auto mb-3" />
					<h3 class="text-white font-semibold mb-2">Smart Playlists</h3>
					<p class="text-gray-400 text-sm">Create, manage, and sync playlists across all your devices</p>
				</div>
				<div class="p-6 bg-white/5 rounded-xl border border-white/10">
					<Zap class="w-8 h-8 text-music-pink mx-auto mb-3" />
					<h3 class="text-white font-semibold mb-2">Real-time Sync</h3>
					<p class="text-gray-400 text-sm">Instant synchronization across all connected windows</p>
				</div>
			</div>

			<!-- Login Button -->
			<div class="space-y-4">
				<button
					on:click={handleGoogleLogin}
					disabled={isLoading || $djammsStore.isLoading}
					class="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-youtube-red to-music-purple hover:from-youtube-red/90 hover:to-music-purple/90 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoading || $djammsStore.isLoading}
						<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Signing in...
					{:else}
						<svg class="w-5 h-5" viewBox="0 0 24 24">
							<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
							<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
							<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
							<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
						</svg>
						Continue with Google
					{/if}
				</button>
				
				<p class="text-gray-400 text-sm">
					Sign in to access your personal jukebox and media library
				</p>
			</div>

			<!-- Version Info -->
			<div class="mt-8 pt-6 border-t border-white/10">
				<p class="text-gray-500 text-xs">
					DJAMMS v2.0 • Built with SvelteKit & Appwrite
				</p>
			</div>
		</div>
	</div>
</main>