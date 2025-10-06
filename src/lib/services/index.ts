// DJAMMS v3 Unified Service
export { DJAMMSService } from './djammsService-v3';
export { getDJAMMSService, getAppwriteClient, initializeDJAMMSService } from './serviceInit';

// Legacy Services (moved to .legacy files - no longer exported)
// export { JukeboxService } from './jukeboxService'; // MOVED TO LEGACY
// export { JukeboxOrchestrator } from './jukeboxOrchestrator'; // MOVED TO LEGACY
// export { BackgroundQueueManager } from './backgroundQueueManager'; // MOVED TO LEGACY
export { PlaylistService } from './playlistService';

// Enhanced Services (available but not included in main exports for now)
// These can be imported directly if needed:
// import { UserQueueService } from './userQueueService';
// import { EnhancedPlaylistService } from './enhancedPlaylistService';
// etc.