import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * UI Command & Sync Hub - Appwrite Function
 *
 * Bridge between UI Admin Console and player state.
 * Processes user actions and pushes updates to all clients.
 *
 * Triggers: Manual API calls from the UI Admin Console
 *
 * Responsibilities:
 * - Command Processing: Handle UI commands (play, pause, skip, mute, shuffle)
 * - Client Synchronization: Update venues collection and broadcast changes
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
    log('🎛️ UI Command & Sync Hub started');

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
    const { command, venueId, userId, ...commandData } = payload;

    if (!command || !venueId) {
      error('❌ Missing required parameters: command and venueId');
      return res.json({ success: false, error: 'Missing command or venueId' }, 400);
    }

    log(`🎯 Processing ${command} command for venue: ${venueId}`);

    // Validate venue access
    let venue;
    try {
      venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);
      log(`✅ Venue access validated: ${venueId}`);
    } catch (venueError) {
      error(`❌ Venue not found or access denied: ${venueId}`);
      return res.json({ success: false, error: 'Venue not found or access denied' }, 404);
    }

    // Process command based on type
    let result;
    switch (command) {
      case 'play':
        result = await handlePlayCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'pause':
        result = await handlePauseCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'skip':
        result = await handleSkipCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'previous':
        result = await handlePreviousCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'seek':
        result = await handleSeekCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'mute':
        result = await handleMuteCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'volume':
        result = await handleVolumeCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'shuffle':
        result = await handleShuffleCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'repeat':
        result = await handleRepeatCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'loadPlaylist':
        result = await handleLoadPlaylistCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'addToQueue':
        result = await handleAddToQueueCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'removeFromQueue':
        result = await handleRemoveFromQueueCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      case 'clearQueue':
        result = await handleClearQueueCommand(databases, DATABASE_ID, venue, commandData, log);
        break;

      default:
        log(`⚠️ Unknown command: ${command}`);
        return res.json({ success: false, error: `Unknown command: ${command}` }, 400);
    }

    // Log command activity
    try {
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        venue_id: venueId,
        user_id: userId,
        event_type: 'ui_command',
        event_data: JSON.stringify({
          command,
          result: result?.success ? 'success' : 'failed',
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date().toISOString()
      });
    } catch (activityError) {
      log(`⚠️ Failed to log command activity: ${activityError.message}`);
    }

    log(`✅ ${command} command processed successfully for venue: ${venueId}`);
    return res.json({
      success: true,
      message: `${command} command executed`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (globalError) {
    error(`💥 Global error in UI Command & Sync Hub: ${globalError.message}`);
    error(`Stack trace: ${globalError.stack}`);

    return res.json({
      success: false,
      error: 'Internal server error during command processing',
      details: process.env.NODE_ENV === 'development' ? globalError.message : undefined
    }, 500);
  }
};

/**
 * Handle play command
 */
async function handlePlayCommand(databases, databaseId, venue, commandData, log) {
  try {
    const currentNowPlaying = venue.now_playing ? JSON.parse(venue.now_playing) : {};
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedNowPlaying = {
      ...currentNowPlaying,
      is_playing: true,
      last_updated: new Date().toISOString()
    };

    const updatedSettings = {
      ...currentSettings,
      last_command: 'play',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`▶️ Play command executed for venue: ${venue.$id}`);
    return { command: 'play', isPlaying: true };
  } catch (err) {
    log(`❌ Failed to execute play command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle pause command
 */
async function handlePauseCommand(databases, databaseId, venue, commandData, log) {
  try {
    const currentNowPlaying = venue.now_playing ? JSON.parse(venue.now_playing) : {};
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedNowPlaying = {
      ...currentNowPlaying,
      is_playing: false,
      last_updated: new Date().toISOString()
    };

    const updatedSettings = {
      ...currentSettings,
      last_command: 'pause',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`⏸️ Pause command executed for venue: ${venue.$id}`);
    return { command: 'pause', isPlaying: false };
  } catch (err) {
    log(`❌ Failed to execute pause command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle skip command
 */
async function handleSkipCommand(databases, databaseId, venue, commandData, log) {
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
      log(`⭐ Skipping to priority queue track: ${nextTrack?.title || 'Unknown'}`);
    }
    // Then check regular queue
    else if (activeQueue.length > 0) {
      nextTrack = activeQueue.shift();
      updatedQueue = activeQueue;
      log(`⏭️ Skipping to next track: ${nextTrack?.title || 'Unknown'}`);
    }

    // Update venue with next track
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

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const updatedSettings = {
      ...currentSettings,
      last_command: 'skip',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      active_queue: JSON.stringify(updatedQueue),
      priority_queue: JSON.stringify(updatedPriorityQueue),
      current_track_index: nextTrack ? 0 : -1,
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString(),
      last_queue_update: new Date().toISOString()
    });

    log(`⏭️ Skip command executed for venue: ${venue.$id}`);
    return { command: 'skip', nextTrack: nextTrack?.title || null };
  } catch (err) {
    log(`❌ Failed to execute skip command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle previous command
 */
async function handlePreviousCommand(databases, databaseId, venue, commandData, log) {
  try {
    const currentNowPlaying = venue.now_playing ? JSON.parse(venue.now_playing) : {};
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    // For now, just restart current track. Could be enhanced to go to previous track
    const updatedNowPlaying = {
      ...currentNowPlaying,
      current_time: 0,
      is_playing: true,
      last_updated: new Date().toISOString()
    };

    const updatedSettings = {
      ...currentSettings,
      last_command: 'previous',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`⏮️ Previous command executed for venue: ${venue.$id}`);
    return { command: 'previous', currentTime: 0 };
  } catch (err) {
    log(`❌ Failed to execute previous command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle seek command
 */
async function handleSeekCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { time } = commandData;

    if (time === undefined || time < 0) {
      throw new Error('Valid seek time is required');
    }

    const currentNowPlaying = venue.now_playing ? JSON.parse(venue.now_playing) : {};
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedNowPlaying = {
      ...currentNowPlaying,
      current_time: time,
      last_updated: new Date().toISOString()
    };

    const updatedSettings = {
      ...currentSettings,
      last_command: 'seek',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      now_playing: JSON.stringify(updatedNowPlaying),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`⏱️ Seek command executed for venue: ${venue.$id} to ${time}s`);
    return { command: 'seek', seekTime: time };
  } catch (err) {
    log(`❌ Failed to execute seek command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle mute command
 */
async function handleMuteCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { muted } = commandData;
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedSettings = {
      ...currentSettings,
      muted: muted !== undefined ? muted : !currentSettings.muted,
      last_command: 'mute',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`${muted ? '🔇' : '🔊'} Mute command executed for venue: ${venue.$id}`);
    return { command: 'mute', muted: updatedSettings.muted };
  } catch (err) {
    log(`❌ Failed to execute mute command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle volume command
 */
async function handleVolumeCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { volume } = commandData;

    if (volume === undefined || volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0 and 100');
    }

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedSettings = {
      ...currentSettings,
      volume: volume,
      last_command: 'volume',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`🔊 Volume command executed for venue: ${venue.$id} to ${volume}%`);
    return { command: 'volume', volume };
  } catch (err) {
    log(`❌ Failed to execute volume command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle shuffle command
 */
async function handleShuffleCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { enabled } = commandData;
    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};

    const updatedSettings = {
      ...currentSettings,
      shuffle: enabled !== undefined ? enabled : !currentSettings.shuffle,
      last_command: 'shuffle',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`${enabled ? '🔀' : '➡️'} Shuffle ${enabled ? 'enabled' : 'disabled'} for venue: ${venue.$id}`);
    return { command: 'shuffle', shuffle: updatedSettings.shuffle };
  } catch (err) {
    log(`❌ Failed to execute shuffle command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle repeat command
 */
async function handleRepeatCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { mode } = commandData; // 'off', 'one', 'all'

    if (mode && !['off', 'one', 'all'].includes(mode)) {
      throw new Error('Repeat mode must be off, one, or all');
    }

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const currentMode = currentSettings.repeat || 'off';

    // Cycle through modes if no specific mode provided
    const modeCycle = { 'off': 'one', 'one': 'all', 'all': 'off' };
    const newMode = mode || modeCycle[currentMode];

    const updatedSettings = {
      ...currentSettings,
      repeat: newMode,
      last_command: 'repeat',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString()
    });

    log(`🔁 Repeat mode set to ${newMode} for venue: ${venue.$id}`);
    return { command: 'repeat', repeatMode: newMode };
  } catch (err) {
    log(`❌ Failed to execute repeat command: ${err.message}`);
    throw err;
  }
}

/**
 * Handle load playlist command
 */
async function handleLoadPlaylistCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { playlistId } = commandData;

    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    // Get playlist
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venue.$id) {
      throw new Error('Playlist does not belong to this venue');
    }

    const tracks = JSON.parse(playlist.tracks || '[]');

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const updatedSettings = {
      ...currentSettings,
      last_command: 'loadPlaylist',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      active_queue: JSON.stringify(tracks),
      current_track_index: tracks.length > 0 ? 0 : -1,
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString(),
      last_queue_update: new Date().toISOString()
    });

    log(`📋 Loaded playlist ${playlist.name} for venue: ${venue.$id}`);
    return { command: 'loadPlaylist', playlistName: playlist.name, trackCount: tracks.length };
  } catch (err) {
    log(`❌ Failed to load playlist: ${err.message}`);
    throw err;
  }
}

