import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * DJAMMS Scheduler & Maintenance Agent - Appwrite Function
 *
 * Runs scheduled maintenance tasks and cleanup operations.
 * Executes every 6 hours.
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
    log('🧹 Scheduler & Maintenance Agent started');

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    log('🧽 Starting maintenance tasks...');

    // Task 1: Clean up old activity logs (older than 30 days)
    try {
      const oldLogs = await databases.listDocuments(DATABASE_ID, 'activity_log', [
        Query.lessThan('timestamp', thirtyDaysAgo.toISOString()),
        Query.limit(100)
      ]);

      for (const log of oldLogs.documents) {
        await databases.deleteDocument(DATABASE_ID, 'activity_log', log.$id);
      }

      log(`🗑️ Cleaned up ${oldLogs.documents.length} old activity logs`);
    } catch (err) {
      error(`❌ Failed to clean activity logs: ${err.message}`);
    }

    // Task 2: Update venue heartbeat status
    try {
      const staleVenues = await databases.listDocuments(DATABASE_ID, 'venues', [
        Query.lessThan('last_heartbeat_at', sixHoursAgo.toISOString())
      ]);

      for (const venue of staleVenues.documents) {
        await databases.updateDocument(DATABASE_ID, 'venues', venue.$id, {
          state: 'inactive'
        });
      }

      log(`💓 Updated ${staleVenues.documents.length} stale venues to inactive`);
    } catch (err) {
      error(`❌ Failed to update venue heartbeats: ${err.message}`);
    }

    // Task 3: Clean up inactive user sessions (mark users inactive)
    try {
      const inactiveUsers = await databases.listDocuments(DATABASE_ID, 'users', [
        Query.lessThan('last_activity_at', thirtyDaysAgo.toISOString()),
        Query.equal('is_active', true)
      ]);

      for (const user of inactiveUsers.documents) {
        await databases.updateDocument(DATABASE_ID, 'users', user.$id, {
          is_active: false
        });
      }

      log(`👤 Marked ${inactiveUsers.documents.length} users as inactive`);
    } catch (err) {
      error(`❌ Failed to clean inactive users: ${err.message}`);
    }

    // Task 4: Update playlist statistics
    try {
      const playlists = await databases.listDocuments(DATABASE_ID, 'playlists', [
        Query.limit(100)
      ]);

      for (const playlist of playlists.documents) {
        // Recalculate stats if needed
        if (playlist.tracks) {
          const tracks = JSON.parse(playlist.tracks);
          const trackCount = tracks.length;
          const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

          if (playlist.track_count !== trackCount || playlist.total_duration !== totalDuration) {
            await databases.updateDocument(DATABASE_ID, 'playlists', playlist.$id, {
              track_count: trackCount,
              total_duration: totalDuration
            });
          }
        }
      }

      log(`📊 Updated statistics for ${playlists.documents.length} playlists`);
    } catch (err) {
      error(`❌ Failed to update playlist statistics: ${err.message}`);
    }

    // Task 5: Log maintenance activity
    await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
      log_id: ID.unique(),
      user_id: null,
      venue_id: null,
      event_type: 'maintenance_run',
      event_data: JSON.stringify({
        action: 'scheduled_maintenance',
        timestamp: now.toISOString()
      }),
      timestamp: now.toISOString()
    });

    log('🎉 Scheduler & Maintenance Agent completed successfully');
    return res.json({
      success: true,
      message: 'Maintenance completed',
      timestamp: now.toISOString()
    });

  } catch (err) {
    error(`❌ Scheduler & Maintenance Agent failed: ${err.message}`);
    return res.json({
      success: false,
      message: err.message
    });
  }
};