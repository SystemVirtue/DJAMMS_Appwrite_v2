import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * Scheduler & Maintenance Agent - Appwrite Function
 *
 * Handles all background and periodic tasks.
 * Ensures system health and performs maintenance operations.
 *
 * Triggers: Scheduled Appwrite cron job (e.g., every 5 minutes)
 *
 * Responsibilities:
 * - Connection Auditing: Check player heartbeats and flag disconnected players
 * - Scheduled Events: Process scheduled playlist/content changes
 * - Cleanup: Delete old log entries and purge outdated data
 * - System Notifications: Send alerts for system-level issues
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  const maintenanceResults = {
    connectionAudits: 0,
    scheduledEvents: 0,
    cleanupOperations: 0,
    notificationsSent: 0,
    errors: []
  };

  try {
    log('🕐 Scheduler & Maintenance Agent started');

    // 1. CONNECTION AUDITING - Check player heartbeats
    try {
      const auditResults = await performConnectionAuditing(databases, DATABASE_ID, log);
      maintenanceResults.connectionAudits = auditResults.audited;
      maintenanceResults.notificationsSent += auditResults.notifications;
      log(`🔍 Connection auditing completed: ${auditResults.audited} venues checked`);
    } catch (auditError) {
      log(`⚠️ Connection auditing failed: ${auditError.message}`);
      maintenanceResults.errors.push(`Connection auditing: ${auditError.message}`);
    }

    // 2. SCHEDULED EVENTS - Process scheduled playlist/content changes
    try {
      const scheduledResults = await processScheduledEvents(databases, DATABASE_ID, log);
      maintenanceResults.scheduledEvents = scheduledResults.processed;
      log(`📅 Scheduled events processed: ${scheduledResults.processed} events`);
    } catch (scheduledError) {
      log(`⚠️ Scheduled events processing failed: ${scheduledError.message}`);
      maintenanceResults.errors.push(`Scheduled events: ${scheduledError.message}`);
    }

    // 3. CLEANUP OPERATIONS - Delete old data
    try {
      const cleanupResults = await performCleanupOperations(databases, DATABASE_ID, log);
      maintenanceResults.cleanupOperations = cleanupResults.cleaned;
      log(`🧹 Cleanup operations completed: ${cleanupResults.cleaned} items removed`);
    } catch (cleanupError) {
      log(`⚠️ Cleanup operations failed: ${cleanupError.message}`);
      maintenanceResults.errors.push(`Cleanup operations: ${cleanupError.message}`);
    }

    // 4. SYSTEM HEALTH CHECK - Overall system monitoring
    try {
      const healthResults = await performSystemHealthCheck(databases, DATABASE_ID, log);
      if (healthResults.issues > 0) {
        maintenanceResults.notificationsSent += healthResults.notifications;
        log(`⚕️ System health check found ${healthResults.issues} issues`);
      } else {
        log(`✅ System health check passed`);
      }
    } catch (healthError) {
      log(`⚠️ System health check failed: ${healthError.message}`);
      maintenanceResults.errors.push(`System health: ${healthError.message}`);
    }

    // Log maintenance summary
    try {
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        venue_id: null, // System-wide
        event_type: 'maintenance_run',
        event_data: JSON.stringify({
          results: maintenanceResults,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      log(`⚠️ Failed to log maintenance summary: ${logError.message}`);
    }

    const status = maintenanceResults.errors.length === 0 ? 'success' : 'completed_with_errors';
    log(`🎉 Maintenance run ${status}: ${JSON.stringify(maintenanceResults)}`);

    return res.json({
      success: true,
      status: status,
      message: 'Maintenance operations completed',
      results: maintenanceResults,
      timestamp: new Date().toISOString()
    });

  } catch (globalError) {
    error(`💥 Global error in Scheduler & Maintenance Agent: ${globalError.message}`);
    error(`Stack trace: ${globalError.stack}`);

    return res.json({
      success: false,
      error: 'Critical error during maintenance operations',
      details: process.env.NODE_ENV === 'development' ? globalError.message : undefined
    }, 500);
  }
};

/**
 * Perform connection auditing - check player heartbeats and flag disconnected players
 */
async function performConnectionAuditing(databases, databaseId, log) {
  const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = new Date();
  let auditedCount = 0;
  let notificationsSent = 0;

  try {
    // Get all venues
    const venues = await databases.listDocuments(databaseId, 'venues', [
      Query.limit(1000) // Process up to 1000 venues
    ]);

    for (const venue of venues.documents) {
      auditedCount++;

      const lastHeartbeat = venue.last_heartbeat_at ? new Date(venue.last_heartbeat_at) : null;
      const timeSinceHeartbeat = lastHeartbeat ? now - lastHeartbeat : Infinity;

      // Check if player is disconnected
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        const wasConnected = venue.player_connected !== false;

        if (wasConnected) {
          // Mark player as disconnected
          await databases.updateDocument(databaseId, 'venues', venue.$id, {
            player_connected: false,
            disconnected_at: now.toISOString(),
            disconnect_reason: 'heartbeat_timeout'
          });

          // Update player instances
          const playerInstances = await databases.listDocuments(databaseId, 'player_instances', [
            Query.equal('venue_id', venue.$id),
            Query.equal('is_connected', true)
          ]);

          for (const instance of playerInstances.documents) {
            await databases.updateDocument(databaseId, 'player_instances', instance.$id, {
              is_connected: false,
              disconnected_at: now.toISOString(),
              disconnect_reason: 'heartbeat_timeout'
            });
          }

          log(`🔌 Player disconnected for venue: ${venue.$id} (${playerInstances.total} instances)`);

          // Send notification (in a real system, this would send an email/SMS)
          notificationsSent++;
        }
      }
      // Check if player reconnected
      else if (timeSinceHeartbeat <= HEARTBEAT_TIMEOUT && venue.player_connected === false) {
        await databases.updateDocument(databaseId, 'venues', venue.$id, {
          player_connected: true,
          reconnected_at: now.toISOString()
        });

        log(`🔌 Player reconnected for venue: ${venue.$id}`);
      }
    }

    return { audited: auditedCount, notifications: notificationsSent };
  } catch (err) {
    log(`❌ Connection auditing error: ${err.message}`);
    throw err;
  }
}

