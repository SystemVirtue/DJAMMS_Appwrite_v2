import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * DJAMMS Playlist & Content Manager - Appwrite Function
 *
 * Handles playlist CRUD operations and content management.
 * Triggers on playlist document changes.
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
    log('📀 Playlist & Content Manager started');

    // Get event data
    const eventData = req.body;
    if (!eventData) {
      log('❌ No event data in request');
      return res.json({ success: false, message: 'No event data' });
    }

    const { $collection, $id: playlistId, ...playlistData } = eventData;
    log(`📋 Processing playlist: ${playlistId}`);

    // Validate playlist data
    if (playlistData.tracks) {
      const tracks = JSON.parse(playlistData.tracks);
      if (!Array.isArray(tracks)) {
        error('❌ Invalid tracks format');
        return res.json({ success: false, message: 'Invalid tracks format' });
      }

      // Validate track structure
      for (const track of tracks) {
        if (!track.videoId || !track.title) {
          error('❌ Invalid track structure');
          return res.json({ success: false, message: 'Invalid track structure' });
        }
      }

      // Update track count
      const trackCount = tracks.length;
      const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

      await databases.updateDocument(DATABASE_ID, 'playlists', playlistId, {
        track_count: trackCount,
        total_duration: totalDuration,
        updated_at: new Date().toISOString()
      });

      log(`✅ Playlist updated: ${trackCount} tracks, ${totalDuration}s total`);
    }

    // Handle sharing permissions
    if (playlistData.is_public !== undefined) {
      log(`🔗 Playlist visibility changed: ${playlistData.is_public ? 'public' : 'private'}`);
    }

    // Log playlist activity
    await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
      log_id: ID.unique(),
      user_id: playlistData.owner_id,
      venue_id: playlistData.venue_id,
      event_type: 'playlist_updated',
      event_data: JSON.stringify({
        action: 'playlist_change',
        playlist_id: playlistId,
        changes: Object.keys(playlistData)
      }),
      timestamp: new Date().toISOString()
    });

    log('🎉 Playlist & Content Manager completed successfully');
    return res.json({
      success: true,
      message: 'Playlist processed',
      playlistId: playlistId
    });

  } catch (err) {
    error(`❌ Playlist & Content Manager failed: ${err.message}`);
    return res.json({
      success: false,
      message: err.message
    });
  }
};