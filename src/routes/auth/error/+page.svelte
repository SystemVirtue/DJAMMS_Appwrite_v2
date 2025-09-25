<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';

let errorMsg = '';

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	const errorRaw = params.get('error');
	if (errorRaw) {
		try {
			const err = JSON.parse(errorRaw);
			if (err.code === 409 || err.type === 'user_already_exists') {
				// Do not redirect for user_already_exists - show the error message instead
				errorMsg = err.message || errorRaw;
				return;
			}
			errorMsg = err.message || errorRaw;
		} catch {
			errorMsg = errorRaw;
		}
	} else {
		errorMsg = 'Unknown authentication error.';
	}
});
</script>

<svelte:head>
	<title>Authentication Error</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-screen">
	<h1 class="text-2xl font-bold mb-4">Authentication Error</h1>
	<p class="text-red-500">{errorMsg}</p>
	<a href="/" class="mt-6 text-blue-600 underline">Back to Login</a>
</div>
