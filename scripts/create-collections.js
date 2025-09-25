import { Client, Databases } from 'node-appwrite';
import 'dotenv/config';

// Initialize the Appwrite client
const client = new Client();
const databases = new Databases(client);

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'djamms_db';

// Collection configurations
const collections = [
    {
        id: 'user_queues',
        name: 'User Queues',
        description: 'Manages user-specific playback queues per instance',
        attributes: [
            { key: 'user_id', type: 'string', size: 50, required: true },
            { key: 'instance_id', type: 'string', size: 100, required: true },
            { key: 'queue_tracks', type: 'string', size: 100000, required: true },
            { key: 'current_index', type: 'integer', required: true, min: 0 },
            { key: 'shuffle_enabled', type: 'boolean', required: false, default: false },
            { key: 'repeat_mode', type: 'enum', required: false, elements: ['none', 'one', 'all'], default: 'none' },
            { key: 'last_updated', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
            { key: 'instance_id_idx', type: 'key', attributes: ['instance_id'] },
            { key: 'user_instance_unique', type: 'unique', attributes: ['user_id', 'instance_id'] }
        ]
    },
    {
        id: 'user_instance_settings',
        name: 'User Instance Settings',
        description: 'User preferences and settings per player instance',
        attributes: [
            { key: 'user_id', type: 'string', size: 50, required: true },
            { key: 'instance_id', type: 'string', size: 100, required: true },
            { key: 'audio_quality', type: 'enum', required: false, elements: ['auto', 'high', 'medium', 'low'], default: 'auto' },
            { key: 'crossfade_duration', type: 'integer', required: false, min: 0, max: 10, default: 3 },
            { key: 'auto_play', type: 'boolean', required: false, default: true },
            { key: 'volume_level', type: 'integer', required: false, min: 0, max: 100, default: 80 },
            { key: 'theme_preference', type: 'string', size: 50, required: false, default: 'dark' },
            { key: 'notification_enabled', type: 'boolean', required: false, default: true },
            { key: 'last_updated', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
            { key: 'instance_id_idx', type: 'key', attributes: ['instance_id'] },
            { key: 'user_instance_unique', type: 'unique', attributes: ['user_id', 'instance_id'] }
        ]
    },
    {
        id: 'enhanced_playlists',
        name: 'Enhanced Playlists',
        description: 'Enhanced playlist structure with categorization and metadata',
        attributes: [
            { key: 'user_id', type: 'string', size: 50, required: true },
            { key: 'name', type: 'string', size: 200, required: true },
            { key: 'description', type: 'string', size: 1000, required: false },
            { key: 'tracks', type: 'string', size: 100000, required: true },
            { key: 'tags', type: 'string', size: 500, required: false },
            { key: 'category', type: 'string', size: 100, required: false, default: 'general' },
            { key: 'is_public', type: 'boolean', required: false, default: false },
            { key: 'is_featured', type: 'boolean', required: false, default: false },
            { key: 'created_by_admin', type: 'boolean', required: false, default: false },
            { key: 'play_count', type: 'integer', required: false, min: 0, default: 0 },
            { key: 'total_duration', type: 'integer', required: false, min: 0, default: 0 },
            { key: 'created_at', type: 'datetime', required: true },
            { key: 'updated_at', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
            { key: 'is_public_idx', type: 'key', attributes: ['is_public'] },
            { key: 'category_idx', type: 'key', attributes: ['category'] },
            { key: 'is_featured_idx', type: 'key', attributes: ['is_featured'] },
            { key: 'created_by_admin_idx', type: 'key', attributes: ['created_by_admin'] },
            { key: 'user_name_unique', type: 'unique', attributes: ['user_id', 'name'] }
        ]
    },
    {
        id: 'user_play_history',
        name: 'User Play History',
        description: 'Track user listening history and analytics',
        attributes: [
            { key: 'user_id', type: 'string', size: 50, required: true },
            { key: 'instance_id', type: 'string', size: 100, required: true },
            { key: 'track_id', type: 'string', size: 100, required: true },
            { key: 'playlist_id', type: 'string', size: 50, required: false },
            { key: 'track_title', type: 'string', size: 200, required: true },
            { key: 'track_artist', type: 'string', size: 200, required: true },
            { key: 'track_duration', type: 'integer', required: true, min: 0 },
            { key: 'played_duration', type: 'integer', required: true, min: 0 },
            { key: 'completion_percentage', type: 'integer', required: true, min: 0, max: 100 },
            { key: 'played_at', type: 'datetime', required: true },
            { key: 'session_id', type: 'string', size: 100, required: false },
            { key: 'was_skipped', type: 'boolean', required: false, default: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
            { key: 'played_at_idx', type: 'key', attributes: ['played_at'], orders: ['DESC'] },
            { key: 'instance_id_idx', type: 'key', attributes: ['instance_id'] },
            { key: 'playlist_id_idx', type: 'key', attributes: ['playlist_id'] },
            { key: 'user_played_at', type: 'key', attributes: ['user_id', 'played_at'] }
        ]
    },
    {
        id: 'user_playlist_favorites',
        name: 'User Playlist Favorites',
        description: 'User favorites and personal playlist organization',
        attributes: [
            { key: 'user_id', type: 'string', size: 50, required: true },
            { key: 'playlist_id', type: 'string', size: 50, required: true },
            { key: 'is_favorite', type: 'boolean', required: false, default: true },
            { key: 'personal_rating', type: 'integer', required: false, min: 1, max: 5 },
            { key: 'custom_tags', type: 'string', size: 500, required: false },
            { key: 'added_at', type: 'datetime', required: true },
            { key: 'last_accessed', type: 'datetime', required: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
            { key: 'playlist_id_idx', type: 'key', attributes: ['playlist_id'] },
            { key: 'is_favorite_idx', type: 'key', attributes: ['is_favorite'] },
            { key: 'user_playlist_unique', type: 'unique', attributes: ['user_id', 'playlist_id'] }
        ]
    }
];

// Helper function to create attributes
async function createAttribute(collectionId, attribute) {
    try {
        let result;
        
        switch (attribute.type) {
            case 'string':
                result = await databases.createStringAttribute(
                    DATABASE_ID,
                    collectionId,
                    attribute.key,
                    attribute.size,
                    attribute.required,
                    attribute.default || null
                );
                break;
                
            case 'integer':
                result = await databases.createIntegerAttribute(
                    DATABASE_ID,
                    collectionId,
                    attribute.key,
                    attribute.required,
                    attribute.min,
                    attribute.max,
                    attribute.default || null
                );
                break;
                
            case 'boolean':
                result = await databases.createBooleanAttribute(
                    DATABASE_ID,
                    collectionId,
                    attribute.key,
                    attribute.required,
                    attribute.default || null
                );
                break;
                
            case 'datetime':
                result = await databases.createDatetimeAttribute(
                    DATABASE_ID,
                    collectionId,
                    attribute.key,
                    attribute.required,
                    attribute.default || null
                );
                break;
                
            case 'enum':
                result = await databases.createEnumAttribute(
                    DATABASE_ID,
                    collectionId,
                    attribute.key,
                    attribute.elements,
                    attribute.required,
                    attribute.default || null
                );
                break;
        }
        
        console.log(`✅ Created attribute: ${attribute.key} (${attribute.type})`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to create attribute ${attribute.key}:`, error.message);
        throw error;
    }
}

// Helper function to create indexes
async function createIndex(collectionId, index) {
    try {
        const result = await databases.createIndex(
            DATABASE_ID,
            collectionId,
            index.key,
            index.type,
            index.attributes,
            index.orders || []
        );
        console.log(`✅ Created index: ${index.key} (${index.type})`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to create index ${index.key}:`, error.message);
        throw error;
    }
}

// Main function to create collections
async function createCollections() {
    console.log('🚀 Starting collection creation process...\n');
    
    for (const collection of collections) {
        try {
            console.log(`📦 Creating collection: ${collection.name} (${collection.id})`);
            
            // Create the collection
            await databases.createCollection(
                DATABASE_ID,
                collection.id,
                collection.name,
                undefined, // permissions will be set later
                false, // documentSecurity
                true   // enabled
            );
            
            console.log(`✅ Collection created: ${collection.name}`);
            
            // Wait a moment for collection to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create attributes
            console.log(`📝 Creating attributes for ${collection.name}...`);
            for (const attribute of collection.attributes) {
                await createAttribute(collection.id, attribute);
                // Small delay between attribute creation
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Wait for attributes to be ready before creating indexes
            console.log(`⏳ Waiting for attributes to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Create indexes
            console.log(`🔍 Creating indexes for ${collection.name}...`);
            for (const index of collection.indexes) {
                await createIndex(collection.id, index);
                // Small delay between index creation
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log(`✅ Completed: ${collection.name}\n`);
            
        } catch (error) {
            console.error(`❌ Failed to create collection ${collection.name}:`, error.message);
            
            // If collection already exists, try to continue with attributes
            if (error.message.includes('already exists')) {
                console.log(`⚠️  Collection ${collection.name} already exists, attempting to add missing attributes...`);
                
                try {
                    // Try to create attributes (will fail if they exist)
                    for (const attribute of collection.attributes) {
                        try {
                            await createAttribute(collection.id, attribute);
                            await new Promise(resolve => setTimeout(resolve, 200));
                        } catch (attrError) {
                            if (attrError.message.includes('already exists')) {
                                console.log(`⚠️  Attribute ${attribute.key} already exists`);
                            } else {
                                console.error(`❌ Failed to create attribute ${attribute.key}:`, attrError.message);
                            }
                        }
                    }
                    
                    // Try to create indexes (will fail if they exist)
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    for (const index of collection.indexes) {
                        try {
                            await createIndex(collection.id, index);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (indexError) {
                            if (indexError.message.includes('already exists')) {
                                console.log(`⚠️  Index ${index.key} already exists`);
                            } else {
                                console.error(`❌ Failed to create index ${index.key}:`, indexError.message);
                            }
                        }
                    }
                    
                } catch (nestedError) {
                    console.error(`❌ Error processing existing collection:`, nestedError.message);
                }
            }
        }
    }
    
    console.log('🎉 Collection creation process completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check Appwrite Console to verify collections');
    console.log('2. Configure permissions as needed');
    console.log('3. Test basic CRUD operations');
    console.log('4. Update your TypeScript interfaces');
}

// Run the script
createCollections().catch(console.error);

export { createCollections };