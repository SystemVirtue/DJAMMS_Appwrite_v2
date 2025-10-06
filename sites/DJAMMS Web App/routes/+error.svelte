<script lang="ts">
	import { page } from '$app/stores';
	import { AlertTriangle } from 'lucide-svelte';

	// Accept the params prop that SvelteKit passes (external reference)
	export const params: any = {};
</script>

<svelte:head>
	<title>Error - DJAMMS</title>
</svelte:head>

<main class="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-pink text-white">
	<div class="max-w-md text-center">
		<div class="w-20 h-20 mx-auto mb-6 bg-red-600/20 rounded-full flex items-center justify-center">
			<AlertTriangle class="w-10 h-10 text-red-400" />
		</div>
		
		<h1 class="text-3xl font-bold mb-4">Something went wrong</h1>
		<p class="text-gray-400 mb-6">We encountered an error while loading this page.</p>
		
		<div class="space-y-3">
			<a 
				href="/dashboard" 
				class="inline-block px-6 py-3 bg-gradient-to-r from-music-purple to-purple-700 text-white rounded-full font-medium hover:shadow-lg transition-all"
			>
				Return to Dashboard
			</a>
			<br>
			<a 
				href="/" 
				class="inline-block px-4 py-2 text-gray-400 hover:text-white transition-colors"
			>
				Go Home
			</a>
		</div>
		
		{#if $page.error}
			<details class="mt-8 p-4 bg-red-600/10 rounded-lg border border-red-600/20 text-left">
				<summary class="cursor-pointer text-red-400 font-medium">Error Details</summary>
				<pre class="mt-2 text-xs text-gray-300 overflow-auto">{$page.error.message}</pre>
			</details>
		{/if}
	</div>
</main>