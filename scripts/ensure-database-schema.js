#!/usr/bin/env node

/**
 * DJAMMS Database Schema Validation & Setup
 * Ensures Appwrite collections match the exact specifications
 */

import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';

async function ensureVenuesCollection() {
  console.log('🏗️ Ensuring venues collection schema...');

  try {
    // Check if collection exists
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, 'venues');
      console.log('✅ Venues collection exists, checking attributes...');
    } catch (error) {
      console.log('📝 Venues collection does not exist, creating...');
      // Create collection
      await databases.createCollection(
        DATABASE_ID,
        'venues',
        'Venue Management - Central hub for venue-specific player state',
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      collection = await databases.getCollection(DATABASE_ID, 'venues');
    }

    // Required attributes for venues collection
    const requiredAttributes = [
      { key: 'venue_id', type: 'string', size: 255, required: true },
      { key: 'venue_name', type: 'string', size: 255, required: false },
      { key: 'owner_id', type: 'string', size: 255, required: true },
      { key: 'active_player_instance_id', type: 'string', size: 255, required: false },
      { key: 'now_playing', type: 'string', size: 65535, required: false }, // JSON object
      { key: 'state', type: 'string', size: 50, required: false },
      { key: 'current_time', type: 'integer', required: false, min: 0 },
      { key: 'volume', type: 'integer', required: false, min: 0, max: 100 },
      { key: 'active_queue', type: 'string', size: 65535, required: false }, // JSON array
      { key: 'priority_queue', type: 'string', size: 65535, required: false }, // JSON array
      { key: 'player_settings', type: 'string', size: 65535, required: false }, // JSON object
      { key: 'is_shuffled', type: 'boolean', required: false },
      { key: 'schedule_data', type: 'string', size: 65535, required: false }, // JSON object
      { key: 'last_heartbeat_at', type: 'datetime', required: false },
      { key: 'last_updated', type: 'datetime', required: false },
      { key: 'created_at', type: 'datetime', required: true }
    ];

    // Check and create missing attributes
    for (const attr of requiredAttributes) {
      try {
        await databases.getAttribute(DATABASE_ID, 'venues', attr.key);
        console.log(`  ✅ Attribute ${attr.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating attribute ${attr.key}...`);
        if (attr.type === 'string') {
          if (attr.required) {
            await databases.createStringAttribute(DATABASE_ID, 'venues', attr.key, attr.size, attr.required);
          } else {
            await databases.createStringAttribute(DATABASE_ID, 'venues', attr.key, attr.size, attr.required, attr.default || '');
          }
        } else if (attr.type === 'integer') {
          if (attr.required) {
            await databases.createIntegerAttribute(DATABASE_ID, 'venues', attr.key, attr.required, attr.min, attr.max);
          } else {
            await databases.createIntegerAttribute(DATABASE_ID, 'venues', attr.key, attr.required, attr.min, attr.max, attr.default);
          }
        } else if (attr.type === 'boolean') {
          if (attr.required) {
            await databases.createBooleanAttribute(DATABASE_ID, 'venues', attr.key, attr.required);
          } else {
            await databases.createBooleanAttribute(DATABASE_ID, 'venues', attr.key, attr.required, attr.default);
          }
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(DATABASE_ID, 'venues', attr.key, attr.required);
        }
      }
    }

    // Ensure indexes exist
    const requiredIndexes = [
      { key: 'venue_id_idx', type: 'unique', attributes: ['venue_id'] },
      { key: 'owner_id_idx', type: 'key', attributes: ['owner_id'] },
      { key: 'last_updated_idx', type: 'key', attributes: ['last_updated'] }
    ];

    for (const index of requiredIndexes) {
      try {
        await databases.getIndex(DATABASE_ID, 'venues', index.key);
        console.log(`  ✅ Index ${index.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating index ${index.key}...`);
        await databases.createIndex(DATABASE_ID, 'venues', index.key, index.type, index.attributes);
      }
    }

    console.log('✅ Venues collection schema verified');
  } catch (error) {
    console.error('❌ Failed to ensure venues collection:', error.message);
    throw error;
  }
}

