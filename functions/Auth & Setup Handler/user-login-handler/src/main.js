/**
 * Get fallback tracks by loading the global_default_playlist from the database
 * (Synchronous fallback is not possible, so this must be called as async)
 */
async function getFallbackTracks(databases, databaseId, log) {
  try {
    const playlistDoc = await databases.getDocument(
      databaseId,
      'playlists',
      'global_default_playlist'
    );
    if (playlistDoc && playlistDoc.tracks) {
      const tracks = typeof playlistDoc.tracks === 'string' ? JSON.parse(playlistDoc.tracks) : playlistDoc.tracks;
      log(`🎵 Loaded fallback tracks from global_default_playlist: ${tracks.length} tracks`);
      return tracks;
    } else {
      log('⚠️ global_default_playlist found but has no tracks');
      return [];
    }
  } catch (err) {
    log(`❌ Failed to load global_default_playlist for fallback: ${err.message}`);
    return [];
  }
}
import { Client, Databases, Users, ID, Query } from 'node-appwrite';

/**
 * DJAMMS User Login Handler - Appwrite Function
 * 
 * Automatically triggers when a user creates a session (logs in).
 * Handles:
 * 1. User synchronization from Auth to djamms_users collection
 * 2. Player instance creation for dev-approved users  
 * 3. Active queue initialization with global default playlist
 * 4. User activity logging
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client with function environment
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  try {
    log('🚀 DJAMMS User Login Handler started');

    // Parse the webhook payload from session creation event
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      log(`📦 Received payload: ${JSON.stringify(payload)}`);
    } catch (parseError) {
      error(`❌ Failed to parse webhook payload: ${parseError.message}`);
      return res.json({ success: false, error: 'Invalid payload format' }, 400);
    }

    // Extract user ID from the event payload
    const userId = payload.userId || payload.$id;
    if (!userId) {
      error('❌ No userId found in webhook payload');
      return res.json({ success: false, error: 'Missing userId in payload' }, 400);
    }

    log(`👤 Processing login for user ID: ${userId}`);

    // Step 1: Get user details from Appwrite Auth
    let authUser;
    try {
      authUser = await users.get(userId);
      log(`📧 Retrieved user: ${authUser.email} (${authUser.name})`);
    } catch (userError) {
      error(`❌ Failed to get user from auth: ${userError.message}`);
      return res.json({ success: false, error: 'User not found in auth system' }, 404);
    }

    // Step 2: Sync user to djamms_users collection and ensure venue_id
    let djammsUser;
    try {
      djammsUser = await syncUserToDJAMMS(authUser, databases, DATABASE_ID, log);
      // If user has no venue_id, assign one and update
      if (!djammsUser.venue_id || typeof djammsUser.venue_id !== 'string' || !djammsUser.venue_id.trim()) {
        const newVenueId = `venue-${djammsUser.$id}`;
        await databases.updateDocument(
          DATABASE_ID,
          'djamms_users',
          djammsUser.$id,
          { venue_id: newVenueId }
        );
        djammsUser.venue_id = newVenueId;
        log(`🏷️ Assigned new venue_id: ${newVenueId}`);
      }
      log(`✅ User synced to DJAMMS database: ${djammsUser.$id} (venue_id: ${djammsUser.venue_id})`);
    } catch (syncError) {
      error(`❌ Failed to sync user: ${syncError.message}`);
      return res.json({ success: false, error: 'Failed to sync user to DJAMMS' }, 500);
    }

    // Step 3: Handle player instance creation for approved users using venue_id
    let playerInstance = null;
    if (djammsUser.devApproved) {
      // Ensure venue_id exists and is valid
      let venueId = djammsUser.venue_id;
      if (!venueId || typeof venueId !== 'string' || !venueId.trim() || /\s/.test(venueId)) {
        // In production, this would be a UI prompt; here, we simulate with a default or error
        error('❌ Venue ID missing or invalid. Venue ID must be unique, non-empty, and contain no spaces.');
        return res.json({ success: false, error: 'Venue ID missing or invalid. Please provide a unique Venue ID (no spaces).' }, 400);
      }
      try {
        log(`🎵 User is dev-approved, managing player instance for venue_id: ${venueId}...`);
        playerInstance = await ensurePlayerInstanceByVenueId(venueId, databases, DATABASE_ID, log);
        log(`✅ Player instance ready: ${playerInstance.instanceId}`);
      } catch (instanceError) {
        error(`❌ Failed to create player instance: ${instanceError.message}`);
        // Don't fail the entire login for instance creation errors
        log(`⚠️ Continuing without player instance...`);
      }
    } else {
      log(`⏳ User not dev-approved, skipping player instance creation`);
    }

    // Step 4: Update user's last login timestamp
    try {
      await databases.updateDocument(
        DATABASE_ID,
        'djamms_users',
        djammsUser.$id,
        {
          lastLoginAt: new Date().toISOString(),
          isActive: true
        }
      );
      log(`📅 Updated user last login timestamp`);
    } catch (updateError) {
      log(`⚠️ Failed to update last login: ${updateError.message}`);
    }

    // Step 4.5: Update auth user prefs with venue_id for frontend access
    try {
      const currentPrefs = authUser.prefs || {};
      log(`🔄 Current auth user prefs: ${JSON.stringify(currentPrefs)}`);
      log(`🔄 DJAMMS user venue_id: ${djammsUser.venue_id}`);
      if (currentPrefs.venue_id !== djammsUser.venue_id) {
        const newPrefs = {
          ...currentPrefs,
          venue_id: djammsUser.venue_id
        };
        log(`🔄 Updating auth user prefs to: ${JSON.stringify(newPrefs)}`);
        await users.updatePrefs(userId, newPrefs);
        log(`✅ Updated auth user prefs with venue_id: ${djammsUser.venue_id}`);
      } else {
        log(`ℹ️ Auth user prefs already have correct venue_id: ${currentPrefs.venue_id}`);
      }
    } catch (prefsError) {
      log(`❌ Failed to update auth user prefs: ${prefsError.message}`);
    }

    // Step 5: Log user activity
    try {
      await logUserActivity(djammsUser.$id, 'login', {
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown',
        hasPlayerInstance: !!playerInstance
      }, databases, DATABASE_ID, log);
    } catch (activityError) {
      log(`⚠️ Failed to log activity: ${activityError.message}`);
    }

    const response = {
      success: true,
      message: 'User login processed successfully',
      data: {
        userId: djammsUser.$id,
        email: djammsUser.email,
        name: djammsUser.name,
        userRole: djammsUser.userRole,
        devApproved: djammsUser.devApproved,
        hasPlayerInstance: !!playerInstance,
        playerInstanceId: playerInstance?.instanceId || null,
        processedAt: new Date().toISOString()
      }
    };

    log(`🎉 Login processing complete for ${authUser.email}`);
    log(`📊 Final state: approved=${djammsUser.devApproved}, instance=${!!playerInstance}`);

    return res.json(response);

  } catch (globalError) {
    error(`💥 Global error in login handler: ${globalError.message}`);
    error(`Stack trace: ${globalError.stack}`);
    
    return res.json({
      success: false,
      error: 'Internal server error during login processing',
      details: process.env.NODE_ENV === 'development' ? globalError.message : undefined
    }, 500);
  }
};

/**
 * Sync user from Appwrite Auth to djamms_users collection
 */
