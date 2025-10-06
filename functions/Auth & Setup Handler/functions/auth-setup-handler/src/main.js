import { Client, Databases, Users, ID, Query } from 'node-appwrite';

/**
 * DJAMMS Auth & Setup Handler - Appwrite Function
 *
 * Core function for user and venue creation.
 * Combines user authentication handling with initial venue setup.
 *
 * Triggers:
 * - Appwrite users.onCreate event (for new users)
 * - Manual API call from UI (for login)
 *
 * Responsibilities:
 * - User Provisioning: Creates user profile in users collection on users.onCreate
 * - Venue Creation: Creates venue for users with venue_id but no venues entry
 * - Post-Login Actions: Retrieves venue_id and preferences for UI preparation
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID);

  // Only set API key when explicitly provided. If not provided, rely on the
  // function's built-in execution permissions (scopes) which allow DB access.
  if (process.env.APPWRITE_API_KEY && process.env.APPWRITE_API_KEY.trim()) {
    client.setKey(process.env.APPWRITE_API_KEY);
  }

  const databases = new Databases(client);
  const users = new Users(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  try {
    log('🚀 Auth & Setup Handler started');

    // Determine trigger type and extract user ID
    let userId = null;
    let isEventTrigger = false;
    let isManualCall = false;

    // Parse body early so manual callers can pass flags (forceCreateVenue, venueId, venueName)
    let manualBody = null;
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
        log('🔧 Parsed JSON body');
      } catch (e) {
        log('⚠️ Failed to parse body as JSON');
      }
    }
    manualBody = parsedBody;

    // Check for event trigger (users.onCreate or users.sessions.create)
    if (req.headers['x-appwrite-event'] && req.headers['x-appwrite-user-id']) {
      userId = req.headers['x-appwrite-user-id'];
      isEventTrigger = true;
      log(`📡 Event trigger: ${req.headers['x-appwrite-event']}`);
    }
    // Check for manual API call (user ID in body or query)
    else {
      if (manualBody && manualBody.userId) {
        userId = manualBody.userId;
        isManualCall = true;
        log('🔧 Manual API call detected (body)');
      } else if (req.query && req.query.userId) {
        userId = req.query.userId;
        isManualCall = true;
        log('🔧 Manual API call detected (query param)');
      }
    }

    if (!userId) {
      log('❌ No user ID provided');
      return res.json({ success: false, message: 'No user ID provided' });
    }

    log(`👤 Processing user: ${userId}`);

    // For manual API calls, skip user.get() to avoid authorization issues
    let user = null;
    if (!isManualCall) {
      // Get user details from Auth (only for event-triggered calls)
      user = await users.get(userId);
      log(`📧 User email: ${user.email}`);
    } else {
      log('🔧 Manual call - skipping user.get() to avoid auth issues');
    }

    // Check if this is a new user creation event
    const isNewUser = req.headers['x-appwrite-event'] === 'users.create';

    // 1. USER PROVISIONING (on users.onCreate or first manual call)
    let userProfile = null;
    try {
      userProfile = await databases.getDocument(DATABASE_ID, 'users', userId);
      log('✅ User profile exists');
    } catch (err) {
      log('👤 User profile not found, creating...');

      // For manual calls without user details, use defaults
      const userEmail = user?.email || `${userId}@manual.test`;
      const userName = user?.name || user?.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;

      // Create user profile
      const userRole = determineUserRole(userEmail);
      // Only include fields that are commonly present in the collection schema.
      // Avoid timestamp fields or other attributes that may not exist in the Appwrite collection.
      const newUserProfile = {
        user_id: userId,
        email: userEmail,
        username: userName,
        // Default to shared 'default' venue to avoid 2-step race conditions
        venue_id: 'default',
        role: userRole,
  // Ensure prefs exists as a JSON string to satisfy collection schema expectations
  prefs: JSON.stringify({}),
        // Store prefs only if provided (some collections use a different attribute name)
        ...(user?.prefs ? { prefs: JSON.stringify(user.prefs) } : {}),
        avatar_url: user?.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
        is_active: true,
        is_developer: userRole === 'admin' || userRole === 'developer'
      };

      try {
        log('📦 Creating user document payload: ' + JSON.stringify(newUserProfile));
        userProfile = await databases.createDocument(DATABASE_ID, 'users', userId, newUserProfile);
        log('✅ User profile created');
      } catch (createErr) {
        log(`❌ Failed to create user profile: ${createErr.message}`);
        throw createErr;
      }

      // Log user provisioning activity
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        log_id: ID.unique(),
        user_id: userId,
        venue_id: null,
        event_type: 'user_provisioned',
        event_data: JSON.stringify({
          action: 'user_created',
          trigger: isEventTrigger ? 'event' : 'manual'
        }),
        timestamp: new Date().toISOString()
      });
    }
    // 2. VENUE CREATION (for users with venue_id but no venues entry)
    // - For event-triggered calls, create venue if userProfile.venue_id is set
    // - For manual calls, allow forcing venue creation via manualBody.forceCreateVenue
    if (!isManualCall && userProfile.venue_id) {
      log(`🏢 Checking venue for user with venue_id: ${userProfile.venue_id}`);

      try {
        // Check if venue exists
        await databases.getDocument(DATABASE_ID, 'venues', userProfile.venue_id);
        log('✅ Venue already exists');
      } catch (err) {
        log('🏢 Venue not found, creating new venue...');

        // Get global default playlist for active_queue
        let globalDefaultPlaylist = [];
        try {
          const defaultPlaylist = await databases.getDocument(DATABASE_ID, 'playlists', 'global_default_playlist');
          if (defaultPlaylist && defaultPlaylist.tracks) {
            globalDefaultPlaylist = typeof defaultPlaylist.tracks === 'string'
              ? JSON.parse(defaultPlaylist.tracks)
              : defaultPlaylist.tracks;
            log(`🎵 Loaded global default playlist with ${globalDefaultPlaylist.length} tracks`);
          }
        } catch (playlistErr) {
          log(`⚠️ Could not load global default playlist: ${playlistErr.message}`);
        }

        // Create venue
        const venue = {
          venue_id: userProfile.venue_id,
          venue_name: `${user.name || user.email.split('@')[0]}'s Venue`,
          owner_id: userId,
          active_player_instance_id: null,
          now_playing: null, // null as specified
          state: 'ready',
          current_time: 0,
          volume: 80,
          active_queue: JSON.stringify(globalDefaultPlaylist), // global_default_playlist tracks
          priority_queue: JSON.stringify([]),
          player_settings: JSON.stringify({
            repeat_mode: 'off',
            shuffle_enabled: false,
            crossfade_time: 3,
            master_volume: 80,
            is_muted: false
          }),
          is_shuffled: false,
          last_heartbeat_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          schedule_data: JSON.stringify({})
        };

        await databases.createDocument(DATABASE_ID, 'venues', userProfile.venue_id, venue);
        log('✅ Venue created for venue owner');

        // Log venue creation activity
        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: userProfile.venue_id,
          event_type: 'venue_created',
          event_data: JSON.stringify({
            action: 'venue_auto_created',
            playlist_tracks: globalDefaultPlaylist.length
          }),
          timestamp: new Date().toISOString()
        });
      }
    } else {
      log('ℹ️ User has no venue_id, skipping venue creation');
    }

    // Manual-triggered venue creation (explicit request)
    if (isManualCall && manualBody && manualBody.forceCreateVenue) {
      // Use provided venueId or generate one
      const requestedVenueId = manualBody.venueId || `venue-${ID.unique()}`;
      const venueName = manualBody.venueName || `${userProfile.username || userName}'s Venue`;

      // Update user profile with venue_id
      // Avoid updating the users document here because some environments
      // surface validation errors (unknown attributes) when calling updateDocument.
  // Recommend running the offline migration to normalize `preferences` first.
  log('ℹ️ Skipping update of user.venue_id to avoid document validation issues (legacy preferences attribute)');

      // Get global default playlist for active_queue
      let globalDefaultPlaylist = [];
      try {
        const defaultPlaylist = await databases.getDocument(DATABASE_ID, 'playlists', 'global_default_playlist');
        if (defaultPlaylist && defaultPlaylist.tracks) {
          globalDefaultPlaylist = typeof defaultPlaylist.tracks === 'string'
            ? JSON.parse(defaultPlaylist.tracks)
            : defaultPlaylist.tracks;
          log(`🎵 Loaded global default playlist with ${globalDefaultPlaylist.length} tracks`);
        }
      } catch (playlistErr) {
        log(`⚠️ Could not load global default playlist: ${playlistErr.message}`);
      }

      // Create venue object
      const manualVenue = {
        venue_id: requestedVenueId,
        venue_name: venueName,
        owner_id: userId,
        active_player_instance_id: null,
        now_playing: null,
        state: 'ready',
        current_time: 0,
        volume: 80,
        active_queue: JSON.stringify(globalDefaultPlaylist),
        priority_queue: JSON.stringify([]),
        player_settings: JSON.stringify({
          repeat_mode: 'off',
          shuffle_enabled: false,
          crossfade_time: 3,
          master_volume: 80,
          is_muted: false
        }),
        is_shuffled: false,
        last_heartbeat_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        schedule_data: JSON.stringify({})
      };

      try {
        await databases.createDocument(DATABASE_ID, 'venues', requestedVenueId, manualVenue);
        log('✅ Venue created (manual request)');

        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: requestedVenueId,
          event_type: 'venue_created_manual',
          event_data: JSON.stringify({ action: 'venue_created_manual', playlist_tracks: globalDefaultPlaylist.length }),
          timestamp: new Date().toISOString()
        });
      } catch (venueErr) {
        log(`❌ Failed to create manual venue: ${venueErr.message}`);
      }
    }

    // 3. POST-LOGIN ACTIONS (update timestamps and prepare response)
    if (!isNewUser) {
      // Update login timestamps (some collections don't have these fields). Wrap in try/catch.
      // Skipping update of user timestamps to avoid document validation errors
      log('ℹ️ Skipping update of user timestamps to avoid document validation issues');

      // Log login activity (activity_log should exist per schema)
      try {
        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: userProfile?.venue_id || null,
          event_type: 'user_login',
          event_data: JSON.stringify({
            action: 'user_logged_in',
            trigger: isEventTrigger ? 'event' : 'manual'
          }),
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        log(`⚠️ Could not write login activity log: ${logErr.message}`);
      }
    }

    // 4. PREPARE RESPONSE (return user data for UI)
    const response = {
      success: true,
      message: isNewUser ? 'User provisioned successfully' : 'Login processed successfully',
      data: {
        userId: userId,
        email: user?.email || userProfile?.email || null,
        name: user?.name || userProfile?.username || null,
        venue_id: userProfile?.venue_id || null,
        role: userProfile?.role || 'user',
  // Do not write legacy 'preferences' attribute; expose parsed prefs instead
  prefs: userProfile?.prefs ? JSON.parse(userProfile.prefs) : {},
        isNewUser: isNewUser,
        trigger: isEventTrigger ? 'event' : 'manual'
      }
    };

    log(`🎉 Auth & Setup Handler completed: ${isNewUser ? 'user created' : 'login processed'}`);
    return res.json(response);

  } catch (err) {
    error(`❌ Auth & Setup Handler failed: ${err.message}`);
    error(`Stack trace: ${err.stack}`);

    return res.json({
      success: false,
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Determine user role based on email patterns
 */
function determineUserRole(email) {
  const emailLower = email.toLowerCase();
  
  // Admin users
  const adminEmails = [
    'admin@djamms.app',
    'mike.clarkin@gmail.com',
    'admin@sysvir.com'
  ];
  
  // Developer users  
  const developerEmails = [
    'demo@djamms.app',
    'dev@djamms.app',
    'test@djamms.app'
  ];
  
  if (adminEmails.includes(emailLower)) {
    return 'admin';
  } else if (developerEmails.includes(emailLower)) {
    return 'developer';
  } else {
    return 'user';
  }
}