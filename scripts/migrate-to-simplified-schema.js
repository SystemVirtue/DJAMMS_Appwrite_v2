#!/usr/bin/env node

/**
 * DJAMMS Simplified Architecture Migration - Stage 1
 * Database Migration & Foundation Setup
 *
 * This script creates the new simplified collections and migrates existing data.
 */

import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';

async function createVenuesCollection() {
  console.log('🏗️ Creating venues collection...');

  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      'venues',
      'Venue Management',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    // Add attributes
    const attributes = [
      { key: 'venue_id', type: 'string', size: 255, required: true },
      { key: 'venue_name', type: 'string', size: 255, required: false },
      { key: 'owner_id', type: 'string', size: 255, required: true },
      { key: 'active_player_instance_id', type: 'string', size: 255, required: false },
      { key: 'now_playing', type: 'string', size: 65535, required: false }, // JSON
      { key: 'state', type: 'string', size: 50, required: false },
      { key: 'current_time', type: 'integer', required: false, min: 0 },
      { key: 'volume', type: 'integer', required: false, min: 0, max: 100 },
      { key: 'active_queue', type: 'string', size: 65535, required: false }, // JSON array
      { key: 'priority_queue', type: 'string', size: 65535, required: false }, // JSON array
      { key: 'player_settings', type: 'string', size: 65535, required: false }, // JSON
      { key: 'is_shuffled', type: 'boolean', required: false },
      { key: 'last_heartbeat_at', type: 'datetime', required: false },
      { key: 'last_updated', type: 'datetime', required: false },
      { key: 'created_at', type: 'datetime', required: true }
    ];

    for (const attr of attributes) {
      if (attr.type === 'string') {
        if (attr.required) {
          await databases.createStringAttribute(DATABASE_ID, 'venues', attr.key, attr.size, attr.required);
        } else {
          await databases.createStringAttribute(DATABASE_ID, 'venues', attr.key, attr.size, attr.required, attr.default || '');
        }
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(DATABASE_ID, 'venues', attr.key, attr.required, attr.min, attr.max, attr.default);
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(DATABASE_ID, 'venues', attr.key, attr.required, attr.default);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(DATABASE_ID, 'venues', attr.key, attr.required);
      }
    }

    // Create indexes
    await databases.createIndex(DATABASE_ID, 'venues', 'venue_id_idx', 'unique', ['venue_id']);
    await databases.createIndex(DATABASE_ID, 'venues', 'owner_id_idx', 'key', ['owner_id']);
    await databases.createIndex(DATABASE_ID, 'venues', 'last_updated_idx', 'key', ['last_updated']);

    console.log('✅ Venues collection created successfully');
  } catch (error) {
    console.error('❌ Failed to create venues collection:', error.message);
    throw error;
  }
}

async function createUsersCollection() {
  console.log('👥 Creating users collection...');

  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      'users',
      'User Profiles',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    // Add attributes
    const attributes = [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'username', type: 'string', size: 255, required: false },
      { key: 'venue_id', type: 'string', size: 255, required: false },
      { key: 'role', type: 'string', size: 50, required: false, default: 'user' },
        // legacy 'preferences' attribute removed; use 'prefs' (stringified JSON)
        { key: 'prefs', type: 'string', size: 65535, required: false }, // JSON
      { key: 'avatar_url', type: 'string', size: 2048, required: false },
      { key: 'is_active', type: 'boolean', required: false, default: true },
      { key: 'is_developer', type: 'boolean', required: false, default: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'last_login_at', type: 'datetime', required: false },
      { key: 'last_activity_at', type: 'datetime', required: false }
    ];

    for (const attr of attributes) {
      if (attr.type === 'string') {
        if (attr.required) {
          await databases.createStringAttribute(DATABASE_ID, 'users', attr.key, attr.size, attr.required);
        } else {
          await databases.createStringAttribute(DATABASE_ID, 'users', attr.key, attr.size, attr.required, attr.default || '');
        }
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(DATABASE_ID, 'users', attr.key, attr.required, attr.default);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(DATABASE_ID, 'users', attr.key, attr.required);
      }
    }

    // Create indexes
    await databases.createIndex(DATABASE_ID, 'users', 'user_id_idx', 'unique', ['user_id']);
    await databases.createIndex(DATABASE_ID, 'users', 'email_idx', 'unique', ['email']);
    await databases.createIndex(DATABASE_ID, 'users', 'venue_id_idx', 'key', ['venue_id']);

    console.log('✅ Users collection created successfully');
  } catch (error) {
    console.error('❌ Failed to create users collection:', error.message);
    throw error;
  }
}