async function syncUserToDJAMMS(authUser, databases, databaseId, log) {
  try {
    // Check if user already exists in djamms_users
    const existingUsers = await databases.listDocuments(
      databaseId,
      'djamms_users',
      [Query.equal('email', authUser.email)]
    );

    if (existingUsers.total > 0) {
      const existingUser = existingUsers.documents[0];
      log(`👤 User already exists in djamms_users: ${authUser.email}`);
      // Update existing user with latest auth data
      try {
        const updatedUser = await databases.updateDocument(
          databaseId,
          'djamms_users',
          existingUser.$id,
          {
            name: authUser.name || existingUser.name,
            avatar: authUser.prefs?.avatar || existingUser.avatar,
            lastLoginAt: new Date().toISOString(),
            isActive: true
          }
        );
        log(`🔄 Updated existing user record`);
        return updatedUser;
      } catch (updateError) {
        log(`⚠️ Failed to update existing user, using cached version: ${updateError.message}`);
        return existingUser;
      }
    }

    // Determine user role and approval status based on email
    const userRole = determineUserRole(authUser.email);
    const devApproved = ['admin', 'developer'].includes(userRole);

    log(`🔑 Creating new djamms_user with role: ${userRole}, approved: ${devApproved}`);

    // Create new djamms_user record with venue_id
    const newVenueId = `venue-${ID.unique()}`;
    const newUser = await databases.createDocument(
      databaseId,
      'djamms_users',
      ID.unique(),
      {
        email: authUser.email,
        name: authUser.name || authUser.email.split('@')[0],
        avatar: authUser.prefs?.avatar || null,
        devApproved: devApproved,
        userRole: userRole,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        venue_id: newVenueId
      }
    );
    log(`✅ Created new djamms_user: ${newUser.$id} (${newUser.email}) with venue_id: ${newVenueId}`);
    return newUser;

  } catch (err) {
    log(`❌ Failed to sync user to DJAMMS: ${err.message}`);
    throw new Error(`User sync failed: ${err.message}`);
  }
}

/**
 * Ensure player instance exists for approved users
 */

