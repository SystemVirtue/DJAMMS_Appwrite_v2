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
	preferences?: UserPreferences;
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
	category?: string;
	cover_image_url?: string;
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