async function createPlaylistsCollection() {
  console.log('📀 Creating playlists collection...');

  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      'playlists',
      'Playlists',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    // Add attributes
    const attributes = [
      { key: 'playlist_id', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 2048, required: false },
      { key: 'owner_id', type: 'string', size: 255, required: true },
      { key: 'venue_id', type: 'string', size: 255, required: false },
      { key: 'is_public', type: 'boolean', required: false, default: false },
      { key: 'is_default', type: 'boolean', required: false, default: false },
      { key: 'is_starred', type: 'boolean', required: false, default: false },
      { key: 'category', type: 'string', size: 100, required: false, default: 'user' },
      { key: 'cover_image_url', type: 'string', size: 2048, required: false },
      { key: 'tracks', type: 'string', size: 65535, required: false }, // JSON array
      { key: 'track_count', type: 'integer', required: false, min: 0, default: 0 },
      { key: 'total_duration', type: 'integer', required: false, min: 0, default: 0 },
      { key: 'tags', type: 'string', size: 2048, required: false }, // JSON array
      { key: 'play_count', type: 'integer', required: false, min: 0, default: 0 },
      { key: 'last_played_at', type: 'datetime', required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ];

    for (const attr of attributes) {
      if (attr.type === 'string') {
        if (attr.required) {
          await databases.createStringAttribute(DATABASE_ID, 'playlists', attr.key, attr.size, attr.required);
        } else {
          await databases.createStringAttribute(DATABASE_ID, 'playlists', attr.key, attr.size, attr.required, attr.default || '');
        }
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(DATABASE_ID, 'playlists', attr.key, attr.required, attr.min, attr.max, attr.default);
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(DATABASE_ID, 'playlists', attr.key, attr.required, attr.default);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(DATABASE_ID, 'playlists', attr.key, attr.required);
      }
    }

    // Create indexes
    await databases.createIndex(DATABASE_ID, 'playlists', 'playlist_id_idx', 'unique', ['playlist_id']);
    await databases.createIndex(DATABASE_ID, 'playlists', 'owner_id_idx', 'key', ['owner_id']);
    await databases.createIndex(DATABASE_ID, 'playlists', 'venue_id_idx', 'key', ['venue_id']);
    await databases.createIndex(DATABASE_ID, 'playlists', 'is_public_idx', 'key', ['is_public']);
    await databases.createIndex(DATABASE_ID, 'playlists', 'is_default_idx', 'key', ['is_default']);
    await databases.createIndex(DATABASE_ID, 'playlists', 'category_idx', 'key', ['category']);

    console.log('✅ Playlists collection created successfully');
  } catch (error) {
    console.error('❌ Failed to create playlists collection:', error.message);
    throw error;
  }
}

