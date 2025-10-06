import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * Player & Venue State Manager - Appwrite Function
 *
 * The most critical function for real-time player state management.
 * Handles all player-initiated events and maintains venue state.
 *
 * Triggers: Manual API calls from the video player on significant events
 * (state changes, heartbeats, API operation acknowledgments)
 *
 * Responsibilities:
 * - State Updates: Process player events and update venues collection
 * - Heartbeat Handling: Update timestamps and manage player_instances
 * - Queue Management: Handle queue progression and priority queue
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  try {
    log('🎵 Player & Venue State Manager started');

    // Parse request body
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      log(`📦 Received payload: ${JSON.stringify(payload)}`);
    } catch (parseError) {
      error(`❌ Failed to parse request payload: ${parseError.message}`);
      return res.json({ success: false, error: 'Invalid payload format' }, 400);
    }

    // Extract required parameters
    const { venueId, eventType, eventData, playerInstanceId } = payload;

    if (!venueId || !eventType) {
      error('❌ Missing required parameters: venueId and eventType');
      return res.json({ success: false, error: 'Missing venueId or eventType' }, 400);
    }

    log(`� Processing ${eventType} event for venue: ${venueId}`);

    // Get current venue state
    let venue;
    try {
      venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);
      log(`✅ Retrieved venue: ${venueId}`);
    } catch (venueError) {
      error(`❌ Venue not found: ${venueId} - ${venueError.message}`);
      return res.json({ success: false, error: 'Venue not found' }, 404);
    }

    // Process event based on type
    switch (eventType) {
      case 'heartbeat':
        await handleHeartbeat(databases, DATABASE_ID, venueId, eventData, playerInstanceId, log);
        break;

      case 'stateChange':
        await handleStateChange(databases, DATABASE_ID, venue, eventData, log);
        break;

      case 'videoEnded':
        await handleVideoEnded(databases, DATABASE_ID, venue, eventData, log);
        break;

      case 'playerReady':
        await handlePlayerReady(databases, DATABASE_ID, venue, eventData, log);
        break;

      case 'error':
        await handlePlayerError(databases, DATABASE_ID, venue, eventData, log);
        break;

      default:
        log(`⚠️ Unknown event type: ${eventType}`);
        return res.json({ success: false, error: `Unknown event type: ${eventType}` }, 400);
    }

    // Log activity
    try {
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        venue_id: venueId,
        event_type: 'player_event',
        event_data: JSON.stringify({
          eventType,
          eventData,
          playerInstanceId,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date().toISOString()
      });
    } catch (activityError) {
      log(`⚠️ Failed to log activity: ${activityError.message}`);
    }

    log(`✅ ${eventType} event processed successfully for venue: ${venueId}`);
    return res.json({
      success: true,
      message: `${eventType} event processed`,
      timestamp: new Date().toISOString()
    });

  } catch (globalError) {
    error(`💥 Global error in Player & Venue State Manager: ${globalError.message}`);
    error(`Stack trace: ${globalError.stack}`);

    return res.json({
      success: false,
      error: 'Internal server error during state management',
      details: process.env.NODE_ENV === 'development' ? globalError.message : undefined
    }, 500);
  }
};

/**
 * Handle player heartbeat - update timestamps and manage player instances
 */
async function handleHeartbeat(databases, databaseId, venueId, eventData, playerInstanceId, log) {
  const now = new Date().toISOString();

  try {
    // Update venue heartbeat
    await databases.updateDocument(databaseId, 'venues', venueId, {
      last_heartbeat_at: now,
      heartbeat_count: (eventData?.heartbeatCount || 0) + 1
    });

    // Manage player instance
    if (playerInstanceId) {
      try {
        // Try to update existing instance
        await databases.updateDocument(databaseId, 'player_instances', playerInstanceId, {
          last_heartbeat_at: now,
          is_connected: true,
          heartbeat_count: (eventData?.heartbeatCount || 0) + 1
        });
        log(`💓 Updated existing player instance: ${playerInstanceId}`);
      } catch (instanceError) {
        // Create new instance if it doesn't exist
        const newInstance = await databases.createDocument(databaseId, 'player_instances', ID.unique(), {
          venue_id: venueId,
          instance_id: playerInstanceId,
          is_connected: true,
          last_heartbeat_at: now,
          heartbeat_count: 1,
          created_at: now,
          player_info: JSON.stringify(eventData?.playerInfo || {}),
          connection_info: JSON.stringify(eventData?.connectionInfo || {})
        });
        log(`� Created new player instance: ${newInstance.$id}`);
      }
    }

    log(`💓 Heartbeat processed for venue: ${venueId}`);
  } catch (err) {
    log(`❌ Failed to process heartbeat: ${err.message}`);
    throw err;
  }
}

