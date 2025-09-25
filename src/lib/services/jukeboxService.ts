// V3 Jukebox Service Wrapper - Simplified for current architecture
export { JukeboxServiceV3 as JukeboxService } from './jukeboxServiceV3';
export type { QueueDocument, PlayerInstanceDocument } from './jukeboxServiceV3';

// Re-export types for compatibility  
export type { 
	JukeboxState, 
	PriorityQueueItem, 
	InMemoryPlaylistItem, 
	JukeboxConfig 
} from '../types/jukebox';
