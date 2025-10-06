import { Client, Databases, Users, ID, Query } from 'node-appwrite';

/**
 * DJAMMS User Sync Handler - Appwrite Function
 *
 * Bulk synchronization function to ensure all Appwrite Auth users
 * have corresponding documents in the users collection and venues.
 *
 * Triggers:
 * - Manual API call (admin only)
 * - Scheduled execution (via Scheduler & Maintenance Agent)
 *
 * Responsibilities:
 * - Get all users from Appwrite Auth
 * - Create user documents for any missing users
 * - Create venues for users who don't have them
 * - Log synchronization activity
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID);

  // Set API key for admin operations
  if (process.env.APPWRITE_API_KEY && process.env.APPWRITE_API_KEY.trim()) {
    client.setKey(process.env.APPWRITE_API_KEY);
  }

  const databases = new Databases(client);
  const users = new Users(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  try {
    log('🚀 User Sync Handler started');

    // Check if caller is authorized (admin only)
    const isAdminCall = req.headers['x-appwrite-user-id'] &&
                       (req.query?.admin === 'true' || req.body?.admin === 'true');

    if (!isAdminCall && !process.env.APPWRITE_API_KEY) {
      log('❌ Unauthorized: Admin access required');
      return res.json({
        success: false,
        message: 'Unauthorized: Admin access required for user synchronization'
      });
    }

    // Get all users from Appwrite Auth
    log('📋 Fetching all users from Appwrite Auth...');
    const authUsers = await users.list();
    log(`👥 Found ${authUsers.users.length} users in Appwrite Auth`);

    let processed = 0;
    let usersCreated = 0;
    let venuesCreated = 0;
    let errors = 0;

    // Process each auth user
    for (const authUser of authUsers.users) {
      try {
        log(`👤 Processing user: ${authUser.$id} (${authUser.email})`);
        processed++;

        // Check if user document exists
        let userDoc;
        try {
          userDoc = await databases.getDocument(DATABASE_ID, 'users', authUser.$id);
          log(`✅ User document exists for ${authUser.email}`);
        } catch (err) {
          // User document doesn't exist, create it
          log(`📝 Creating user document for ${authUser.email}`);

          const userRole = determineUserRole(authUser.email);
          const defaultPreferences = {
            theme: 'dark',
            notifications_enabled: true,
            default_volume: 80,
            auto_play: false,
            language: 'en',
            timezone: 'UTC',
            min_to_tray_enabled: false,
            update_checks_enabled: true,
            telemetry_enabled: false
          };

          const newUserDoc = {
            user_id: authUser.$id,
            email: authUser.email,
            username: authUser.name || authUser.email.split('@')[0],
            venue_id: 'default', // Default venue for all users
            role: userRole,
            prefs: JSON.stringify(defaultPreferences),
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`,
            is_active: true,
            is_developer: userRole === 'admin' || userRole === 'developer',
            created_at: authUser.$createdAt,
            last_login_at: authUser.$updatedAt, // Use last update as last login
            last_activity_at: new Date().toISOString()
          };

          userDoc = await databases.createDocument(DATABASE_ID, 'users', authUser.$id, newUserDoc);
          usersCreated++;
          log(`✅ Created user document for ${authUser.email}`);
        }

        // Check if venue exists for this user
        if (userDoc.venue_id) {
          try {
            await databases.getDocument(DATABASE_ID, 'venues', userDoc.venue_id);
            log(`✅ Venue exists for ${authUser.email}`);
          } catch (err) {
            // Venue doesn't exist, create it
            log(`🏢 Creating venue for ${authUser.email}`);

            const defaultVenueData = {
              venue_id: userDoc.venue_id,
              venue_name: `${authUser.name || authUser.email.split('@')[0]}'s Venue`,
              owner_id: authUser.$id,
              active_player_instance_id: null,
              now_playing: null,
              state: 'paused',
              current_time: 0,
              volume: 80,
              active_queue: '[]',
              priority_queue: '[]',
              player_settings: JSON.stringify({
                repeat_mode: 'none',
                shuffle_enabled: false,
                shuffle_seed: null,
                crossfade_time: 3,
                master_volume: 80,
                is_muted: false,
                eq_settings: {},
                mic_volume: 0,
                dynamic_compressor_enabled: false,
                player_size: { width: 1280, height: 720 },
                player_position: { x: 100, y: 100 },
                is_fullscreen: false,
                display_sliders: { brightness: 50, contrast: 50 }
              }),
              is_shuffled: false,
              last_heartbeat_at: null,
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              schedule_data: '{}',
              app_name: 'DJAMMS'
            };

            await databases.createDocument(DATABASE_ID, 'venues', userDoc.venue_id, defaultVenueData);
            venuesCreated++;
            log(`✅ Created venue for ${authUser.email}`);
          }
        }

        // Log sync activity
        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          user_id: authUser.$id,
          venue_id: userDoc.venue_id || null,
          event_type: 'user_sync',
          event_data: JSON.stringify({
            action: 'bulk_sync',
            user_created: !userDoc.$createdAt,
            venue_created: false, // We'll update this if venue was created
            sync_timestamp: new Date().toISOString()
          }),
          timestamp: new Date().toISOString(),
          ip_address: null,
          user_agent: null,
          session_id: null
        });

      } catch (userError) {
        log(`❌ Error processing user ${authUser.$id}: ${userError.message}`);
        errors++;
      }
    }

    // Log completion
    await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
      user_id: null,
      venue_id: null,
      event_type: 'bulk_sync_completed',
      event_data: JSON.stringify({
        total_users: authUsers.users.length,
        processed: processed,
        users_created: usersCreated,
        venues_created: venuesCreated,
        errors: errors,
        sync_timestamp: new Date().toISOString()
      }),
      timestamp: new Date().toISOString(),
      ip_address: null,
      user_agent: null,
      session_id: null
    });

    log(`✅ User sync completed: ${processed} processed, ${usersCreated} users created, ${venuesCreated} venues created, ${errors} errors`);

    return res.json({
      success: true,
      message: 'User synchronization completed',
      stats: {
        total_users: authUsers.users.length,
        processed: processed,
        users_created: usersCreated,
        venues_created: venuesCreated,
        errors: errors
      }
    });

  } catch (err) {
    error(`❌ User sync failed: ${err.message}`);
    return res.json({
      success: false,
      message: `User synchronization failed: ${err.message}`
    });
  }
};

// Helper function to determine user role
function determineUserRole(email) {
  if (email === 'admin@djamms.app') return 'admin';
  if (email === 'demo@djamms.app') return 'developer';
  return 'user';
}