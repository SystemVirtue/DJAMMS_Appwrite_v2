
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/adminconsole" | "/auth" | "/auth/error" | "/dashboard" | "/dashboard/tabs" | "/djamms-dashboard" | "/jukebox-kiosk" | "/playlistlibrary" | "/queuemanager" | "/videoplayer";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/adminconsole": Record<string, never>;
			"/auth": Record<string, never>;
			"/auth/error": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/dashboard/tabs": Record<string, never>;
			"/djamms-dashboard": Record<string, never>;
			"/jukebox-kiosk": Record<string, never>;
			"/playlistlibrary": Record<string, never>;
			"/queuemanager": Record<string, never>;
			"/videoplayer": Record<string, never>
		};
		Pathname(): "/" | "/adminconsole" | "/adminconsole/" | "/auth" | "/auth/" | "/auth/error" | "/auth/error/" | "/dashboard" | "/dashboard/" | "/dashboard/tabs" | "/dashboard/tabs/" | "/djamms-dashboard" | "/djamms-dashboard/" | "/jukebox-kiosk" | "/jukebox-kiosk/" | "/playlistlibrary" | "/playlistlibrary/" | "/queuemanager" | "/queuemanager/" | "/videoplayer" | "/videoplayer/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/demo-sync.js" | "/demo.html" | "/favicon.png" | "/icon.png" | "/window-demo.html" | string & {};
	}
}