/**
 * Handle player state change - update now_playing and player_settings
 */
async function handleStateChange(databases, databaseId, venue, eventData, log) {
  try {
    const currentNowPlaying = venue.now_playing ? JSON.parse(venue.now_playing) : {};
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    // Update now_playing state
    const updatedNowPlaying = {
      ...currentNowPlaying,
      ...eventData.nowPlaying,
      last_updated: new Date().toISOString()
    };

    // Update player settings
    const updatedSettings = {
      ...currentSettings,
      ...eventData.playerSettings,
      last_updated: new Date().toISOString()
    };

    // Update venue document
    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      player_settings: JSON.stringify(updatedSettings),
      last_state_update: new Date().toISOString()
    });

    log(`🔄 State updated for venue: ${venue.$id}`);
  } catch (err) {
    log(`❌ Failed to update state: ${err.message}`);
    throw err;
  }
}

/**
 * Handle video ended - advance queue and update now_playing
 */
async function handleVideoEnded(databases, databaseId, venue, eventData, log) {
  try {
    const activeQueue = venue.active_queue ? JSON.parse(venue.active_queue) : [];
    const priorityQueue = venue.priority_queue ? JSON.parse(venue.priority_queue) : [];

    let nextTrack = null;
    let updatedQueue = [...activeQueue];
    let updatedPriorityQueue = [...priorityQueue];

    // First check priority queue
    if (priorityQueue.length > 0) {
      nextTrack = priorityQueue.shift();
      updatedPriorityQueue = priorityQueue;
      log(`⭐ Playing from priority queue: ${nextTrack?.title || 'Unknown'}`);
    }
    // Then check regular queue
    else if (activeQueue.length > 0) {
      nextTrack = activeQueue.shift();
      updatedQueue = activeQueue;
      log(`▶️ Playing next from queue: ${nextTrack?.title || 'Unknown'}`);
    }

    // Update venue with next track and updated queues
    const updatedNowPlaying = nextTrack ? {
      video_id: nextTrack.video_id,
      title: nextTrack.title,
      channel_title: nextTrack.channel_title,
      thumbnail: nextTrack.thumbnail,
      duration: nextTrack.duration,
      is_playing: true,
      current_time: 0,
      last_updated: new Date().toISOString()
    } : {
      video_id: null,
      title: null,
      channel_title: null,
      thumbnail: null,
      duration: 0,
      is_playing: false,
      current_time: 0,
      last_updated: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      active_queue: JSON.stringify(updatedQueue),
      priority_queue: JSON.stringify(updatedPriorityQueue),
      current_track_index: nextTrack ? 0 : -1,
      last_queue_update: new Date().toISOString()
    });

    log(`⏭️ Queue advanced for venue: ${venue.$id}`);
  } catch (err) {
    log(`❌ Failed to advance queue: ${err.message}`);
    throw err;
  }
}

/**
 * Handle player ready event
 */
async function handlePlayerReady(databases, databaseId, venue, eventData, log) {
  try {
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedSettings = {
      ...currentSettings,
      player_ready: true,
      player_info: eventData?.playerInfo || {},
      last_ready_at: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_state_update: new Date().toISOString()
    });

    log(`🎬 Player ready for venue: ${venue.$id}`);
  } catch (err) {
    log(`❌ Failed to handle player ready: ${err.message}`);
    throw err;
  }
}

/**
 * Handle player error
 */
async function handlePlayerError(databases, databaseId, venue, eventData, log) {
  try {
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedSettings = {
      ...currentSettings,
      last_error: eventData?.error || 'Unknown player error',
      error_timestamp: new Date().toISOString(),
      player_ready: false
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_state_update: new Date().toISOString()
    });

    log(`❌ Player error logged for venue: ${venue.$id} - ${eventData?.error}`);
  } catch (err) {
    log(`❌ Failed to handle player error: ${err.message}`);
    throw err;
  }
}