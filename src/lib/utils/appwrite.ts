import { Client, Account, Databases, Functions } from 'appwrite';
import { browser } from '$app/environment';

export const client = new Client();

if (browser) {
	client
		.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
		.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

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