import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
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

async function createMinimalCollections() {
    console.log('🎵 Creating minimal collections for DJAMMS jukebox...');
    console.log(`Using database: ${DATABASE_ID}`);
    console.log(`Using endpoint: ${process.env.VITE_APPWRITE_ENDPOINT}`);
    console.log(`Using project: ${process.env.VITE_APPWRITE_PROJECT_ID}`);
    
    try {
        // Create jukebox_state collection
        console.log('Creating jukebox_state collection...');
        await databases.createCollection(
            DATABASE_ID,
            'jukebox_state',
            'Jukebox State',
            [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        
        // Add attributes to jukebox_state - All JukeboxState interface properties
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'instanceId', 100, true);
        await databases.createBooleanAttribute(DATABASE_ID, 'jukebox_state', 'isPlayerRunning', false);
        await databases.createBooleanAttribute(DATABASE_ID, 'jukebox_state', 'isPlayerPaused', false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'currentVideoId', 100, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'currentlyPlaying', 500, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'currentChannelTitle', 500, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'currentThumbnail', 500, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'currentVideoDuration', 50, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'lastPlayedVideoId', 100, false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'playerStatus', 50, true);
        await databases.createBooleanAttribute(DATABASE_ID, 'jukebox_state', 'isReadyForNextSong', false);
        await databases.createStringAttribute(DATABASE_ID, 'jukebox_state', 'lastUpdated', 100, true);
        await databases.createFloatAttribute(DATABASE_ID, 'jukebox_state', 'currentPosition', false);
        await databases.createFloatAttribute(DATABASE_ID, 'jukebox_state', 'totalDuration', false);
        await databases.createFloatAttribute(DATABASE_ID, 'jukebox_state', 'volume', false);
        
        console.log('✅ Created jukebox_state collection');

        // Create instance_states collection
        console.log('Creating instance_states collection...');
        await databases.createCollection(
            DATABASE_ID,
            'instance_states',
            'Instance States',
            [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        
        // Add attributes to instance_states - Keep minimal for player sync
        await databases.createStringAttribute(DATABASE_ID, 'instance_states', 'instance_id', 100, true);
        await databases.createBooleanAttribute(DATABASE_ID, 'instance_states', 'is_playing', false);
        await databases.createStringAttribute(DATABASE_ID, 'instance_states', 'current_video_id', 100, false);
        await databases.createFloatAttribute(DATABASE_ID, 'instance_states', 'current_time', false);
        await databases.createFloatAttribute(DATABASE_ID, 'instance_states', 'volume', false);
        
        console.log('✅ Created instance_states collection');
        
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
        
        console.log('🎉 Successfully created all minimal collections!');
        
    } catch (error) {
        console.error('❌ Error creating collections:', error);
        if (error.code === 409) {
            console.log('Collection may already exist - this is OK!');
        }
    }
}

createMinimalCollections();