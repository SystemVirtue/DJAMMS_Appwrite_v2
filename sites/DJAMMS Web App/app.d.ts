// DJAMMS custom global for venue_id
declare global {
	interface Window {
		DJAMMS_VENUE_ID?: string;
	}
}
export {};
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Window {
		onYouTubeIframeAPIReady: () => void;
		YT: any;
	}
}

export {};