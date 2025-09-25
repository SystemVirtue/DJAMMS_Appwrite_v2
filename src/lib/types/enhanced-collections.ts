// Enhanced Collection Interfaces for DJAMMS Database
import type { PlaylistTrack } from '../types.js';

export type RepeatMode = 'none' | 'one' | 'all';
export type AudioQuality = 'auto' | 'high' | 'medium' | 'low';

// User Queue Management
export interface UserQueue {
	$id: string;
	$permissions?: string[];
	user_id: string;
	instance_id: string;
	queue_tracks: string; // JSON string containing PlaylistTrack[]
	current_index: number;
	shuffle_enabled?: boolean;
	repeat_mode?: RepeatMode;
	last_updated: string;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface UserQueueCreate {
	user_id: string;
	instance_id: string;
	queue_tracks: string; // JSON string containing PlaylistTrack[]
	current_index: number;
	shuffle_enabled?: boolean;
	repeat_mode?: RepeatMode;
	last_updated: string;
}

export interface UserQueueUpdate {
	queue_tracks?: string;
	current_index?: number;
	shuffle_enabled?: boolean;
	repeat_mode?: RepeatMode;
	last_updated: string;
}

// User Instance Settings
export interface UserInstanceSettings {
	$id: string;
	$permissions?: string[];
	user_id: string;
	instance_id: string;
	audio_quality?: AudioQuality;
	crossfade_duration?: number; // 0-10 seconds
	auto_play?: boolean;
	volume_level?: number; // 0-100
	theme_preference?: string;
	notification_enabled?: boolean;
	last_updated: string;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface UserInstanceSettingsCreate {
	user_id: string;
	instance_id: string;
	audio_quality?: AudioQuality;
	crossfade_duration?: number;
	auto_play?: boolean;
	volume_level?: number;
	theme_preference?: string;
	notification_enabled?: boolean;
	last_updated: string;
}

export interface UserInstanceSettingsUpdate {
	audio_quality?: AudioQuality;
	crossfade_duration?: number;
	auto_play?: boolean;
	volume_level?: number;
	theme_preference?: string;
	notification_enabled?: boolean;
	last_updated: string;
}

// Enhanced Playlists
export interface EnhancedPlaylist {
	$id: string;
	$permissions?: string[];
	user_id: string;
	name: string;
	description?: string;
	tracks: string; // JSON string containing PlaylistTrack[]
	tags?: string;
	category?: string;
	is_public?: boolean;
	is_featured?: boolean;
	created_by_admin?: boolean;
	play_count?: number;
	total_duration?: number; // in seconds
	created_at: string;
	updated_at: string;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface EnhancedPlaylistCreate {
	user_id: string;
	name: string;
	description?: string;
	tracks: string;
	tags?: string;
	category?: string;
	is_public?: boolean;
	is_featured?: boolean;
	created_by_admin?: boolean;
	play_count?: number;
	total_duration?: number;
	created_at: string;
	updated_at: string;
}

export interface EnhancedPlaylistUpdate {
	name?: string;
	description?: string;
	tracks?: string;
	tags?: string;
	category?: string;
	is_public?: boolean;
	is_featured?: boolean;
	created_by_admin?: boolean;
	play_count?: number;
	total_duration?: number;
	updated_at: string;
}

// User Play History
export interface UserPlayHistory {
	$id: string;
	$permissions?: string[];
	user_id: string;
	instance_id: string;
	track_id: string;
	playlist_id?: string;
	track_title: string;
	track_artist: string;
	track_duration: number; // in seconds
	played_duration: number; // in seconds
	completion_percentage: number; // 0-100
	played_at: string;
	session_id?: string;
	was_skipped?: boolean;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface UserPlayHistoryCreate {
	user_id: string;
	instance_id: string;
	track_id: string;
	playlist_id?: string;
	track_title: string;
	track_artist: string;
	track_duration: number;
	played_duration: number;
	completion_percentage: number;
	played_at: string;
	session_id?: string;
	was_skipped?: boolean;
}

// User Playlist Favorites
export interface UserPlaylistFavorites {
	$id: string;
	$permissions?: string[];
	user_id: string;
	playlist_id: string;
	is_favorite?: boolean;
	personal_rating?: number; // 1-5 stars
	custom_tags?: string;
	added_at: string;
	last_accessed?: string;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface UserPlaylistFavoritesCreate {
	user_id: string;
	playlist_id: string;
	is_favorite?: boolean;
	personal_rating?: number;
	custom_tags?: string;
	added_at: string;
	last_accessed?: string;
}

export interface UserPlaylistFavoritesUpdate {
	is_favorite?: boolean;
	personal_rating?: number;
	custom_tags?: string;
	last_accessed?: string;
}

// Helper interfaces for parsed data
export interface ParsedUserQueue extends Omit<UserQueue, 'queue_tracks'> {
	queue_tracks: PlaylistTrack[];
}

export interface ParsedEnhancedPlaylist extends Omit<EnhancedPlaylist, 'tracks'> {
	tracks: PlaylistTrack[];
}

// Analytics and aggregation interfaces
export interface PlaylistAnalytics {
	playlist_id: string;
	total_plays: number;
	total_duration_played: number;
	average_completion_rate: number;
	unique_listeners: number;
	popular_tracks: {
		track_id: string;
		title: string;
		artist: string;
		play_count: number;
	}[];
	last_updated: string;
}

export interface UserListeningStats {
	user_id: string;
	total_listening_time: number;
	tracks_played: number;
	tracks_completed: number;
	favorite_artists: string[];
	favorite_genres: string[];
	listening_streaks: number;
	most_active_times: string[];
}

// Collection identifiers
export const ENHANCED_COLLECTIONS = {
	USER_QUEUES: 'user_queues',
	USER_INSTANCE_SETTINGS: 'user_instance_settings',  
	ENHANCED_PLAYLISTS: 'enhanced_playlists',
	USER_PLAY_HISTORY: 'user_play_history',
	USER_PLAYLIST_FAVORITES: 'user_playlist_favorites'
} as const;