// DJAMMS v3 Unified Service
export { DJAMMSService } from './djammsService-v3';
export { getDJAMMSService, getAppwriteClient, initializeDJAMMSService } from './serviceInit';

// Legacy Services (kept for backwards compatibility during transition)
export { JukeboxService } from './jukeboxService';
export { JukeboxOrchestrator } from './jukeboxOrchestrator';
export { BackgroundQueueManager } from './backgroundQueueManager';
export { PlaylistService } from './playlistService';

// Enhanced Services (available but not included in main exports for now)
// These can be imported directly if needed:
// import { UserQueueService } from './userQueueService';
// import { EnhancedPlaylistService } from './enhancedPlaylistService';
// etc.