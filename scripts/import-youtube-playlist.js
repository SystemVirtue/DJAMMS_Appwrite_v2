#!/usr/bin/env node

/**
 * Import YouTube Playlist Script
 * Creates a global default playlist and imports tracks from YouTube
 */

import { Client, Databases, Functions } from 'node-appwrite';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const YOUTUBE_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLJ7vMjpVbhBWLWJpweVDki43Wlcqzsqdu';
const PLAYLIST_NAME = 'global-default-playlist';

async function main() {
	console.log('🚀 DJAMMS YouTube Playlist Import');
	console.log('==================================');

	// Initialize Appwrite client
	const client = new Client()
		.setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
		.setProject(process.env.APPWRITE_PROJECT_ID)
		.setKey(process.env.APPWRITE_API_KEY);

	const databases = new Databases(client);
	const functions = new Functions(client);

	const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'djamms_db';

	try {
		console.log(`📊 Database ID: ${DATABASE_ID}`);
		console.log(`🔗 Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
		console.log(`📱 Project: ${process.env.APPWRITE_PROJECT_ID}`);
		console.log('');

		// Step 1: Create the global default playlist
		console.log('📀 Creating global default playlist...');

		const playlistData = {
			playlist_id: 'global_default_playlist',
			name: PLAYLIST_NAME,
			description: 'The default playlist for all users - imported from YouTube',
			owner_id: 'system', // System-owned playlist
			venue_id: null, // Global playlist
			is_public: true,
			is_default: true,
			is_starred: false,
			category: 'system',
			cover_image_url: null,
			tracks: '[]', // Empty JSON array initially
			track_count: 0,
			total_duration: 0,
			tags: '["global", "default", "system"]',
			play_count: 0,
			last_played_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		let playlist;
		try {
			// Try to create the playlist
			playlist = await databases.createDocument(
				DATABASE_ID,
				'playlists',
				'global_default_playlist', // Use specific ID
				playlistData
			);
			console.log('✅ Created playlist:', playlist.$id);
		} catch (error) {
			if (error.code === 409) {
				// Playlist already exists, get it
				console.log('📝 Playlist already exists, retrieving...');
				playlist = await databases.getDocument(
					DATABASE_ID,
					'playlists',
					'global_default_playlist'
				);
				console.log('✅ Retrieved existing playlist:', playlist.$id);
			} else {
				throw error;
			}
		}

		// Step 2: Call the import-playlist function
		console.log('');
		console.log('📥 Importing YouTube playlist tracks...');

		const functionPayload = {
			playlistId: playlist.$id,
			playlistUrl: YOUTUBE_PLAYLIST_URL
		};

		console.log('Function payload:', JSON.stringify(functionPayload, null, 2));

		const execution = await functions.createExecution(
			'import-playlist',
			JSON.stringify(functionPayload)
		);

		console.log('✅ Function execution started');
		console.log('Execution ID:', execution.$id);
		console.log('Status:', execution.status);

		// Wait a bit and check the execution status
		console.log('');
		console.log('⏳ Waiting for import to complete...');

		// Poll for completion (simple approach)
		let attempts = 0;
		const maxAttempts = 30; // 30 seconds max

		while (attempts < maxAttempts) {
			try {
				const status = await functions.getExecution('import-playlist', execution.$id);

				if (status.status === 'completed') {
					console.log('✅ Import completed successfully!');
					console.log('Response:', status.response);

					// Get the updated playlist to verify
					const updatedPlaylist = await databases.getDocument(
						DATABASE_ID,
						'playlists',
						playlist.$id
					);

					console.log('');
					console.log('📊 Final playlist status:');
					console.log(`   Name: ${updatedPlaylist.name}`);
					console.log(`   Track count: ${updatedPlaylist.track_count || 0}`);
					console.log(`   Total duration: ${updatedPlaylist.total_duration || 0} seconds`);

					break;
				} else if (status.status === 'failed') {
					console.log('❌ Import failed!');
					console.log('Error:', status.stderr);
					console.log('Response:', status.response);
					break;
				} else {
					console.log(`   Status: ${status.status} (attempt ${attempts + 1}/${maxAttempts})`);
					await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
					attempts++;
				}
			} catch (error) {
				console.log('Error checking execution status:', error.message);
				break;
			}
		}

		if (attempts >= maxAttempts) {
			console.log('⏰ Import is still running. Check the Appwrite console for completion.');
		}

		console.log('');
		console.log('🎉 YouTube playlist import process completed!');

	} catch (error) {
		console.error('❌ Error during playlist import:', error);
		process.exit(1);
	}
}

// Run the script
main().catch(console.error);