/**
 * Process scheduled events - handle scheduled playlist/content changes
 */
async function processScheduledEvents(databases, databaseId, log) {
  const now = new Date();
  let processedCount = 0;

  try {
    // Get all venues with scheduled events
    const venues = await databases.listDocuments(databaseId, 'venues', [
      Query.limit(1000)
    ]);

    for (const venue of venues.documents) {
      // Check for scheduled playlist changes
      if (venue.scheduled_playlist_change) {
        const scheduledChange = JSON.parse(venue.scheduled_playlist_change);
        const scheduledTime = new Date(scheduledChange.scheduled_at);

        if (now >= scheduledTime && !scheduledChange.processed) {
          // Execute scheduled playlist change
          await databases.updateDocument(databaseId, 'venues', venue.$id, {
            active_queue: JSON.stringify(scheduledChange.new_queue),
            current_track_index: 0,
            scheduled_playlist_change: null, // Clear the schedule
            last_scheduled_execution: now.toISOString()
          });

          processedCount++;
          log(`📅 Executed scheduled playlist change for venue: ${venue.$id}`);
        }
      }

      // Check for scheduled content updates
      if (venue.scheduled_content_updates) {
        const updates = JSON.parse(venue.scheduled_content_updates);
        const pendingUpdates = updates.filter(update => {
          const scheduledTime = new Date(update.scheduled_at);
          return now >= scheduledTime && !update.processed;
        });

        for (const update of pendingUpdates) {
          // Process content update (this would depend on the specific update type)
          update.processed = true;
          update.processed_at = now.toISOString();
          processedCount++;
        }

        // Update the venue with processed updates
        if (pendingUpdates.length > 0) {
          await databases.updateDocument(databaseId, 'venues', venue.$id, {
            scheduled_content_updates: JSON.stringify(updates)
          });
        }
      }
    }

    return { processed: processedCount };
  } catch (err) {
    log(`❌ Scheduled events processing error: ${err.message}`);
    throw err;
  }
}

/**
 * Perform cleanup operations - delete old log entries and purge outdated data
 */
