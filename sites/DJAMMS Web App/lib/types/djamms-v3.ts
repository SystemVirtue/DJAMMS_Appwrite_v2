/**
 * DJAMMS Simplified Schema v3.0.0 - TypeScript Interfaces
 * 
 * This file contains all TypeScript interfaces for the simplified DJAMMS database schema.
 * Replaces all previous individual type files with unified, consolidated types.
 */

// ===== CORE USER & AUTHENTICATION =====

export interface DJAMMSUser {
  $id: string;                    // User ID from Appwrite Auth
  email: string;
  name: string;
  avatar?: string;
  venue_id?: string;              // Venue identifier for user association
  devApproved: boolean;           // Developer approval for player access
  userRole: 'user' | 'admin' | 'developer';
  isActive: boolean;
  createdAt: string;              // ISO 8601 timestamp
  lastLoginAt?: string;           // ISO 8601 timestamp
}

// ===== UNIFIED INSTANCE MANAGEMENT =====

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentVideoId: string | null;
  currentTitle: string | null;
  currentChannelTitle: string | null;
  currentThumbnail: string | null;
  currentPosition: number;        // Current playback position in seconds
  totalDuration: number;          // Total duration in seconds
  volume: number;                 // Volume level 0-100
  playerStatus: 'ready' | 'playing' | 'paused' | 'ended' | 'loading' | 'error' | 'blocked';
}

export interface InstanceSettings {
  autoplay: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  defaultVolume: number;
  showNotifications: boolean;
  darkMode: boolean;
  kioskMode?: boolean;            // For kiosk instances
}

export interface PlayerInstance {
  $id: string;
  userId: string;                 // Links to DJAMMSUser.$id
  instanceId: string;             // Unique player identifier (play-{userId}-{timestamp})
  instanceType: 'player' | 'kiosk';
  isActive: boolean;
  
  // Player State (stored as JSON string in database)
  playerState: string | PlayerState;
  
  // Instance Settings (stored as JSON string in database)
  settings: string | InstanceSettings;
  
  // Timestamps
  createdAt: string;              // ISO 8601 timestamp
  lastActiveAt: string;           // ISO 8601 timestamp
  lastUpdated: string;            // ISO 8601 timestamp
}

// ===== UNIFIED PLAYLIST SYSTEM =====

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

export interface Playlist {
  $id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  
  // Access Control
  ownerId: string;                // User who created it
  visibility: 'private' | 'public' | 'system';  // 'system' = global playlists
  
  // Playlist Data (stored as JSON string in database)
  tracks: string | PlaylistTrack[];
  trackCount: number;
  totalDuration: number;          // Total duration in seconds
  
  // Metadata (stored as JSON string in database)
  tags?: string | string[];
  category: 'user' | 'curated' | 'generated' | 'default';
  isDefault: boolean;             // For global default playlist
  
  // Timestamps
  createdAt: string;              // ISO 8601 timestamp
  updatedAt: string;              // ISO 8601 timestamp
}

// ===== ACTIVE QUEUE MANAGEMENT =====

export interface QueueTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  playCount: number;
  lastPlayedAt?: string;          // ISO 8601 timestamp
  shuffleOrder: number;
  isActive: boolean;
}

export interface PriorityQueueItem {
  $id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  requestedBy: string;            // User ID who requested
  priority: number;               // Lower = higher priority
  timestamp: string;              // ISO 8601 timestamp
}

export interface ActiveQueue {
  $id: string;
  instanceId: string;             // Links to PlayerInstance.instanceId
  
  // Current Playlist Context
  sourcePlaylistId: string;       // Which playlist is currently loaded
  
  // Memory Playlist (stored as JSON string in database)
  memoryPlaylist: string | QueueTrack[];
  currentTrackIndex: number;
  
  // Priority Queue (stored as JSON string in database)
  priorityQueue: string | PriorityQueueItem[];
  
  // Queue Settings
  isShuffled: boolean;
  shuffleSeed: number;
  
  // Timestamps
  lastUpdated: string;            // ISO 8601 timestamp
}