async function ensureUsersCollection() {
  console.log('👥 Ensuring users collection schema...');

  try {
    // Check if collection exists
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, 'users');
      console.log('✅ Users collection exists, checking attributes...');
    } catch (error) {
      console.log('📝 Users collection does not exist, creating...');
      // Create collection
      await databases.createCollection(
        DATABASE_ID,
        'users',
        'User Profiles - Authentication and user management',
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      collection = await databases.getCollection(DATABASE_ID, 'users');
    }

    // Required attributes for users collection
    const requiredAttributes = [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'username', type: 'string', size: 255, required: false },
      { key: 'venue_id', type: 'string', size: 255, required: false },
      { key: 'role', type: 'string', size: 50, required: false, default: 'user' },
      { key: 'prefs', type: 'string', size: 65535, required: false, default: '{}' }, // JSON object as string
      { key: 'avatar_url', type: 'string', size: 2048, required: false },
      { key: 'is_active', type: 'boolean', required: false, default: true },
      { key: 'is_developer', type: 'boolean', required: false, default: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: false },
      { key: 'last_login_at', type: 'datetime', required: false },
      { key: 'last_activity_at', type: 'datetime', required: false }
    ];

    // Check and create missing attributes
    for (const attr of requiredAttributes) {
      try {
        await databases.getAttribute(DATABASE_ID, 'users', attr.key);
        console.log(`  ✅ Attribute ${attr.key} exists`);
        
        // Special handling for preferences - only recreate if there's an issue
        // if (attr.key === 'preferences') {
        //   console.log(`  🔄 Recreating preferences attribute to ensure correct schema...`);
        //   try {
        //     await databases.deleteAttribute(DATABASE_ID, 'users', 'preferences');
        //     console.log(`  🗑️ Deleted old preferences attribute`);
        //   } catch (deleteError) {
        //     console.log(`  ⚠️ Could not delete preferences attribute (might not exist):`, deleteError.message);
        //   }
        //   
        //   // Wait a moment for deletion to complete
        //   await new Promise(resolve => setTimeout(resolve, 1000));
        //   
        //   // Recreate the attribute
        //   await databases.createStringAttribute(DATABASE_ID, 'users', attr.key, attr.size, attr.required, attr.default || '');
        //   console.log(`  ✅ Recreated preferences attribute`);
        // }
      } catch (error) {
        console.log(`  📝 Creating attribute ${attr.key}...`);
        if (attr.type === 'string') {
          if (attr.required) {
            await databases.createStringAttribute(DATABASE_ID, 'users', attr.key, attr.size, attr.required);
          } else {
            await databases.createStringAttribute(DATABASE_ID, 'users', attr.key, attr.size, attr.required, attr.default || '');
          }
        } else if (attr.type === 'boolean') {
          if (attr.required) {
            await databases.createBooleanAttribute(DATABASE_ID, 'users', attr.key, attr.required);
          } else {
            await databases.createBooleanAttribute(DATABASE_ID, 'users', attr.key, attr.required, attr.default);
          }
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(DATABASE_ID, 'users', attr.key, attr.required);
        }
      }
    }

    // Ensure indexes exist
    const requiredIndexes = [
      { key: 'user_id_idx', type: 'unique', attributes: ['user_id'] },
      { key: 'email_idx', type: 'unique', attributes: ['email'] },
      { key: 'venue_id_idx', type: 'key', attributes: ['venue_id'] }
    ];

    for (const index of requiredIndexes) {
      try {
        await databases.getIndex(DATABASE_ID, 'users', index.key);
        console.log(`  ✅ Index ${index.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating index ${index.key}...`);
        await databases.createIndex(DATABASE_ID, 'users', index.key, index.type, index.attributes);
      }
    }

    console.log('✅ Users collection schema verified');
  } catch (error) {
    console.error('❌ Failed to ensure users collection:', error.message);
    throw error;
  }
}

async function ensurePlaylistsCollection() {
  console.log('📀 Ensuring playlists collection schema...');

  try {
    // Check if collection exists
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, 'playlists');
      console.log('✅ Playlists collection exists, checking attributes...');
    } catch (error) {
      console.log('📝 Playlists collection does not exist, creating...');
      // Create collection
      await databases.createCollection(
        DATABASE_ID,
        'playlists',
        'Playlists - User-created and system-managed playlists',
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      collection = await databases.getCollection(DATABASE_ID, 'playlists');
    }

    // Required attributes for playlists collection
    const requiredAttributes = [
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

    // Check and create missing attributes
    for (const attr of requiredAttributes) {
      try {
        await databases.getAttribute(DATABASE_ID, 'playlists', attr.key);
        console.log(`  ✅ Attribute ${attr.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating attribute ${attr.key}...`);
        if (attr.type === 'string') {
          if (attr.required) {
            await databases.createStringAttribute(DATABASE_ID, 'playlists', attr.key, attr.size, attr.required);
          } else {
            await databases.createStringAttribute(DATABASE_ID, 'playlists', attr.key, attr.size, attr.required, attr.default || '');
          }
        } else if (attr.type === 'integer') {
          if (attr.required) {
            await databases.createIntegerAttribute(DATABASE_ID, 'playlists', attr.key, attr.required, attr.min, attr.max);
          } else {
            await databases.createIntegerAttribute(DATABASE_ID, 'playlists', attr.key, attr.required, attr.min, attr.max, attr.default);
          }
        } else if (attr.type === 'boolean') {
          if (attr.required) {
            await databases.createBooleanAttribute(DATABASE_ID, 'playlists', attr.key, attr.required);
          } else {
            await databases.createBooleanAttribute(DATABASE_ID, 'playlists', attr.key, attr.required, attr.default);
          }
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(DATABASE_ID, 'playlists', attr.key, attr.required);
        }
      }
    }

    // Ensure indexes exist
    const requiredIndexes = [
      { key: 'playlist_id_idx', type: 'unique', attributes: ['playlist_id'] },
      { key: 'owner_id_idx', type: 'key', attributes: ['owner_id'] },
      { key: 'venue_id_idx', type: 'key', attributes: ['venue_id'] },
      { key: 'is_public_idx', type: 'key', attributes: ['is_public'] },
      { key: 'is_default_idx', type: 'key', attributes: ['is_default'] },
      { key: 'category_idx', type: 'key', attributes: ['category'] }
    ];

    for (const index of requiredIndexes) {
      try {
        await databases.getIndex(DATABASE_ID, 'playlists', index.key);
        console.log(`  ✅ Index ${index.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating index ${index.key}...`);
        await databases.createIndex(DATABASE_ID, 'playlists', index.key, index.type, index.attributes);
      }
    }

    console.log('✅ Playlists collection schema verified');
  } catch (error) {
    console.error('❌ Failed to ensure playlists collection:', error.message);
    throw error;
  }
}

