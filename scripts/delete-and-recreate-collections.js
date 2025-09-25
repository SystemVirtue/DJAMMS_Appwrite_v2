import { Client, Databases } from 'node-appwrite';

// Load environment variables
const client = new Client();
const databases = new Databases(client);

client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'djamms_db';

async function deleteAndRecreateCollections() {
    console.log('🗑️ Deleting existing collections...');
    
    try {
        // Delete existing collections
        console.log('Deleting jukebox_state collection...');
        await databases.deleteCollection(DATABASE_ID, 'jukebox_state');
        console.log('✅ Deleted jukebox_state collection');
        
        console.log('Deleting instance_states collection...');
        await databases.deleteCollection(DATABASE_ID, 'instance_states');
        console.log('✅ Deleted instance_states collection');
        
    } catch (error) {
        console.log('⚠️ Some collections may not exist - continuing...');
    }
    
    // Wait a moment for deletion to propagate
    console.log('⏳ Waiting for deletion to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now recreate with correct schema
    console.log('🎵 Creating collections with correct schema...');
    
    // Import and run the collection creation
    await import('./create-minimal-collections.js');
}

deleteAndRecreateCollections().catch(console.error);