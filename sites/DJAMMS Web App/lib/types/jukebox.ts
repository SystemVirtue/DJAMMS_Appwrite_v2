// Enhanced DJAMMS Jukebox Types - Appwrite Integration

export interface JukeboxState {
	$id: string;
	isPlayerRunning: boolean;
	isPlayerPaused: boolean;
	isPlaying?: boolean; // alias
	currentVideoId: string | null;
	currentlyPlaying: string | null;
	currentChannelTitle: string | null; // Artist/Channel name
	currentThumbnail: string | null; // Video thumbnail URL
	currentVideoDuration: string | null; // Duration string (e.g., "3:45")
	lastPlayedVideoId: string | null;
	playerStatus: 'ready' | 'playing' | 'paused' | 'ended' | 'loading' | 'error' | 'blocked';
	isReadyForNextSong: boolean;
	instanceId: string;
	lastUpdated: string;
	currentPosition: number;
	totalDuration: number;
	volume: number;
}

export interface PriorityQueueItem {
	$id?: string;
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnail?: string;
	duration?: string;
	timestamp: string; // For ordering - ISO string
	requestedBy?: string; // User ID who requested
	priority: number; // Higher number = higher priority
}

export interface InMemoryPlaylistItem {
	$id?: string;
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnail?: string;
	duration?: string;
	lastPlayedTimestamp?: string; // For cycling logic
	playCount: number;
	isActive: boolean; // For filtering
	shuffleOrder: number; // Pre-shuffled position
	addedToPlaylistAt: string; // When the item was added to playlist
}

export interface PlayerCommand {
	action: 'play' | 'pause' | 'stop' | 'load' | 'seek';
	videoId?: string;
	title?: string;
	channelTitle?: string;
	position?: number;
	timestamp: string;
}

export interface JukeboxConfig {
	autoPlayEnabled: boolean;
	shuffleEnabled: boolean;
	repeatMode: 'none' | 'one' | 'all';
	defaultPlaylistId: string;
	preventImmediateRepeats: boolean;
	maxQueueSize: number;
	updateInterval: number; // milliseconds
}