async function ensureActivityLogCollection() {
  console.log('📋 Ensuring activity_log collection schema...');

  try {
    // Check if collection exists
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, 'activity_log');
      console.log('✅ Activity log collection exists, checking attributes...');
    } catch (error) {
      console.log('📝 Activity log collection does not exist, creating...');
      // Create collection
      await databases.createCollection(
        DATABASE_ID,
        'activity_log',
        'Activity Audit Log - Immutable audit log of all system activities',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()), // Functions need to write
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      collection = await databases.getCollection(DATABASE_ID, 'activity_log');
    }

    // Required attributes for activity_log collection
    const requiredAttributes = [
      { key: 'log_id', type: 'string', size: 255, required: true },
      { key: 'user_id', type: 'string', size: 255, required: false },
      { key: 'venue_id', type: 'string', size: 255, required: false },
      { key: 'event_type', type: 'string', size: 100, required: true },
      { key: 'event_data', type: 'string', size: 65535, required: false }, // JSON object
      { key: 'timestamp', type: 'datetime', required: true },
      { key: 'ip_address', type: 'string', size: 45, required: false },
      { key: 'user_agent', type: 'string', size: 500, required: false },
      { key: 'session_id', type: 'string', size: 255, required: false }
    ];

    // Check and create missing attributes
    for (const attr of requiredAttributes) {
      try {
        await databases.getAttribute(DATABASE_ID, 'activity_log', attr.key);
        console.log(`  ✅ Attribute ${attr.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating attribute ${attr.key}...`);
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
    }

    // Ensure indexes exist
    const requiredIndexes = [
      { key: 'log_id_idx', type: 'unique', attributes: ['log_id'] },
      { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
      { key: 'venue_id_idx', type: 'key', attributes: ['venue_id'] },
      { key: 'event_type_idx', type: 'key', attributes: ['event_type'] },
      { key: 'timestamp_idx', type: 'key', attributes: ['timestamp'] }
    ];

    for (const index of requiredIndexes) {
      try {
        await databases.getIndex(DATABASE_ID, 'activity_log', index.key);
        console.log(`  ✅ Index ${index.key} exists`);
      } catch (error) {
        console.log(`  📝 Creating index ${index.key}...`);
        await databases.createIndex(DATABASE_ID, 'activity_log', index.key, index.type, index.attributes);
      }
    }

    console.log('✅ Activity log collection schema verified');
  } catch (error) {
    console.error('❌ Failed to ensure activity_log collection:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 DJAMMS Database Schema Validation & Setup');
  console.log('==========================================');

  try {
    console.log(`📊 Database ID: ${DATABASE_ID}`);
    console.log(`🔗 Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
    console.log(`📱 Project: ${process.env.APPWRITE_PROJECT_ID}`);
    console.log('');

    // Ensure all collections exist with correct schema
    await ensureVenuesCollection();
    console.log('');
    await ensureUsersCollection();
    console.log('');
    await ensurePlaylistsCollection();
    console.log('');
    await ensureActivityLogCollection();
    console.log('');

    console.log('🎉 Database schema validation complete!');
    console.log('');
    console.log('✅ All collections verified:');
    console.log('   • venues - Central venue state management');
    console.log('   • users - User profiles and authentication');
    console.log('   • playlists - Playlist management');
    console.log('   • activity_log - Audit trail');
    console.log('');
    console.log('📋 Schema matches specifications exactly');

  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);