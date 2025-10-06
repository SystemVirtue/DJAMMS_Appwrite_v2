// Jukebox Collections Setup Script
// Run this script to create the required Appwrite collections for the enhanced jukebox architecture

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || ''); // Requires API key for collection creation

const databases = new Databases(client);
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '';

async function createJukeboxCollections() {
    console.log('🎵 Setting up Jukebox Collections...');
    
    try {
        // 1. Create jukebox_state collection
        await createJukeboxStateCollection();
        
        // 2. Create priority_queue collection
        await createPriorityQueueCollection();
        
        // 3. Create memory_playlist collection
        await createMemoryPlaylistCollection();
        
        console.log('✅ All jukebox collections created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating collections:', error);
    }
}

async function createJukeboxStateCollection() {
    console.log('Creating jukebox_state collection...');
    
    try {
        const collection = await databases.createCollection(
            databaseId,
            'jukebox_state',
            'Jukebox State',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        );
        
        // Create attributes
        const attributes = [
            { key: 'isPlayerRunning', type: 'boolean', required: false, default: false },
            { key: 'isPlayerPaused', type: 'boolean', required: false, default: false },
            { key: 'currentVideoId', type: 'string', size: 255, required: false },
            { key: 'currentlyPlaying', type: 'string', size: 500, required: false },
            { key: 'lastPlayedVideoId', type: 'string', size: 255, required: false },
            { key: 'playerStatus', type: 'string', size: 50, required: false, default: 'ready' },
            { key: 'isReadyForNextSong', type: 'boolean', required: false, default: true },
            { key: 'instanceId', type: 'string', size: 255, required: true },
            { key: 'lastUpdated', type: 'datetime', required: false },
            { key: 'currentPosition', type: 'integer', required: false, default: 0 },
            { key: 'totalDuration', type: 'integer', required: false, default: 0 },
            { key: 'volume', type: 'integer', required: false, default: 80 }
        ];
        
        for (const attr of attributes) {
            if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required, 
                    attr.default
                );
            } else if (attr.type === 'string') {
                await databases.createStringAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.size, 
                    attr.required, 
                    attr.default
                );
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required, 
                    null, 
                    null, 
                    attr.default
                );
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required
                );
            }
            
            // Wait a bit between attribute creation
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ jukebox_state collection created');
        
    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️ jukebox_state collection already exists');
        } else {
            throw error;
        }
    }
}

async function createPriorityQueueCollection() {
    console.log('Creating priority_queue collection...');
    
    try {
        const collection = await databases.createCollection(
            databaseId,
            'priority_queue',
            'Priority Queue',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        );
        
        const attributes = [
            { key: 'videoId', type: 'string', size: 255, required: true },
            { key: 'title', type: 'string', size: 500, required: true },
            { key: 'channelTitle', type: 'string', size: 300, required: true },
            { key: 'thumbnail', type: 'string', size: 500, required: false },
            { key: 'duration', type: 'string', size: 50, required: false },
            { key: 'timestamp', type: 'datetime', required: true },
            { key: 'requestedBy', type: 'string', size: 255, required: false },
            { key: 'priority', type: 'integer', required: false, default: 1000 }
        ];
        
        for (const attr of attributes) {
            if (attr.type === 'string') {
                await databases.createStringAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.size, 
                    attr.required
                );
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required, 
                    null, 
                    null, 
                    attr.default
                );
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required
                );
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create indexes for performance
        await databases.createIndex(
            databaseId,
            collection.$id,
            'priority_timestamp',
            'key',
            ['priority', 'timestamp'],
            ['DESC', 'ASC']
        );
        
        console.log('✅ priority_queue collection created');
        
    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️ priority_queue collection already exists');
        } else {
            throw error;
        }
    }
}

async function createMemoryPlaylistCollection() {
    console.log('Creating memory_playlist collection...');
    
    try {
        const collection = await databases.createCollection(
            databaseId,
            'memory_playlist',
            'Memory Playlist',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        );
        
        const attributes = [
            { key: 'videoId', type: 'string', size: 255, required: true },
            { key: 'title', type: 'string', size: 500, required: true },
            { key: 'channelTitle', type: 'string', size: 300, required: true },
            { key: 'thumbnail', type: 'string', size: 500, required: false },
            { key: 'duration', type: 'string', size: 50, required: false },
            { key: 'lastPlayedTimestamp', type: 'datetime', required: false },
            { key: 'playCount', type: 'integer', required: false, default: 0 },
            { key: 'isActive', type: 'boolean', required: false, default: true },
            { key: 'shuffleOrder', type: 'integer', required: false, default: 0 }
        ];
        
        for (const attr of attributes) {
            if (attr.type === 'string') {
                await databases.createStringAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.size, 
                    attr.required
                );
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required, 
                    null, 
                    null, 
                    attr.default
                );
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required
                );
            } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(
                    databaseId, 
                    collection.$id, 
                    attr.key, 
                    attr.required, 
                    attr.default
                );
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create indexes for performance
        await databases.createIndex(
            databaseId,
            collection.$id,
            'active_lastplayed',
            'key',
            ['isActive', 'lastPlayedTimestamp'],
            ['ASC', 'ASC']
        );
        
        await databases.createIndex(
            databaseId,
            collection.$id,
            'shuffle_order',
            'key',
            ['shuffleOrder'],
            ['ASC']
        );
        
        console.log('✅ memory_playlist collection created');
        
    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️ memory_playlist collection already exists');
        } else {
            throw error;
        }
    }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    createJukeboxCollections();
}

export { createJukeboxCollections };