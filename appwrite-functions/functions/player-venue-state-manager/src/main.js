import { Client, Databases, ID, Query, Realtime } from 'node-appwrite';

/**
 * DJAMMS Player & Venue State Manager - Appwrite Function
 *
 * Handles real-time player state updates and queue management.
 * Triggers on venue document updates.
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

    // Get event data from request
    const eventData = req.body;
    if (!eventData) {
      log('❌ No event data in request');
      return res.json({ success: false, message: 'No event data' });
    }

    const { $collection, $id: venueId, ...venueData } = eventData;
    log(`🏢 Processing venue update: ${venueId}`);

    // Validate venue exists
    const venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);
    log(`✅ Venue validated: ${venue.venue_name}`);

    // Update heartbeat
    await databases.updateDocument(DATABASE_ID, 'venues', venueId, {
      last_heartbeat_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });

    // Process queue operations if active_queue changed
    if (venueData.active_queue) {
      const activeQueue = JSON.parse(venueData.active_queue);
      log(`📋 Active queue updated: ${activeQueue.length} tracks`);

      // Validate queue structure
      if (!Array.isArray(activeQueue)) {
        error('❌ Invalid active_queue format');
        return res.json({ success: false, message: 'Invalid queue format' });
      }

      // Process queue commands (skip, next, previous, etc.)
      // This would handle advanced queue logic
    }

    // Process player state updates
    if (venueData.now_playing) {
      const nowPlaying = JSON.parse(venueData.now_playing);
      log(`🎵 Now playing updated: ${nowPlaying.title || 'Unknown'}`);

      // Validate player state
      if (nowPlaying && typeof nowPlaying !== 'object') {
        error('❌ Invalid now_playing format');
        return res.json({ success: false, message: 'Invalid player state' });
      }
    }

    // Log state change activity
    await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
      log_id: ID.unique(),
      user_id: venue.owner_id, // Assuming the updater is the owner
      venue_id: venueId,
      event_type: 'venue_state_updated',
      event_data: JSON.stringify({
        action: 'state_change',
        changes: Object.keys(venueData)
      }),
      timestamp: new Date().toISOString()
    });

    // Broadcast real-time update (this would trigger client-side updates)
    // Note: Real-time broadcasting is handled by Appwrite automatically for document changes

    log('🎉 Player & Venue State Manager completed successfully');
    return res.json({
      success: true,
      message: 'Venue state updated',
      venueId: venueId
    });

  } catch (err) {
    error(`❌ Player & Venue State Manager failed: ${err.message}`);
    return res.json({
      success: false,
      message: err.message
    });
  }
};