async function createActivityLogCollection() {
  console.log('📋 Creating activity_log collection...');

  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      'activity_log',
      'Activity Audit Log',
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()), // Functions need to write
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );

    // Add attributes
    const attributes = [
      { key: 'log_id', type: 'string', size: 255, required: true },
      { key: 'user_id', type: 'string', size: 255, required: false },
      { key: 'venue_id', type: 'string', size: 255, required: false },
      { key: 'event_type', type: 'string', size: 100, required: true },
      { key: 'event_data', type: 'string', size: 65535, required: false }, // JSON
      { key: 'timestamp', type: 'datetime', required: true },
      { key: 'ip_address', type: 'string', size: 45, required: false },
      { key: 'user_agent', type: 'string', size: 500, required: false },
      { key: 'session_id', type: 'string', size: 255, required: false }
    ];

    for (const attr of attributes) {
      if (attr.type === 'string') {
        if (attr.required) {
          await databases.createStringAttribute(DATABASE_ID, 'activity_log', attr.key, attr.size, attr.required);
        } else {
          await databases.createStringAttribute(DATABASE_ID, 'activity_log', attr.key, attr.size, attr.required, attr.default || '');
        }
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(DATABASE_ID, 'activity_log', attr.key, attr.required);
      }
    }

    // Create indexes
    await databases.createIndex(DATABASE_ID, 'activity_log', 'log_id_idx', 'unique', ['log_id']);
    await databases.createIndex(DATABASE_ID, 'activity_log', 'user_id_idx', 'key', ['user_id']);
    await databases.createIndex(DATABASE_ID, 'activity_log', 'venue_id_idx', 'key', ['venue_id']);
    await databases.createIndex(DATABASE_ID, 'activity_log', 'event_type_idx', 'key', ['event_type']);
    await databases.createIndex(DATABASE_ID, 'activity_log', 'timestamp_idx', 'key', ['timestamp']);

    console.log('✅ Activity log collection created successfully');
  } catch (error) {
    console.error('❌ Failed to create activity_log collection:', error.message);
    throw error;
  }
}

