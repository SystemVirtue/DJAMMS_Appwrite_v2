import { Client, Databases, Permission, Role } from 'node-appwrite';
import { config } from 'dotenv';

// Load environment variables
config();

const client = new Client();
const databases = new Databases(client);

client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'djamms_db';

async function createMissingCollections() {
    console.log('🎵 Creating missing collections for DJAMMS jukebox...');
    console.log(`Using database: ${DATABASE_ID}`);
    
    try {
        // Create priority_queue collection
        console.log('Creating priority_queue collection...');
        await databases.createCollection(
            DATABASE_ID,
            'priority_queue',
            'Priority Queue',
            [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        
        // Add attributes to priority_queue - Based on PriorityQueueItem interface
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'videoId', 100, true);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'title', 500, true);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'channelTitle', 500, true);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'thumbnail', 500, false);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'duration', 50, false);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'timestamp', 100, true);
        await databases.createStringAttribute(DATABASE_ID, 'priority_queue', 'requestedBy', 100, false);
        await databases.createIntegerAttribute(DATABASE_ID, 'priority_queue', 'priority', true);
        
        console.log('✅ Created priority_queue collection');
        
    } catch (error) {
        console.log('⚠️ Priority queue collection may already exist:', error.type);
    }
    
    try {
        // Create memory_playlist collection  
        console.log('Creating memory_playlist collection...');
        await databases.createCollection(
            DATABASE_ID,
            'memory_playlist',
            'Memory Playlist',
            [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        
        // Add attributes to memory_playlist - Based on InMemoryPlaylistItem interface
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'videoId', 100, true);
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'title', 500, true);
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'channelTitle', 500, true);
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'thumbnail', 500, false);
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'duration', 50, false);
        await databases.createStringAttribute(DATABASE_ID, 'memory_playlist', 'lastPlayedTimestamp', 100, false);
        await databases.createIntegerAttribute(DATABASE_ID, 'memory_playlist', 'playCount', true);
        await databases.createBooleanAttribute(DATABASE_ID, 'memory_playlist', 'isActive', true);
        await databases.createIntegerAttribute(DATABASE_ID, 'memory_playlist', 'shuffleOrder', true);
        
        console.log('✅ Created memory_playlist collection');
        
    } catch (error) {
        console.log('⚠️ Memory playlist collection may already exist:', error.type);
    }
    
    console.log('🎉 Successfully processed all missing collections!');
}

createMissingCollections().catch(console.error);