/**
 * Handle add to queue command
 */
async function handleAddToQueueCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { track, priority = false } = commandData;

    if (!track) {
      throw new Error('Track data is required');
    }

    const targetQueue = priority ? 'priority_queue' : 'active_queue';
    const currentQueue = venue[targetQueue] ? JSON.parse(venue[targetQueue]) : [];

    currentQueue.push(track);

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const updatedSettings = {
      ...currentSettings,
      last_command: 'addToQueue',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      [targetQueue]: JSON.stringify(currentQueue),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString(),
      last_queue_update: new Date().toISOString()
    });

    log(`➕ Added track to ${priority ? 'priority' : 'regular'} queue for venue: ${venue.$id}`);
    return { command: 'addToQueue', trackTitle: track.title, priority, queueLength: currentQueue.length };
  } catch (err) {
    log(`❌ Failed to add to queue: ${err.message}`);
    throw err;
  }
}

/**
 * Handle remove from queue command
 */
async function handleRemoveFromQueueCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { index, priority = false } = commandData;

    if (index === undefined) {
      throw new Error('Queue index is required');
    }

    const targetQueue = priority ? 'priority_queue' : 'active_queue';
    const currentQueue = venue[targetQueue] ? JSON.parse(venue[targetQueue]) : [];

    if (index < 0 || index >= currentQueue.length) {
      throw new Error('Invalid queue index');
    }

    const removedTrack = currentQueue.splice(index, 1)[0];

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const updatedSettings = {
      ...currentSettings,
      last_command: 'removeFromQueue',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      [targetQueue]: JSON.stringify(currentQueue),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString(),
      last_queue_update: new Date().toISOString()
    });

    log(`➖ Removed track from ${priority ? 'priority' : 'regular'} queue for venue: ${venue.$id}`);
    return { command: 'removeFromQueue', removedTrack: removedTrack.title, index, queueLength: currentQueue.length };
  } catch (err) {
    log(`❌ Failed to remove from queue: ${err.message}`);
    throw err;
  }
}

/**
 * Handle clear queue command
 */
async function handleClearQueueCommand(databases, databaseId, venue, commandData, log) {
  try {
    const { priority = false } = commandData;
    const targetQueue = priority ? 'priority_queue' : 'active_queue';

    const currentSettings = venue.player_settings ? JSON.parse(venue.player_settings) : {};
    const updatedSettings = {
      ...currentSettings,
      last_command: 'clearQueue',
      command_timestamp: new Date().toISOString()
    };

    await databases.updateDocument(databaseId, 'venues', venue.$id, {
      [targetQueue]: JSON.stringify([]),
      player_settings: JSON.stringify(updatedSettings),
      last_command_at: new Date().toISOString(),
      last_queue_update: new Date().toISOString()
    });

    log(`🗑️ Cleared ${priority ? 'priority' : 'regular'} queue for venue: ${venue.$id}`);
    return { command: 'clearQueue', priority, cleared: true };
  } catch (err) {
    log(`❌ Failed to clear queue: ${err.message}`);
    throw err;
  }
}