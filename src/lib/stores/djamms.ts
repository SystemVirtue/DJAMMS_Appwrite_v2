/**
 * Unified DJAMMS Store - Venue-Centric State Management
 *
 * Consolidates all application state into a single venue-focused store.
 * Replaces multiple stores with unified real-time venue management.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { client, databases, account, DATABASE_ID } from '../utils/appwrite';
import { Query, ID } from 'appwrite';
import type { Venue, User, Playlist, Track } from '../types';

// ===== TYPES =====

export interface DJAMMSState {
	// Authentication
	currentUser: User | null;
	isAuthenticated: boolean;

	// Venue Management
	currentVenue: Venue | null;
	userVenues: Venue[];
	venueSubscription: ReturnType<typeof setInterval> | null; // Polling interval ID for real-time sync

	// Player State (from venue)
	nowPlaying: Track | null;
	activeQueue: Track[];
	playerState: {
		status: 'idle' | 'playing' | 'paused' | 'stopped';
		position: number;
		volume: number;
		repeatMode: 'off' | 'one' | 'all';
		shuffleMode: boolean;
	};
	playerSettings: {
		autoPlay: boolean;
		showNotifications: boolean;
		theme: 'dark' | 'light';
		quality: 'auto' | 'low' | 'medium' | 'high';
	};

	// Playlists
	playlists: Playlist[];
	currentPlaylist: Playlist | null;

	// UI State
	isLoading: boolean;
	connectionStatus: 'connected' | 'connecting' | 'disconnected';
	lastSync: Date | null;
}

// ===== CORE STORE =====

const initialState: DJAMMSState = {
	currentUser: null,
	isAuthenticated: false,
	currentVenue: null,
	userVenues: [],
	venueSubscription: null,
	nowPlaying: null,
	activeQueue: [],
	playerState: {
		status: 'idle',
		position: 0,
		volume: 80,
		repeatMode: 'off',
		shuffleMode: false
	},
	playerSettings: {
		autoPlay: true,
		showNotifications: true,
		theme: 'dark',
		quality: 'auto'
	},
	playlists: [],
	currentPlaylist: null,
	isLoading: false,
	connectionStatus: 'disconnected',
	lastSync: null
};

// ===== Helpers: sanitize payloads & safe Appwrite operations (client-side)
function sanitizePayload(obj: any) {
	if (!obj || typeof obj !== 'object') return obj;
	try {
		const copy = JSON.parse(JSON.stringify(obj));
		// deep remove any legacy 'preferences' keys
		function deepRemovePreferences(o: any) {
			if (!o || typeof o !== 'object') return;
			if (Object.prototype.hasOwnProperty.call(o, 'preferences')) {
				delete o.preferences;
			}
			for (const k of Object.keys(o)) {
				if (o[k] && typeof o[k] === 'object') deepRemovePreferences(o[k]);
			}
		}
		deepRemovePreferences(copy);
		return copy;
	} catch (e) {
		// best-effort: remove top-level property if present
		if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'preferences')) {
			const shallow = { ...obj };
			delete shallow.preferences;
			return shallow;
		}
		return obj;
	}
}

async function safeCreateDocument(collectionId: string, documentId: string | null, payload: any) {
	const clean = sanitizePayload(payload);
	if (documentId) {
		return await databases.createDocument(DATABASE_ID, collectionId, documentId, clean);
	}
	return await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), clean);
}

	async function safeUpdateDocument(collectionId: string, documentId: string, payload: any) {
		const clean = sanitizePayload(payload);
		try {
			return await databases.updateDocument(DATABASE_ID, collectionId, documentId, clean);
		} catch (err: any) {
			// If Appwrite complains about unknown legacy attributes, try delete+recreate
			const msg = (err && (err.message || err.response)) || String(err);
			if (msg && msg.includes('Unknown attribute') && msg.includes('preferences')) {
				console.log(`Legacy 'preferences' detected in stored document for ${collectionId}/${documentId}, performing delete+recreate`);
				try {
					// Get the current document
					const currentDoc = await databases.getDocument(DATABASE_ID, collectionId, documentId);
					// Delete it
					await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
					// Recreate with merged data (preserving existing fields, updating with payload)
					const recreated = { ...currentDoc, ...clean };
					// Remove any legacy fields
					delete recreated.preferences;
					// Ensure prefs is present if it was in currentDoc
					if (currentDoc.preferences && !recreated.prefs) {
						recreated.prefs = typeof currentDoc.preferences === 'string' ? currentDoc.preferences : JSON.stringify(currentDoc.preferences);
					}
					return await databases.createDocument(DATABASE_ID, collectionId, documentId, sanitizePayload(recreated));
				} catch (recreateErr: any) {
					console.error('Failed to delete+recreate document:', recreateErr);
					throw err; // Throw original error
				}
			}
			throw err;
		}
	}function createDJAMMSStore() {
	const { subscribe, set, update } = writable<DJAMMSState>(initialState);

	// Helper: sanitize payloads to avoid sending legacy 'preferences' attribute
	function sanitizePayload(obj: any) {
		if (!obj || typeof obj !== 'object') return obj;
		try {
			const copy = JSON.parse(JSON.stringify(obj));
			if (Object.prototype.hasOwnProperty.call(copy, 'preferences')) delete copy.preferences;
			return copy;
		} catch (e) {
			if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'preferences')) {
				delete obj.preferences;
			}
			return obj;
		}
	}

	async function safeCreateDocument(collectionId: string, documentId: string | null, payload: any) {
		const clean = sanitizePayload(payload);
		if (documentId) {
			return await databases.createDocument(DATABASE_ID, collectionId, documentId, clean);
		} else {
			return await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), clean);
		}
	}

	async function safeUpdateDocument(collectionId: string, documentId: string, payload: any) {
		const clean = sanitizePayload(payload);
		return await databases.updateDocument(DATABASE_ID, collectionId, documentId, clean);
	}

	const storeMethods = {
		setUser: (user: User | null) => {
			update(state => ({
				...state,
				currentUser: user,
				isAuthenticated: !!user
			}));
		},

		setDemoUser: () => {
			const demoUser: User = {
				$id: 'demo-user',
				$collectionId: 'demo',
				$databaseId: 'demo',
				$createdAt: new Date().toISOString(),
				$updatedAt: new Date().toISOString(),
				$permissions: [],
				user_id: 'demo-user',
				email: 'demo@djamms.app',
				username: 'Demo User',
				venue_id: 'demo-venue',
				role: 'user',
				// Store prefs as stringified JSON to match collection schema
				prefs: JSON.stringify({
					theme: 'dark',
					notifications_enabled: true,
					default_volume: 75,
					auto_play: true,
					quality: 'high'
				}),
				avatar_url: undefined,
				is_active: true,
				is_developer: false,
				created_at: new Date().toISOString(),
				last_login_at: new Date().toISOString(),
				last_activity_at: new Date().toISOString()
			};

			update(state => ({
				...state,
				currentUser: demoUser,
				isAuthenticated: true
			}));
		},

		setCurrentVenue: async (venueId: string) => {
			try {
				// Load venue data and update state
				await storeMethods.refreshVenueState(venueId);

				// Subscribe to venue real-time updates
				await storeMethods.subscribeToVenue(venueId);

			} catch (error) {
				console.error('Failed to set current venue:', error);
			}
		},

		loadUserVenues: async (userId: string) => {
			try {
				const venues = await databases.listDocuments(DATABASE_ID, 'venues', [
					Query.equal('owner_id', userId)
				]);

				update(state => ({
					...state,
					userVenues: venues.documents.map((v: any) => ({
						...v,
						venue_id: v.venue_id,
						venue_name: v.venue_name,
						owner_id: v.owner_id,
						active_player_instance_id: v.active_player_instance_id,
						now_playing: v.now_playing ? JSON.parse(v.now_playing) : null,
						state: v.state as 'idle' | 'playing' | 'paused' | 'stopped',
						current_time: v.current_time,
						volume: v.volume,
						active_queue: v.active_queue ? JSON.parse(v.active_queue) : [],
						priority_queue: v.priority_queue ? JSON.parse(v.priority_queue) : [],
						player_settings: v.player_settings ? JSON.parse(v.player_settings) : initialState.playerSettings,
						is_shuffled: v.is_shuffled,
						last_heartbeat_at: v.last_heartbeat_at,
						last_updated: v.last_updated,
						created_at: v.created_at
					} as Venue))
				}));
			} catch (error) {
				console.error('Failed to load user venues:', error);
			}
		},

		subscribeToVenue: async (venueId: string) => {
			try {
				// Clear any existing subscription
				storeMethods.unsubscribeFromVenue();

				// Initial venue load
				await storeMethods.refreshVenueState(venueId);

				// Set up polling for real-time updates (every 2 seconds)
				// TODO: Replace with Appwrite Realtime when available
				const subscriptionId = setInterval(async () => {
					try {
						await storeMethods.refreshVenueState(venueId);
					} catch (error) {
						console.error('Failed to refresh venue state:', error);
						update(state => ({
							...state,
							connectionStatus: 'disconnected'
						}));
					}
				}, 2000);

				update(state => ({
					...state,
					venueSubscription: subscriptionId,
					connectionStatus: 'connected',
					lastSync: new Date()
				}));

				console.log('Venue subscription established with polling');

			} catch (error) {
				console.error('Failed to subscribe to venue:', error);
				update(state => ({
					...state,
					connectionStatus: 'disconnected'
				}));
			}
		},

		unsubscribeFromVenue: () => {
			update(state => {
				if (state.venueSubscription) {
					clearInterval(state.venueSubscription);
				}
				return {
					...state,
					venueSubscription: null,
					connectionStatus: 'disconnected'
				};
			});
		},

		refreshVenueState: async (venueId: string) => {
			try {
				const venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);
				const parsedVenue: Venue = {
					...venue,
					venue_id: venue.venue_id,
					venue_name: venue.venue_name,
					owner_id: venue.owner_id,
					active_player_instance_id: venue.active_player_instance_id,
					now_playing: venue.now_playing ? JSON.parse(venue.now_playing) : null,
					state: venue.state as 'idle' | 'playing' | 'paused' | 'stopped',
					current_time: venue.current_time,
					volume: venue.volume,
					active_queue: venue.active_queue ? JSON.parse(venue.active_queue) : [],
					priority_queue: venue.priority_queue ? JSON.parse(venue.priority_queue) : [],
					player_settings: venue.player_settings ? JSON.parse(venue.player_settings) : initialState.playerSettings,
					is_shuffled: venue.is_shuffled,
					last_heartbeat_at: venue.last_heartbeat_at,
					last_updated: venue.last_updated,
					created_at: venue.created_at
				};

				update(state => ({
					...state,
					currentVenue: parsedVenue,
					nowPlaying: parsedVenue.now_playing || null,
					activeQueue: parsedVenue.active_queue || [],
					playerSettings: {
						autoPlay: parsedVenue.player_settings?.autoPlay ?? initialState.playerSettings.autoPlay,
						showNotifications: parsedVenue.player_settings?.showNotifications ?? initialState.playerSettings.showNotifications,
						theme: parsedVenue.player_settings?.theme ?? initialState.playerSettings.theme,
						quality: parsedVenue.player_settings?.quality ?? initialState.playerSettings.quality
					},
					playerState: {
						...state.playerState,
						status: parsedVenue.state || 'idle',
						position: parsedVenue.current_time || 0,
						volume: parsedVenue.volume || 80
					},
					lastSync: new Date(),
					connectionStatus: 'connected'
				}));

			} catch (error) {
				console.error('Failed to refresh venue state:', error);
				update(state => ({
					...state,
					connectionStatus: 'disconnected'
				}));
				throw error;
			}
		},

		// Player controls
		sendCommand: async (command: string, data?: any) => {
			const state = get({ subscribe });
			if (!state.currentVenue) return;

			try {
				// Call UI Command & Sync Hub function
				const response = await fetch('/api/ui-command', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						command,
						venueId: state.currentVenue.$id,
						userId: state.currentUser?.$id,
						data
					})
				});

				if (!response.ok) {
					throw new Error('Command failed');
				}

			} catch (error) {
				console.error('Failed to send command:', error);
			}
		},

		// Playlist management
		loadPlaylists: async () => {
			try {
				const playlists = await databases.listDocuments(DATABASE_ID, 'playlists');

				update(state => ({
					...state,
					playlists: playlists.documents.map((p: any) => ({
						...p,
						playlist_id: p.playlist_id,
						name: p.name,
						description: p.description,
						owner_id: p.owner_id,
						venue_id: p.venue_id,
						is_public: p.is_public,
						is_default: p.is_default,
						is_starred: p.is_starred,
						category: p.category,
						cover_image_url: p.cover_image_url,
						tracks: p.tracks ? JSON.parse(p.tracks) : [],
						track_count: p.track_count,
						total_duration: p.total_duration,
						tags: p.tags ? JSON.parse(p.tags) : [],
						play_count: p.play_count,
						last_played_at: p.last_played_at,
						created_at: p.created_at,
						updated_at: p.updated_at,
						// Backward compatibility
						user_id: p.owner_id,
						isPublic: p.is_public,
						$createdAt: p.created_at,
						$updatedAt: p.updated_at
					} as Playlist))
				}));
			} catch (error) {
				console.error('Failed to load playlists:', error);
			}
		},

		setCurrentPlaylist: (playlist: Playlist | null) => {
			update(state => ({
				...state,
				currentPlaylist: playlist
			}));
		},

		// Authentication initialization
		initializeAuth: async () => {
			if (!browser) return;

			// Set loading state while checking authentication
			update(state => ({ ...state, isLoading: true }));

			try {
				// Get current Appwrite user
				const user = await account.get();

				// Default preferences for UI/user creation
				const defaultPreferences = {
					theme: 'dark',
					notifications_enabled: true,
					default_volume: 80,
					auto_play: false,
					language: 'en',
					timezone: 'UTC',
					min_to_tray_enabled: false,
					update_checks_enabled: true,
					telemetry_enabled: false
				};

				// Create user object for djammsStore
				const djammsUser = {
					$id: user.$id,
					$collectionId: '',
					$databaseId: '',
					$createdAt: user.$createdAt,
					$updatedAt: user.$updatedAt,
					$permissions: [],
					user_id: user.$id,
					email: user.email,
					username: user.name || user.email.split('@')[0],
					venue_id: 'default', // Always default for now
					role: 'user',
					// Ensure prefs is a string when sent to the DB
					prefs: JSON.stringify(defaultPreferences),
					avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
					is_active: true,
					is_developer: false,
					created_at: user.$createdAt,
					last_login_at: new Date().toISOString(),
					last_activity_at: new Date().toISOString()
				};

				// Setup user profile and venue in database
				await storeMethods.setupUserAndVenue(user);

				update(state => ({
					...state,
					currentUser: djammsUser,
					isAuthenticated: true,
					isLoading: false
				}));

				// Load user venues
				await storeMethods.loadUserVenues(user.$id);

			} catch (error) {
				// Handle unauthenticated users gracefully
				console.log('User not authenticated, staying in guest mode');
				update(state => ({ ...state, isLoading: false }));
			}
		},

		// Setup user profile and venue after authentication
		setupUserAndVenue: async (appwriteUser: any) => {
			try {
				const userId = appwriteUser.$id;

				// Default preferences
				const defaultPreferences = {
					theme: 'dark',
					notifications_enabled: true,
					default_volume: 80,
					auto_play: false,
					language: 'en',
					timezone: 'UTC',
					min_to_tray_enabled: false,
					update_checks_enabled: true,
					telemetry_enabled: false
				};

				// Determine role based on email
				const determineRole = (email: string) => {
					if (email === 'admin@djamms.app') return 'admin';
					if (email === 'admin@systemvirtue.com') return 'admin';  // ← Add here
					if (email === 'dev@djamms.app') return 'developer';
					return 'user';
				};

				const isDeveloper = (email: string) => email === 'dev@djamms.app';

				// Always ensure user document is clean (delete+recreate if exists)
				let userDoc;
				const userData = {
					user_id: userId,
					email: appwriteUser.email,
					username: appwriteUser.name || appwriteUser.email.split('@')[0],
					venue_id: 'default',
					role: determineRole(appwriteUser.email),
					prefs: JSON.stringify(defaultPreferences),
					avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${appwriteUser.email}`,
					is_active: true,
					is_developer: isDeveloper(appwriteUser.email),
					created_at: new Date().toISOString(),
					last_login_at: new Date().toISOString(),
					last_activity_at: new Date().toISOString()
				};

				try {
					// Try to get existing document
					const existingDoc = await databases.getDocument(DATABASE_ID, 'users', userId);
					// If it exists, delete it to ensure clean recreation
					await databases.deleteDocument(DATABASE_ID, 'users', userId);
					console.log('Deleted existing user document for recreation');
				} catch (error) {
					// Document doesn't exist, that's fine
				}

				// Create fresh user document
				console.log('Creating fresh user document:', userData);
				userDoc = await safeCreateDocument('users', userId, userData);
				console.log('Created fresh user profile:', userDoc);

				// Check if default venue exists
				let venueDoc;
				try {
					venueDoc = await databases.getDocument(DATABASE_ID, 'venues', 'default');
				} catch (error) {
					// Venue doesn't exist, create it
					const defaultVenueData = {
						venue_id: 'default',
						venue_name: 'My DJAMMS Venue',
						owner_id: userId,
						active_player_instance_id: null,
						now_playing: null,
						state: 'paused',
						current_time: 0,
						volume: 80,
						active_queue: '[]',
						priority_queue: '[]',
						player_settings: JSON.stringify({
							repeat_mode: 'none',
							shuffle_enabled: false,
							shuffle_seed: null,
							crossfade_time: 3,
							master_volume: 80,
							is_muted: false,
							eq_settings: {},
							mic_volume: 0,
							dynamic_compressor_enabled: false,
							player_size: { width: 1280, height: 720 },
							player_position: { x: 100, y: 100 },
							is_fullscreen: false,
							display_sliders: { brightness: 50, contrast: 50 }
						}),
						is_shuffled: false,
						last_heartbeat_at: null,
						last_updated: new Date().toISOString(),
						created_at: new Date().toISOString(),
						schedule_data: '{}',
						app_name: 'DJAMMS'
					};
					venueDoc = await safeCreateDocument('venues', 'default', defaultVenueData);
					console.log('Created default venue:', venueDoc);
				}

				// Create activity log entry
				const loginLogId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				try {
					await safeCreateDocument('activity_log', loginLogId, {
						log_id: loginLogId,
						user_id: userId,
						venue_id: 'default',
						event_type: 'user_login',
						event_data: JSON.stringify({
							method: 'google_oauth',
							venue_created: !venueDoc.$createdAt,
							ip_address: null, // Would need to get from request
							user_agent: navigator.userAgent,
							session_id: null // Would need session tracking
						}),
						timestamp: new Date().toISOString(),
						ip_address: null,
						user_agent: navigator.userAgent,
						session_id: null
					});
					console.log('Activity log entry created:', loginLogId);
				} catch (logError) {
					console.warn('Failed to create activity log entry:', logError);
					// Don't fail the entire setup for logging issues
				}

				console.log('User and venue setup complete');

			} catch (error: any) {
				console.error('Failed to setup user and venue:', error);
				console.error('Error details:', {
					message: error.message,
					code: error.code,
					response: error.response,
					stack: error.stack
				});
				// Continue anyway - don't block login
			}
		}
	};

	return {
		subscribe,
		update,
		...storeMethods
	};
}

// ===== EXPORT STORE INSTANCE =====

export const djammsStore = createDJAMMSStore();

// ===== DERIVED STORES =====

export const currentTrack = derived(djammsStore, ($state) => $state.nowPlaying);

export const playerControls = derived(djammsStore, ($state) => ({
	canPlay: $state.playerState.status === 'paused' || $state.playerState.status === 'idle',
	canPause: $state.playerState.status === 'playing',
	canResume: $state.playerState.status === 'paused',
	canSkip: $state.activeQueue.length > 0,
	canStop: $state.playerState.status !== 'idle'
}));

export const queueInfo = derived(djammsStore, ($state) => ({
	count: $state.activeQueue.length,
	next: $state.activeQueue[0] || null,
	isEmpty: $state.activeQueue.length === 0
}));

export const venueStatus = derived(djammsStore, ($state) => ({
	isConnected: $state.connectionStatus === 'connected',
	currentVenue: $state.currentVenue,
	lastSync: $state.lastSync
}));

export const playerStatus = derived(djammsStore, ($state) => ({
	status: $state.connectionStatus === 'connected' ? 
		`connected-local-${$state.playerState.status}` : 
		($state.connectionStatus === 'disconnected' ? 'no-connected-player' : 'server-error'),
	playerState: $state.playerState,
	isConnected: $state.connectionStatus === 'connected'
}));