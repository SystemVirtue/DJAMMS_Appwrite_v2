/**
 * Unified DJAMMS Store - Venue-Centric State Management
 *
 * Consolidates all application state into a single venue-focused store.
 * Replaces multiple stores with unified real-time venue management.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { client, databases, account, DATABASE_ID } from '../utils/appwrite';
import { Query } from 'appwrite';
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

function createDJAMMSStore() {
	const { subscribe, set, update } = writable<DJAMMSState>(initialState);

	const storeMethods = {
		setUser: (user: User | null) => {
			update(state => ({
				...state,
				currentUser: user,
				isAuthenticated: !!user
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
					userVenues: venues.documents.map(v => ({
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
					playlists: playlists.documents.map(p => ({
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

			try {
				update(state => ({ ...state, isLoading: true }));

				// Get current Appwrite user
				const user = await account.get();

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
					venue_id: user.prefs?.venue_id || null,
					role: 'user',
					preferences: {},
					avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
					is_active: true,
					is_developer: false,
					created_at: user.$createdAt,
					last_login_at: new Date().toISOString(),
					last_activity_at: new Date().toISOString()
				};

				update(state => ({
					...state,
					currentUser: djammsUser,
					isAuthenticated: true,
					isLoading: false
				}));

				// Load user venues
				await storeMethods.loadUserVenues(user.$id);

			} catch (error) {
				console.error('Failed to initialize auth:', error);
				update(state => ({
					...state,
					currentUser: null,
					isAuthenticated: false,
					isLoading: false
				}));
			}
		},
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