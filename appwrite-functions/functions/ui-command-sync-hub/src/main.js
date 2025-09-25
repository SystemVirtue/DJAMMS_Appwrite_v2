import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * DJAMMS UI Command & Sync Hub - Appwrite Function
 *
 * Handles UI commands and broadcasts real-time updates.
 * Called by frontend for player controls.
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

    // Get command from request
    const { command, venueId, userId, data } = req.body;
    if (!command || !venueId) {
      log('❌ Missing command or venueId');
      return res.json({ success: false, message: 'Missing required parameters' });
    }

    log(`🎮 Processing command: ${command} for venue: ${venueId}`);

    // Validate venue exists
    const venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);

    // Process command
    let updateData = {};
    let activityType = 'ui_command';

    switch (command) {
      case 'play':
        updateData.state = 'playing';
        updateData.last_updated = new Date().toISOString();
        break;

      case 'pause':
        updateData.state = 'paused';
        updateData.last_updated = new Date().toISOString();
        break;

      case 'stop':
        updateData.state = 'stopped';
        updateData.current_time = 0;
        updateData.last_updated = new Date().toISOString();
        break;

      case 'skip':
        // Handle skip logic - would need to update active_queue and now_playing
        updateData.last_updated = new Date().toISOString();
        activityType = 'track_skip';
        break;

      case 'previous':
        // Handle previous logic
        updateData.last_updated = new Date().toISOString();
        activityType = 'track_previous';
        break;

      case 'seek':
        if (data && data.position !== undefined) {
          updateData.current_time = data.position;
          updateData.last_updated = new Date().toISOString();
        }
        break;

      case 'volume':
        if (data && data.volume !== undefined) {
          updateData.volume = data.volume;
          updateData.last_updated = new Date().toISOString();
        }
        break;

      case 'shuffle':
        updateData.is_shuffled = !venue.is_shuffled;
        updateData.last_updated = new Date().toISOString();
        break;

      default:
        log(`⚠️ Unknown command: ${command}`);
        return res.json({ success: false, message: 'Unknown command' });
    }

    // Update venue state
    if (Object.keys(updateData).length > 0) {
      await databases.updateDocument(DATABASE_ID, 'venues', venueId, updateData);
      log(`✅ Venue updated with command: ${command}`);
    }

    // Log command activity
    await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
      log_id: ID.unique(),
      user_id: userId,
      venue_id: venueId,
      event_type: activityType,
      event_data: JSON.stringify({
        command: command,
        data: data
      }),
      timestamp: new Date().toISOString()
    });

    // Real-time broadcast happens automatically via document update

    log('🎉 UI Command & Sync Hub completed successfully');
    return res.json({
      success: true,
      message: 'Command processed',
      command: command,
      venueId: venueId
    });

  } catch (err) {
    error(`❌ UI Command & Sync Hub failed: ${err.message}`);
    return res.json({
      success: false,
      message: err.message
    });
  }
};