// New: Ensure player instance by venue_id
async function ensurePlayerInstanceByVenueId(venueId, databases, databaseId, log) {
  try {
    // Check if venue already has an active player instance
    const existingInstances = await databases.listDocuments(
      databaseId,
      'player_instances',
      [
        Query.equal('venue_id', venueId),
        Query.equal('isActive', true)
      ]
    );

    if (existingInstances.total > 0) {
      const existingInstance = existingInstances.documents[0];
      log(`🎵 Venue already has active player instance: ${existingInstance.instanceId}`);
      // Update lastActiveAt timestamp
      try {
        await databases.updateDocument(
          databaseId,
          'player_instances',
          existingInstance.$id,
          {
            lastActiveAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        );
        log(`🔄 Updated player instance activity timestamp`);
      } catch (updateError) {
        log(`⚠️ Failed to update instance timestamp: ${updateError.message}`);
      }
      return existingInstance;
    }

    // Create new player instance
    const instanceId = `play-${venueId}-${Date.now()}`;
    log(`🎵 Creating new player instance: ${instanceId}`);

    const playerInstance = await databases.createDocument(
      databaseId,
      'player_instances',
      ID.unique(),
      {
        venue_id: venueId,
        instanceId: instanceId,
        instanceType: 'player',
        isActive: true,
        playerState: JSON.stringify({
          isPlaying: false,
          isPaused: false,
          currentVideoId: null,
          currentTitle: null,
          currentChannelTitle: null,
          currentThumbnail: null,
          currentPosition: 0,
          totalDuration: 0,
          volume: 80,
          playerStatus: 'ready',
          lastUpdated: new Date().toISOString()
        }),
        settings: JSON.stringify({
          autoplay: true,
          shuffle: false,
          repeat: 'off',
          defaultVolume: 80,
          showNotifications: true,
          darkMode: true,
          kioskMode: false,
          autoCreateQueue: true
        }),
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        venue_id: venueId
      }
    );

    log(`✅ Created player instance: ${instanceId}`);

    // Create active queue with global default playlist
    try {
      await createActiveQueueForInstance(instanceId, databases, databaseId, log);
    } catch (queueError) {
      log(`⚠️ Failed to create active queue: ${queueError.message}`);
      // Don't fail instance creation for queue errors
    }

    return playerInstance;

  } catch (err) {
    log(`❌ Failed to create player instance: ${err.message}`);
    throw new Error(`Player instance creation failed: ${err.message}`);
  }
}

/**
 * Create active queue and populate with global default playlist
 */
async function createActiveQueueForInstance(instanceId, databases, databaseId, log) {
  try {
    // Check if queue already exists
    const existingQueues = await databases.listDocuments(
      databaseId,
      'active_queues',
      [Query.equal('instanceId', instanceId)]
    );

    if (existingQueues.total > 0) {
      log(`🎵 Active queue already exists for instance: ${instanceId}`);
      return existingQueues.documents[0];
    }

    // Get global default playlist
    const defaultPlaylists = await databases.listDocuments(
      databaseId,
      'playlists',
      [Query.equal('isDefault', true)]
    );

    let sourcePlaylistId = 'global_default_playlist';
    let memoryPlaylist = [];

    if (defaultPlaylists.total > 0) {
      const defaultPlaylist = defaultPlaylists.documents[0];
      sourcePlaylistId = defaultPlaylist.$id;
      try {
        memoryPlaylist = JSON.parse(defaultPlaylist.tracks || '[]');
        log(`🎵 Using global default playlist: ${defaultPlaylist.name} (${memoryPlaylist.length} tracks)`);
      } catch (parseError) {
        log(`⚠️ Failed to parse playlist tracks, using fallback`);
        memoryPlaylist = await getFallbackTracks(databases, databaseId, log);
      }
    } else {
      log(`⚠️ No default playlist found, using fallback tracks`);
      memoryPlaylist = await getFallbackTracks(databases, databaseId, log);
    }

    // Create active queue
    const activeQueue = await databases.createDocument(
      databaseId,
      'active_queues',
      ID.unique(),
      {
        instanceId: instanceId,
        sourcePlaylistId: sourcePlaylistId,
        memoryPlaylist: JSON.stringify(memoryPlaylist),
        currentTrackIndex: 0,
        priorityQueue: JSON.stringify([]),
        isShuffled: false,
        shuffleSeed: 0,
        lastUpdated: new Date().toISOString()
      }
    );

    log(`✅ Created active queue for instance: ${instanceId} with ${memoryPlaylist.length} tracks`);
    return activeQueue;

  } catch (err) {
    log(`❌ Failed to create active queue: ${err.message}`);
    throw new Error(`Active queue creation failed: ${err.message}`);
  }
}

/**
 * Log user activity to user_activity collection
 */
async function logUserActivity(userId, activityType, metadata, databases, databaseId, log) {
  try {
    await databases.createDocument(
      databaseId,
      'user_activity',
      ID.unique(),
      {
        userId: userId,
        activityType: activityType,
        referenceId: `login-${Date.now()}`,
        metadata: JSON.stringify(metadata),
        timestamp: new Date().toISOString()
      }
    );
    log(`📝 Logged user activity: ${activityType}`);
  } catch (err) {
    log(`❌ Failed to log user activity: ${err.message}`);
    throw err;
  }
}

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
    'test@djamms.app',
    'djammsdemo@gmail.com'
  ];
  
  if (adminEmails.includes(emailLower)) {
    return 'admin';
  } else if (developerEmails.includes(emailLower)) {
    return 'developer';
  } else {
    return 'user';
  }
}

/**
 * Get fallback tracks when default playlist is not available
 */