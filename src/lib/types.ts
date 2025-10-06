// ===== SIMPLIFIED ARCHITECTURE TYPES =====

// Venue Types
export interface Venue {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	venue_id: string;
	venue_name?: string;
	owner_id: string;
	active_player_instance_id?: string;
	now_playing?: Track | null;
	state?: 'idle' | 'playing' | 'paused' | 'stopped';
	current_time?: number;
	volume?: number;
	active_queue?: Track[];
	priority_queue?: Track[];
	player_settings?: PlayerSettings;
	is_shuffled?: boolean;
	last_heartbeat_at?: string;
	last_updated?: string;
	created_at: string;
}

// User Types
export interface User {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	user_id: string;
	email: string;
	username?: string;
	venue_id?: string;
	role?: string;
	// 'prefs' may be stored as a JSON string in the DB or as a parsed object in the UI
	prefs?: UserPreferences | string;
	avatar_url?: string;
	is_active?: boolean;
	is_developer?: boolean;
	created_at: string;
	last_login_at?: string;
	last_activity_at?: string;
}

// Playlist Types
export interface Playlist {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	playlist_id: string;
	name: string;
	description?: string;
	owner_id: string;
	venue_id?: string;
	is_public?: boolean;
	is_default?: boolean;
	is_starred?: boolean;
	isLiked?: boolean; // For UI state
	category?: string;
	cover_image_url?: string;
	thumbnail?: string; // Alias for cover_image_url
	tracks?: Track[];
	track_count?: number;
	total_duration?: number;
	tags?: string[];
	play_count?: number;
	last_played_at?: string;
	created_at: string;
	updated_at: string;
	// Backward compatibility properties
	user_id?: string;
	isPublic?: boolean;
	isDefault?: boolean;
	isStarred?: boolean;
	coverImage?: string;
	trackCount?: number;
	totalDuration?: number;
	updated?: string;
	created?: string;
	id?: string;
}

// Activity Log Types
export interface ActivityLog {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	log_id: string;
	user_id?: string;
	venue_id?: string;
	event_type: string;
	event_data?: any;
	timestamp: string;
	ip_address?: string;
	user_agent?: string;
	session_id?: string;
}

// Track Types
export interface Track {
	video_id: string;
	title: string;
	artist: string;
	duration: number;
	thumbnail: string;
	channelTitle?: string;
	added_at?: string;
	requested_by?: string;
	position?: number;
}

export interface PlaylistTrack {
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnail?: string;
	duration?: string;              // Duration string like "3:42"
	addedAt: string;                // ISO 8601 timestamp
	addedBy: string;                // User ID who added the track
	order: number;                  // Position in playlist
}

// Settings Types
export interface PlayerSettings {
	autoPlay?: boolean;
	showNotifications?: boolean;
	theme?: 'dark' | 'light';
	quality?: 'auto' | 'low' | 'medium' | 'high';
	volume?: number;
	shuffleMode?: boolean;
	repeatMode?: 'off' | 'one' | 'all';
}

export interface UserPreferences {
	theme?: 'dark' | 'light';
	notifications_enabled?: boolean;
	default_volume?: number;
	auto_play?: boolean;
	quality?: 'auto' | 'low' | 'medium' | 'high';
}

// ===== LEGACY TYPES (for backward compatibility) =====

// User Play History Types
export interface UserPlayHistory {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
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
	was_skipped: boolean;
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
	was_skipped: boolean;
}

// User Instance Settings Types
export interface UserInstanceSettings {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	user_id: string;
	instance_id: string;
	audio_quality: string;
	crossfade_duration: number;
	auto_play: boolean;
	volume_level: number;
	theme_preference: string;
	notification_enabled: boolean;
	last_updated: string;
}

export interface UserInstanceSettingsCreate {
	user_id: string;
	instance_id: string;
	audio_quality: string;
	crossfade_duration: number;
	auto_play: boolean;
	volume_level: number;
	theme_preference: string;
	notification_enabled: boolean;
	last_updated: string;
}

export interface UserInstanceSettingsUpdate {
	audio_quality?: string;
	crossfade_duration?: number;
	auto_play?: boolean;
	volume_level?: number;
	theme_preference?: string;
	notification_enabled?: boolean;
	last_updated?: string;
}

// Enhanced Playlist Types
export interface EnhancedPlaylist {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	user_id: string;
	name: string;
	description?: string;
	tracks: string; // JSON string of PlaylistTrack[]
	total_duration: number;
	is_public: boolean;
	play_count?: number;
	tags?: string;
	category?: string;
	is_featured?: boolean;
	created_by_admin?: boolean;
	created_at: string;
	updated_at: string;
}

export interface EnhancedPlaylistCreate {
	user_id: string;
	name: string;
	description?: string;
	tracks: string; // JSON string of PlaylistTrack[]
	total_duration: number;
	is_public: boolean;
	play_count?: number;
	tags?: string;
	category?: string;
	is_featured?: boolean;
	created_by_admin?: boolean;
	created_at: string;
	updated_at: string;
}

export interface EnhancedPlaylistUpdate {
	name?: string;
	description?: string;
	tracks?: string; // JSON string of PlaylistTrack[]
	total_duration?: number;
	is_public?: boolean;
	play_count?: number;
	tags?: string;
	category?: string;
	is_featured?: boolean;
	created_by_admin?: boolean;
	updated_at?: string;
}

export interface ParsedEnhancedPlaylist extends Omit<EnhancedPlaylist, 'tracks'> {
	tracks: Track[]; // Parsed tracks array
}

// User Playlist Favorites Types
export interface UserPlaylistFavorites {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	user_id: string;
	playlist_id: string;
	is_favorite: boolean;
	added_at: string;
	last_accessed: string;
	personal_rating?: number;
	custom_tags?: string;
}

export interface UserPlaylistFavoritesCreate {
	user_id: string;
	playlist_id: string;
	is_favorite: boolean;
	added_at: string;
	last_accessed: string;
	personal_rating?: number;
	custom_tags?: string;
}

export interface UserPlaylistFavoritesUpdate {
	is_favorite?: boolean;
	last_accessed?: string;
	personal_rating?: number;
	custom_tags?: string;
}

// User Queue Types
export interface UserQueue {
	$id: string;
	$collectionId: string;
	$databaseId: string;
	$createdAt: string;
	$updatedAt: string;
	$permissions: string[];
	user_id: string;
	instance_id: string;
	queue_tracks: string; // JSON string of PlaylistTrack[]
	current_index: number;
	repeat_mode: RepeatMode;
	shuffle_enabled: boolean;
	created_at: string;
	updated_at: string;
	last_updated?: string;
}

export interface UserQueueCreate {
	user_id: string;
	instance_id: string;
	queue_tracks: string; // JSON string of PlaylistTrack[]
	current_index: number;
	repeat_mode: RepeatMode;
	shuffle_enabled: boolean;
	created_at: string;
	updated_at: string;
	last_updated?: string;
}

export interface UserQueueUpdate {
	queue_tracks?: string; // JSON string of PlaylistTrack[]
	current_index?: number;
	repeat_mode?: RepeatMode;
	shuffle_enabled?: boolean;
	updated_at?: string;
	last_updated?: string;
}

export interface ParsedUserQueue extends Omit<UserQueue, 'queue_tracks'> {
	queue_tracks: Track[]; // Parsed tracks array
}

// Repeat Mode Type
export type RepeatMode = 'off' | 'one' | 'all';