<script lang="ts">
	import '../app.postcss';
	import { onMount } from 'svelte';
	import { djammsStore } from '$lib/stores/djamms';
	import { account } from '$lib/utils/appwrite';
	import type { LayoutData } from './$types';

	// Accept SvelteKit props (external reference only)
	export const data = undefined;
	onMount(() => {
		djammsStore.initializeAuth();
	});
</script>

<div class="relative flex flex-col h-screen overflow-hidden bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">
	<slot />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Roboto', 'Arial', sans-serif;
	}
</style>