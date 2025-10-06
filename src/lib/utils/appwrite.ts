import { Client, Account, Databases, Functions } from 'appwrite';
import { browser } from '$app/environment';

export const client = new Client();

if (browser) {
	client
		.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
		.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');
}

export const account = new Account(client);
// Create the raw Databases instance from the SDK
const rawDatabases = new Databases(client);
export const functions = new Functions(client);

// Helper: deep-remove legacy `preferences` keys from payloads (in-place on a clone)
function deepRemovePreferences(obj: any) {
	if (!obj || typeof obj !== 'object') return obj;
	try {
		const copy = JSON.parse(JSON.stringify(obj));
		(function recurse(o: any) {
			if (!o || typeof o !== 'object') return;
			if (Object.prototype.hasOwnProperty.call(o, 'preferences')) {
				delete o.preferences;
			}
			for (const k of Object.keys(o)) {
				if (o[k] && typeof o[k] === 'object') recurse(o[k]);
			}
		})(copy);
		return copy;
	} catch (e) {
		// Fallback: shallow copy without top-level `preferences`
		if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'preferences')) {
			const shallow = { ...obj };
			delete shallow.preferences;
			return shallow;
		}
		return obj;
	}
}

// Export a proxied `databases` object that automatically sanitizes create/update payloads.
// This prevents any runtime code importing `databases` from accidentally sending legacy `preferences`.
export const databases: any = new Proxy(rawDatabases, {
	get(target, prop: string | symbol, receiver) {
		// Intercept createDocument and updateDocument to sanitize the payload argument (usually arg index 3)
		if (prop === 'createDocument' || prop === 'updateDocument') {
			const orig = (target as any)[prop];
			return function (...args: any[]) {
				// Appwrite SDK signatures: (databaseId, collectionId, documentId, data, ...)
				if (args.length >= 4 && args[3] && typeof args[3] === 'object') {
					args[3] = deepRemovePreferences(args[3]);
				}
				return orig.apply(target, args);
			};
		}
		// Sanitize returned document(s) for reads
		if (prop === 'getDocument') {
			const orig = (target as any)[prop];
			return async function (...args: any[]) {
				const res = await orig.apply(target, args);
				try {
					return deepRemovePreferences(res);
				} catch (e) {
					return res;
				}
			};
		}
		if (prop === 'listDocuments' || prop === 'list') {
			const orig = (target as any)[prop];
			return async function (...args: any[]) {
				const res = await orig.apply(target, args);
				try {
					if (res && Array.isArray(res.documents)) {
						res.documents = res.documents.map((d: any) => deepRemovePreferences(d));
					}
					return res;
				} catch (e) {
					return res;
				}
			};
		}
		// Default: return the original property (bound if function)
		const value = (target as any)[prop as any];
		if (typeof value === 'function') return value.bind(target);
		return value;
	}
});

// Realtime will be imported where needed to avoid version conflicts
// export const realtime = new Realtime(client);

// Database and Collection IDs
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
export const COLLECTIONS = {
	// V3 Simplified Schema - Current Collections
	PLAYER_INSTANCES: 'player_instances',
	ACTIVE_QUEUES: 'active_queues',
	PLAYLISTS: 'playlists',
	DJAMMS_USERS: 'djamms_users',
	USER_ACTIVITY: 'user_activity',
	
	// Legacy collection names (deprecated)
	MEDIA_INSTANCES: 'media_instances',
	INSTANCE_STATES: 'instance_states',
	USER_QUEUES: 'user_queues',
	USER_INSTANCE_SETTINGS: 'user_instance_settings',
	ENHANCED_PLAYLISTS: 'enhanced_playlists',
	USER_PLAY_HISTORY: 'user_play_history',
	USER_PLAYLIST_FAVORITES: 'user_playlist_favorites',
	JUKEBOX_STATE: 'jukebox_state',
	PRIORITY_QUEUE: 'priority_queue',
	MEMORY_PLAYLIST: 'memory_playlist'
} as const;