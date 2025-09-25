#!/usr/bin/env node

/**
 * DJAMMS Database Migration Script - Simplified Schema v2
 * 
 * This script will:
 * 1. Delete all existing collections (data will be lost)
 * 2. Create new simplified collection structure
 * 3. Set up attributes and indexes for optimal performance
 * 4. Create seed data for testing
 * 
 * IMPORTANT: This will destroy all existing data!
 * Make sure you have backups if needed.
 */

import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || ''); // Server API key required

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'djamms_db';

// Migration configuration
const MIGRATION_CONFIG = {
    deleteExistingCollections: true,
    createNewCollections: true,
    setupAttributes: true,
    setupIndexes: true,
    createSeedData: true
};

// Old collections to delete
const OLD_COLLECTIONS = [
    'memory_playlist',
    'priority_queue', 
    'instance_states',
    'jukebox_state',
    'user_playlist_favorites',
    'user_play_history',
    'enhanced_playlists',
    'user_instance_settings',
    'user_queues',
    'UserQueue',
    'playlists',
    'DJAMMS_Users',
    'requests',
    'instances'
];

// New simplified collections
const NEW_COLLECTIONS = {
    djamms_users: {
        name: 'DJAMMS Users',
        permissions: [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ]
    },
    player_instances: {
        name: 'Player Instances',
        permissions: [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ]
    },
    playlists: {
        name: 'Playlists',
        permissions: [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ]
    },
    active_queues: {
        name: 'Active Queues',
        permissions: [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ]
    },
    user_activity: {
        name: 'User Activity',
        permissions: [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
        ]
    }
};