// ===== USER DATA & HISTORY =====

export interface PlayHistoryMetadata {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;               // How long they listened in seconds
  completionRate: number;         // Percentage played (0-100)
}

export interface FavoriteMetadata {
  referenceId: string;            // videoId, playlistId, or channelId
  referenceType: 'track' | 'playlist' | 'channel';
  title: string;
  thumbnail?: string;
}

export interface RequestMetadata {
  videoId: string;
  title: string;
  channelTitle: string;
  requestMessage?: string;
  priority?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface UserActivity {
  $id: string;
  userId: string;
  activityType: 'play_history' | 'favorite' | 'request';
  referenceId: string;            // videoId, playlistId, etc.
  
  // Activity Details (stored as JSON string in database)
  metadata: string | PlayHistoryMetadata | FavoriteMetadata | RequestMetadata;
  
  timestamp: string;              // ISO 8601 timestamp
}

// ===== UTILITY TYPES FOR SERVICES =====

export interface DatabaseCollections {
  DJAMMS_USERS: 'djamms_users';
  PLAYER_INSTANCES: 'player_instances';
  PLAYLISTS: 'playlists';
  ACTIVE_QUEUES: 'active_queues';
  USER_ACTIVITY: 'user_activity';
}

export const COLLECTIONS: DatabaseCollections = {
  DJAMMS_USERS: 'djamms_users',
  PLAYER_INSTANCES: 'player_instances',
  PLAYLISTS: 'playlists',
  ACTIVE_QUEUES: 'active_queues',
  USER_ACTIVITY: 'user_activity'
};

// ===== API RESPONSE TYPES =====

export interface CreateUserRequest {
  email: string;
  name: string;
  avatar?: string;
  userRole?: 'user' | 'admin' | 'developer';
}

export interface CreatePlayerInstanceRequest {
  userId: string;
  instanceType?: 'player' | 'kiosk';
  settings?: Partial<InstanceSettings>;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
  tracks?: PlaylistTrack[];
  tags?: string[];
  category?: 'user' | 'curated' | 'generated';
}

export interface UpdatePlayerStateRequest {
  isPlaying?: boolean;
  isPaused?: boolean;
  currentVideoId?: string | null;
  currentTitle?: string | null;
  currentChannelTitle?: string | null;
  currentThumbnail?: string | null;
  currentPosition?: number;
  totalDuration?: number;
  volume?: number;
  playerStatus?: PlayerState['playerStatus'];
}

export interface AddToQueueRequest {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  priority?: number;
}

// ===== ERROR TYPES =====

export interface DJAMMSError {
  code: string;
  message: string;
  details?: any;
  too_many_failed_requests?: boolean;
}

// ===== MIGRATION TYPES =====

export interface MigrationReport {
  migrationId: string;
  startTime: string;
  endTime: string;
  duration: string;
  collections: {
    deleted: number;
    created: number;
  };
  log: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  newSchema: {
    collections: string[];
    description: string;
  };
}

// ===== LEGACY COMPATIBILITY TYPES (for migration) =====

// These types maintain compatibility during transition period
export interface LegacyJukeboxState {
  $id?: string;
  isPlayerRunning: boolean;
  isPlayerPaused: boolean;
  currentVideoId: string | null;
  currentlyPlaying: string | null;
  currentChannelTitle: string | null;
  currentThumbnail: string | null;
  currentVideoDuration: string | null;
  lastPlayedVideoId: string | null;
  playerStatus: string;
  isReadyForNextSong: boolean;
  instanceId: string;
  userId?: string;
  lastUpdated: string;
  currentPosition: number;
  totalDuration: number;
  volume: number;
}

export interface LegacyInMemoryPlaylistItem {
  $id?: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  isActive: boolean;
  shuffleOrder: number;
  playCount: number;
  lastPlayedTimestamp?: string;
  addedToPlaylistAt: string;
}

export interface LegacyPriorityQueueItem {
  $id?: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  timestamp: string;
  priority?: number;
}

// All types are already exported above with their interface declarations