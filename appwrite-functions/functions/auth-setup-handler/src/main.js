import { Client, Databases, Users, ID, Query } from 'node-appwrite';

/**
 * DJAMMS Auth & Setup Handler - Appwrite Function
 *
 * Handles user provisioning and venue creation on login.
 * Triggers on user session creation.
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  try {
    log('🚀 Auth & Setup Handler started');

    // Get user from context (function triggered by user session create)
    const userId = req.headers['x-appwrite-user-id'];
    if (!userId) {
      log('❌ No user ID in request headers');
      return res.json({ success: false, message: 'No user ID provided' });
    }

    log(`👤 Processing user: ${userId}`);

    // Get user details from Auth
    const user = await users.get(userId);
    log(`📧 User email: ${user.email}`);

    // Check if user exists in users collection
    let existingUser;
    try {
      existingUser = await databases.getDocument(DATABASE_ID, 'users', userId);
      log('✅ User already exists in users collection');
    } catch (err) {
      log('👤 User not found in users collection, creating profile...');
    }

    if (!existingUser) {
      // Create user profile
      const userProfile = {
        user_id: userId,
        email: user.email,
        username: user.name || user.email.split('@')[0],
        venue_id: `venue_${userId}`, // Default personal venue
        role: 'user',
        preferences: JSON.stringify({
          theme: 'dark',
          notifications_enabled: true,
          default_volume: 80,
          auto_play: true
        }),
        avatar_url: user.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        is_active: true,
        is_developer: false,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      };

      await databases.createDocument(DATABASE_ID, 'users', userId, userProfile);
      log('✅ User profile created');

      // Create default venue for user
      const venueId = `venue_${userId}`;
      let venueExists = false;
      try {
        await databases.getDocument(DATABASE_ID, 'venues', venueId);
        venueExists = true;
        log('✅ Venue already exists');
      } catch (err) {
        log('🏢 Venue not found, creating default venue...');
      }

      if (!venueExists) {
        const venue = {
          venue_id: venueId,
          venue_name: `${user.name || user.email.split('@')[0]}'s Venue`,
          owner_id: userId,
          active_player_instance_id: null,
          now_playing: JSON.stringify({}),
          state: 'ready',
          current_time: 0,
          volume: 80,
          active_queue: JSON.stringify([]),
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
          created_at: new Date().toISOString()
        };

        await databases.createDocument(DATABASE_ID, 'venues', venueId, venue);
        log('✅ Default venue created');
      }

      // Log activity
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        log_id: ID.unique(),
        user_id: userId,
        venue_id: venueId,
        event_type: 'user_provisioned',
        event_data: JSON.stringify({
          action: 'user_created',
          venue_created: !venueExists
        }),
        timestamp: new Date().toISOString()
      });

    } else {
      // Update last login
      await databases.updateDocument(DATABASE_ID, 'users', userId, {
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      });
      log('✅ User login timestamp updated');
    }

    log('🎉 Auth & Setup Handler completed successfully');
    return res.json({
      success: true,
      message: 'User setup completed',
      userId: userId
    });

  } catch (err) {
    error(`❌ Auth & Setup Handler failed: ${err.message}`);
    return res.json({
      success: false,
      message: err.message
    });
  }
};