class DatabaseMigration {
    constructor(databases, databaseId, config) {
        this.databases = databases;
        this.databaseId = databaseId;
        this.config = config;
        this.migrationLog = [];
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.migrationLog.push(logEntry);
        
        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${timestamp}] ${message}`);
    }

    async run() {
    try {
      console.log('🚀 Starting DJAMMS Database Migration to Simplified Schema v2');
      console.log('📋 Migration Config:', this.config);
      
      // Ensure database exists
      await this.ensureDatabaseExists();
      
      if (this.config.deleteExistingCollections) {
        console.log('🗑️ Phase 1: Deleting old collections...');
        await this.deleteOldCollections();
      }

      if (this.config.createNewCollections) {
        console.log('📦 Phase 2: Creating new simplified collections...');
        await this.createNewCollections();
      }

      if (this.config.setupAttributes) {
        console.log('🏗️ Phase 3: Setting up collection attributes...');
        await this.setupAttributes();
      }

      if (this.config.setupIndexes) {
        console.log('📊 Phase 4: Creating performance indexes...');
        await this.setupIndexes();
      }

      if (this.config.createSeedData) {
        console.log('🌱 Phase 5: Creating seed data...');
        await this.createSeedData();
      }

      console.log('');
      console.log('✅ Migration completed successfully!');
      console.log('📈 Database simplified from 14 → 5 collections');
      console.log('🎯 Ready for DJAMMS v3.0 Enhanced Architecture');

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      throw error;
    }
  }

  async ensureDatabaseExists() {
    try {
      // Try to get the database
      await this.databases.get(this.databaseId);
      console.log('✅ Database exists:', this.databaseId);
    } catch (error) {
      if (error.code === 404) {
        console.log('� Database not found, creating it...');
        try {
          await this.databases.create(this.databaseId, 'DJAMMS Database v3');
          console.log('✅ Database created successfully:', this.databaseId);
        } catch (createError) {
          console.error('❌ Failed to create database:', createError.message);
          throw createError;
        }
      } else {
        throw error;
      }
    }
  }

    async deleteOldCollections() {
        this.log('🗑️ Phase 1: Deleting old collections...', 'info');
        
        for (const collectionId of OLD_COLLECTIONS) {
            try {
                await databases.deleteCollection(DATABASE_ID, collectionId);
                this.log(`   Deleted collection: ${collectionId}`, 'success');
            } catch (error) {
                if (error.code === 404) {
                    this.log(`   Collection not found (skipping): ${collectionId}`, 'warning');
                } else {
                    this.log(`   Failed to delete collection ${collectionId}: ${error.message}`, 'error');
                }
            }
        }
    }

    async createNewCollections() {
        this.log('📦 Phase 2: Creating new simplified collections...', 'info');
        
        for (const [collectionId, config] of Object.entries(NEW_COLLECTIONS)) {
            try {
                // Check if collection already exists
                try {
                    await databases.getCollection(DATABASE_ID, collectionId);
                    this.log(`   Collection already exists (skipping): ${collectionId}`, 'warning');
                    continue;
                } catch (existsError) {
                    // Collection doesn't exist, create it
                    if (existsError.code !== 404) throw existsError;
                }
                
                const collection = await databases.createCollection(
                    DATABASE_ID,
                    collectionId,
                    config.name,
                    config.permissions,
                    true, // documentSecurity
                    true  // enabled
                );
                this.log(`   Created collection: ${collectionId} (${config.name})`, 'success');
            } catch (error) {
                this.log(`   Failed to create collection ${collectionId}: ${error.message}`, 'error');
                throw error;
            }
        }
    }

    async setupAttributes() {
        this.log('🔧 Phase 3: Setting up attributes...', 'info');
        
        // DJAMMS Users attributes
        await this.createAttributes('djamms_users', [
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'avatar', type: 'string', size: 2048, required: false },
                        { key: 'devApproved', type: 'boolean', required: false, default: false },
            { key: 'userRole', type: 'string', size: 50, required: true }, // 'admin', 'user', 'kiosk'
            { key: 'isActive', type: 'boolean', required: false, default: true },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'lastLoginAt', type: 'datetime', required: false }
        ]);

        // Player Instances attributes
        await this.createAttributes('player_instances', [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'instanceId', type: 'string', size: 255, required: true },
            { key: 'instanceType', type: 'enum', elements: ['player', 'kiosk'], required: false, default: 'player' },
            { key: 'isActive', type: 'boolean', required: false, default: true },
            { key: 'playerState', type: 'string', size: 65535, required: true }, // JSON object
            { key: 'settings', type: 'string', size: 65535, required: true }, // JSON object
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'lastActiveAt', type: 'datetime', required: true },
            { key: 'lastUpdated', type: 'datetime', required: true }
        ]);

        // Playlists attributes
        await this.createAttributes('playlists', [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'description', type: 'string', size: 2048, required: false },
            { key: 'thumbnail', type: 'string', size: 2048, required: false },
            { key: 'ownerId', type: 'string', size: 255, required: true },
            { key: 'visibility', type: 'enum', elements: ['private', 'public', 'system'], required: true, default: 'private' },
            { key: 'tracks', type: 'string', size: 65535, required: true }, // JSON array
            { key: 'trackCount', type: 'integer', required: false, default: 0 },
            { key: 'totalDuration', type: 'integer', required: false, default: 0 },
            { key: 'tags', type: 'string', size: 2048, required: false }, // JSON array
            { key: 'category', type: 'enum', elements: ['user', 'curated', 'generated', 'default'], required: false, default: 'user' },
            { key: 'isDefault', type: 'boolean', required: false, default: false },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'updatedAt', type: 'datetime', required: true }
        ]);

        // Active Queues attributes
        await this.createAttributes('active_queues', [
            { key: 'instanceId', type: 'string', size: 255, required: true },
            { key: 'sourcePlaylistId', type: 'string', size: 255, required: true },
            { key: 'memoryPlaylist', type: 'string', size: 65535, required: true }, // JSON array
            { key: 'currentTrackIndex', type: 'integer', required: false, default: 0 },
            { key: 'priorityQueue', type: 'string', size: 65535, required: true }, // JSON array
            { key: 'isShuffled', type: 'boolean', required: false, default: false },
            { key: 'shuffleSeed', type: 'integer', required: false, default: 0 },
            { key: 'lastUpdated', type: 'datetime', required: true }
        ]);

        // User Activity attributes
        await this.createAttributes('user_activity', [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'activityType', type: 'enum', elements: ['play_history', 'favorite', 'request'], required: true },
            { key: 'referenceId', type: 'string', size: 255, required: true }, // videoId, playlistId, etc.
            { key: 'metadata', type: 'string', size: 65535, required: true }, // JSON object with activity details
            { key: 'timestamp', type: 'datetime', required: true }
        ]);
    }

    async createAttributes(collectionId, attributes) {
        this.log(`   Setting up attributes for ${collectionId}...`, 'info');
        
        for (const attr of attributes) {
            try {
                // Check if attribute already exists
                try {
                    await databases.getAttribute(DATABASE_ID, collectionId, attr.key);
                    this.log(`     ↪ Attribute already exists (skipping): ${attr.key}`, 'warning');
                    continue;
                } catch (existsError) {
                    // Attribute doesn't exist, create it
                    if (existsError.code !== 404) throw existsError;
                }
        
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.required ? undefined : attr.default // No default for required fields
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.min,
                        attr.max,
                        attr.required ? undefined : attr.default // No default for required fields
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'enum') {
                    await databases.createEnumAttribute(
                        DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.elements,
                        attr.required,
                        attr.required ? undefined : attr.default // No default for required fields
                    );
                }

                this.log(`     ✓ Created attribute: ${attr.key} (${attr.type})`, 'success');
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                this.log(`     ✗ Failed to create attribute ${attr.key}: ${error.message}`, 'error');
                throw error;
            }
        }
    }

    async setupIndexes() {
        this.log('📊 Phase 4: Setting up indexes for performance...', 'info');
        
        const indexes = [
            // DJAMMS Users indexes
            { collection: 'djamms_users', key: 'email_idx', type: 'unique', attributes: ['email'] },
            { collection: 'djamms_users', key: 'dev_approved_idx', type: 'key', attributes: ['devApproved'] },
            { collection: 'djamms_users', key: 'active_users_idx', type: 'key', attributes: ['isActive'] },
            
            // Player Instances indexes
            { collection: 'player_instances', key: 'user_id_idx', type: 'key', attributes: ['userId'] },
            { collection: 'player_instances', key: 'instance_id_idx', type: 'unique', attributes: ['instanceId'] },
            { collection: 'player_instances', key: 'active_instances_idx', type: 'key', attributes: ['isActive'] },
            
            // Playlists indexes
            { collection: 'playlists', key: 'owner_idx', type: 'key', attributes: ['ownerId'] },
            { collection: 'playlists', key: 'visibility_idx', type: 'key', attributes: ['visibility'] },
            { collection: 'playlists', key: 'default_playlist_idx', type: 'key', attributes: ['isDefault'] },
            { collection: 'playlists', key: 'category_idx', type: 'key', attributes: ['category'] },
            
            // Active Queues indexes
            { collection: 'active_queues', key: 'instance_queue_idx', type: 'unique', attributes: ['instanceId'] },
            { collection: 'active_queues', key: 'source_playlist_idx', type: 'key', attributes: ['sourcePlaylistId'] },
            
            // User Activity indexes
            { collection: 'user_activity', key: 'user_activity_idx', type: 'key', attributes: ['userId', 'activityType'] },
            { collection: 'user_activity', key: 'activity_timestamp_idx', type: 'key', attributes: ['timestamp'], orders: ['desc'] },
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    index.collection,
                    index.key,
                    index.type,
                    index.attributes,
                    index.orders
                );
                this.log(`   ✓ Created index: ${index.key} on ${index.collection}`, 'success');
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                this.log(`   ✗ Failed to create index ${index.key}: ${error.message}`, 'error');
                // Don't throw error for indexes - continue with migration
            }
        }
    }

    async createSeedData() {
        this.log('🌱 Phase 5: Creating seed data...', 'info');
        
        try {
            // Create system default playlist (empty)
            const defaultPlaylist = {
                name: 'Global Default Playlist',
                description: 'System default playlist for all players',
                ownerId: 'system',
                visibility: 'system',
                tracks: JSON.stringify([]), // Empty playlist - no mock data
                trackCount: 0,
                totalDuration: 0,
                tags: JSON.stringify(['default', 'system']),
                category: 'default',
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await databases.createDocument(
                DATABASE_ID,
                'playlists',
                'global_default_playlist',
                defaultPlaylist
            );
            
            this.log('   ✓ Created global default playlist', 'success');

        } catch (error) {
            this.log(`   ✗ Failed to create seed data: ${error.message}`, 'error');
            // Don't throw error for seed data - continue with migration
        }
    }

    async generateMigrationReport() {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);
        
        const report = {
            migrationId: `djamms_v2_${this.startTime.toISOString().replace(/[:.]/g, '-')}`,
            startTime: this.startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: `${duration} seconds`,
            collections: {
                deleted: OLD_COLLECTIONS.length,
                created: Object.keys(NEW_COLLECTIONS).length
            },
            log: this.migrationLog,
            newSchema: {
                collections: Object.keys(NEW_COLLECTIONS),
                description: 'Simplified DJAMMS database with 5 core collections instead of 14'
            }
        };

        // Save migration report
        const fs = await import('fs/promises');
        await fs.writeFile(
            `/Users/mikeclarkin/DJAMMS_Appwrite_v2/scripts/migration-report-${report.migrationId}.json`,
            JSON.stringify(report, null, 2)
        );

        this.log(`📋 Migration report saved: migration-report-${report.migrationId}.json`, 'success');
        this.log(`⏱️ Total migration time: ${duration} seconds`, 'info');
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const migration = new DatabaseMigration(databases, DATABASE_ID, MIGRATION_CONFIG);
    migration.run().catch(console.error);
}

export { DatabaseMigration };