async function migrateUserData() {
  console.log('👥 Migrating user data from djamms_users to users...');

  try {
    // Get all existing users
    const existingUsers = await databases.listDocuments(DATABASE_ID, 'djamms_users');

    for (const oldUser of existingUsers.documents) {
      // Transform to new schema
      const newUser = {
        user_id: oldUser.$id,
        email: oldUser.email,
        username: oldUser.name || (oldUser.email || '').split('@')[0],
        venue_id: oldUser.venue_id,
        role: oldUser.userRole || 'user',
        // Use 'prefs' (stringified JSON) instead of legacy 'preferences'
        prefs: JSON.stringify({
          theme: 'dark',
          notifications_enabled: true,
          default_volume: 80,
          auto_play: true
        }),
        avatar_url: oldUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${oldUser.email}`,
        is_active: oldUser.isActive !== false,
        is_developer: oldUser.devApproved || false,
        created_at: oldUser.createdAt || oldUser.$createdAt,
        last_login_at: oldUser.lastLoginAt,
        last_activity_at: new Date().toISOString()
      };

      // Create in new collection
      await databases.createDocument(DATABASE_ID, 'users', oldUser.$id, newUser);
    }

    console.log(`✅ Migrated ${existingUsers.documents.length} users`);
  } catch (error) {
    console.error('❌ Failed to migrate user data:', error.message);
    throw error;
  }
}

async function migrateVenueData() {
  console.log('🏢 Migrating venue data from player_instances to venues...');

  try {
    // Get all existing player instances
    const existingInstances = await databases.listDocuments(DATABASE_ID, 'player_instances');

    // Group by venue_id
    const venueMap = new Map();

    for (const instance of existingInstances.documents) {
      const venueId = instance.venue_id;
      if (!venueMap.has(venueId)) {
        venueMap.set(venueId, {
          venue_id: venueId,
          venue_name: `Venue ${venueId}`,
          owner_id: venueId, // Assuming venue_id matches user_id for simplicity
          active_player_instance_id: instance.instanceId,
          now_playing: JSON.stringify({}), // Empty initially
          state: 'ready',
          current_time: 0,
          volume: 80,
          active_queue: JSON.stringify([]),
          priority_queue: JSON.stringify([]),
          player_settings: instance.settings || JSON.stringify({
            repeat_mode: 'none',
            shuffle_enabled: false,
            crossfade_time: 3,
            master_volume: 80,
            is_muted: false
          }),
          is_shuffled: false,
          last_heartbeat_at: instance.lastActiveAt,
          last_updated: instance.lastUpdated,
          created_at: instance.$createdAt
        });
      }
    }

    // Create venue documents
    for (const venue of venueMap.values()) {
      await databases.createDocument(DATABASE_ID, 'venues', venue.venue_id, venue);
    }

    console.log(`✅ Migrated ${venueMap.size} venues`);
  } catch (error) {
    console.error('❌ Failed to migrate venue data:', error.message);
    throw error;
  }
}

async function migratePlaylistData() {
  console.log('📀 Migrating playlist data...');

  try {
    // Get all existing playlists
    const existingPlaylists = await databases.listDocuments(DATABASE_ID, 'playlists');

    for (const oldPlaylist of existingPlaylists.documents) {
      // Transform to new schema
      const newPlaylist = {
        playlist_id: oldPlaylist.$id,
        name: oldPlaylist.name,
        description: oldPlaylist.description,
        owner_id: oldPlaylist.ownerId,
        venue_id: oldPlaylist.venue_id || null,
        is_public: oldPlaylist.visibility === 'public',
        is_default: oldPlaylist.isDefault || false,
        is_starred: false, // New field
        category: oldPlaylist.category || 'user',
        cover_image_url: oldPlaylist.thumbnail,
        tracks: oldPlaylist.tracks || JSON.stringify([]),
        track_count: oldPlaylist.trackCount || 0,
        total_duration: oldPlaylist.totalDuration || 0,
        tags: oldPlaylist.tags || JSON.stringify([]),
        play_count: 0, // New field
        last_played_at: null,
        created_at: oldPlaylist.createdAt,
        updated_at: oldPlaylist.updatedAt
      };

      // Create in new collection
      await databases.createDocument(DATABASE_ID, 'playlists', oldPlaylist.$id, newPlaylist);
    }

    console.log(`✅ Migrated ${existingPlaylists.documents.length} playlists`);
  } catch (error) {
    console.error('❌ Failed to migrate playlist data:', error.message);
    throw error;
  }
}

async function migrateActivityData() {
  console.log('📋 Migrating activity data from user_activity to activity_log...');

  try {
    // Get all existing activities
    const existingActivities = await databases.listDocuments(DATABASE_ID, 'user_activity');

    for (const oldActivity of existingActivities.documents) {
      // Transform to new schema
      const newActivity = {
        log_id: oldActivity.$id,
        user_id: oldActivity.userId,
        venue_id: null, // Will be populated from context
        event_type: oldActivity.activityType,
        event_data: JSON.stringify({
          referenceId: oldActivity.referenceId,
          metadata: oldActivity.metadata
        }),
        timestamp: oldActivity.timestamp || oldActivity.$createdAt,
        ip_address: null,
        user_agent: null,
        session_id: null
      };

      // Create in new collection
      await databases.createDocument(DATABASE_ID, 'activity_log', oldActivity.$id, newActivity);
    }

    console.log(`✅ Migrated ${existingActivities.documents.length} activities`);
  } catch (error) {
    console.error('❌ Failed to migrate activity data:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting DJAMMS Simplified Architecture Migration - Stage 1');
  console.log('Database ID:', DATABASE_ID);
  console.log('');

  try {
    // Create new collections
    await createVenuesCollection();
    await createUsersCollection();
    await createPlaylistsCollection();
    await createActivityLogCollection();

    // Migrate data
    await migrateUserData();
    await migrateVenueData();
    await migratePlaylistData();
    await migrateActivityData();

    console.log('');
    console.log('🎉 Stage 1 Migration completed successfully!');
    console.log('✅ New collections created with optimized indexes');
    console.log('✅ All existing data migrated to new schema');
    console.log('✅ Ready for Stage 2: Core Functions & State Management');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('Please check your Appwrite credentials and try again.');
    process.exit(1);
  }
}

// Run the migration
runMigration();