async function performCleanupOperations(databases, databaseId, log) {
  const LOG_RETENTION_DAYS = 30;
  const CONTENT_RETENTION_DAYS = 90;
  const now = new Date();
  let cleanedCount = 0;

  try {
    // Clean old activity logs
    const cutoffDate = new Date(now.getTime() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const oldLogs = await databases.listDocuments(databaseId, 'activity_log', [
      Query.lessThan('timestamp', cutoffDate.toISOString()),
      Query.limit(100) // Process in batches
    ]);

    for (const logEntry of oldLogs.documents) {
      await databases.deleteDocument(databaseId, 'activity_log', logEntry.$id);
      cleanedCount++;
    }

    log(`🗑️ Cleaned ${oldLogs.total} old activity log entries`);

    // Clean old content gallery items (marked as inactive)
    const contentCutoffDate = new Date(now.getTime() - (CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const oldContent = await databases.listDocuments(databaseId, 'content_gallery', [
      Query.equal('is_active', false),
      Query.lessThan('uploaded_at', contentCutoffDate.toISOString()),
      Query.limit(50) // Process in batches
    ]);

    for (const content of oldContent.documents) {
      await databases.deleteDocument(databaseId, 'content_gallery', content.$id);
      cleanedCount++;
    }

    log(`🗑️ Cleaned ${oldContent.total} old inactive content items`);

    // Clean old player instances (disconnected for more than 7 days)
    const instanceCutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const oldInstances = await databases.listDocuments(databaseId, 'player_instances', [
      Query.equal('is_connected', false),
      Query.lessThan('disconnected_at', instanceCutoffDate.toISOString()),
      Query.limit(20) // Process in batches
    ]);

    for (const instance of oldInstances.documents) {
      await databases.deleteDocument(databaseId, 'player_instances', instance.$id);
      cleanedCount++;
    }

    log(`🗑️ Cleaned ${oldInstances.total} old disconnected player instances`);

    return { cleaned: cleanedCount };
  } catch (err) {
    log(`❌ Cleanup operations error: ${err.message}`);
    throw err;
  }
}

/**
 * Perform system health check - overall system monitoring
 */
async function performSystemHealthCheck(databases, databaseId, log) {
  let issuesFound = 0;
  let notificationsSent = 0;

  try {
    // Check database connectivity
    const testQuery = await databases.listDocuments(databaseId, 'venues', [Query.limit(1)]);
    log(`✅ Database connectivity: OK`);

    // Check for venues with corrupted data
    const venues = await databases.listDocuments(databaseId, 'venues', [Query.limit(100)]);

    for (const venue of venues.documents) {
      let venueIssues = 0;

      // Check now_playing JSON
      if (venue.now_playing) {
        try {
          JSON.parse(venue.now_playing);
        } catch (e) {
          log(`⚠️ Corrupted now_playing JSON in venue: ${venue.$id}`);
          venueIssues++;
        }
      }

      // Check active_queue JSON
      if (venue.active_queue) {
        try {
          JSON.parse(venue.active_queue);
        } catch (e) {
          log(`⚠️ Corrupted active_queue JSON in venue: ${venue.$id}`);
          venueIssues++;
        }
      }

      // Check player_settings JSON
      if (venue.player_settings) {
        try {
          JSON.parse(venue.player_settings);
        } catch (e) {
          log(`⚠️ Corrupted player_settings JSON in venue: ${venue.$id}`);
          venueIssues++;
        }
      }

      if (venueIssues > 0) {
        issuesFound += venueIssues;

        // Log system issue
        await databases.createDocument(databaseId, 'activity_log', ID.unique(), {
          venue_id: venue.$id,
          event_type: 'system_issue',
          event_data: JSON.stringify({
            issue_type: 'corrupted_data',
            issues_found: venueIssues,
            timestamp: new Date().toISOString()
          }),
          timestamp: new Date().toISOString()
        });

        // In a real system, this would send notifications to admins
        notificationsSent++;
      }
    }

    // Check for orphaned data (playlists without venues, etc.)
    const playlists = await databases.listDocuments(databaseId, 'playlists', [Query.limit(1000)]);
    let orphanedPlaylists = 0;

    for (const playlist of playlists.documents) {
      try {
        await databases.getDocument(databaseId, 'venues', playlist.venue_id);
      } catch (e) {
        // Venue doesn't exist
        orphanedPlaylists++;
        log(`⚠️ Orphaned playlist found: ${playlist.$id} (venue: ${playlist.venue_id})`);
      }
    }

    if (orphanedPlaylists > 0) {
      issuesFound += orphanedPlaylists;
      notificationsSent++;
    }

    return { issues: issuesFound, notifications: notificationsSent };
  } catch (err) {
    log(`❌ System health check error: ${err.message}`);
    throw err;
  }
}