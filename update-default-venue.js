/**
 * Script to update the 'default' venue with global default playlist data
 * Sets now_playing to the last song and active_queue to all songs from global-default-playlist
 */

import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
	.setEndpoint('https://syd.cloud.appwrite.io/v1')
	.setProject('68cc86c3002b27e13947')
	.setKey('standard_25289fad1759542a75506309bd927c04928587ec211c9da1b7ab1817d5fb4a67e2aee4fcd29c36738d9fb2e2e8fe0379f7da761f150940a6d0fe6e89a08cc2d1e5cc95720132db4ed19a13396c9c779c467223c754acbc57abfb48469b866bfccce774903a8de9a93b55f65d2b30254447cb6664661d378b3722a979d9d71f92'); // API Key for server-side access

const databases = new Databases(client);
const DATABASE_ID = '68cc92d30024e1b6eeb6';

// Hardcoded global default playlist data (fallback if we can't fetch it)
const DEFAULT_PLAYLIST_TRACKS = [
	{
		videoId: 'dQw4w9WgXcQ',
		title: 'Rick Astley - Never Gonna Give You Up',
		artist: 'Rick Astley',
		channelTitle: 'Rick Astley',
		duration: '3:33'
	},
	{
		videoId: '9bZkp7q19f0',
		title: 'PSY - GANGNAM STYLE',
		artist: 'PSY',
		channelTitle: 'officialpsy',
		duration: '4:13'
	},
	{
		videoId: 'hTWKbfoikeg',
		title: 'Nirvana - Smells Like Teen Spirit',
		artist: 'Nirvana',
		channelTitle: 'Nirvana',
		duration: '5:01'
	}
];

async function getGlobalDefaultPlaylist() {
	try {
		// Try to get the global default playlist from the database
		const playlists = await databases.listDocuments(DATABASE_ID, 'playlists', [
			// Assuming there's a field that marks it as global default
			// For now, we'll use the hardcoded fallback
		]);

		// Look for a playlist that might be marked as global default
		const globalPlaylist = playlists.documents.find(p =>
			p.name?.toLowerCase().includes('global') ||
			p.name?.toLowerCase().includes('default')
		);

		if (globalPlaylist && globalPlaylist.tracks) {
			const tracks = typeof globalPlaylist.tracks === 'string'
				? JSON.parse(globalPlaylist.tracks)
				: globalPlaylist.tracks;

			if (tracks && tracks.length > 0) {
				console.log(`📋 Found global playlist "${globalPlaylist.name}" with ${tracks.length} tracks`);
				return { name: globalPlaylist.name, tracks };
			}
		}

		// Fallback to hardcoded playlist
		console.log('📋 Using fallback default playlist with 3 tracks');
		return {
			name: 'Global Default Playlist',
			tracks: DEFAULT_PLAYLIST_TRACKS
		};

	} catch (error) {
		console.warn('⚠️ Could not fetch global playlist from database, using fallback:', error.message);
		return {
			name: 'Global Default Playlist',
			tracks: DEFAULT_PLAYLIST_TRACKS
		};
	}
}

async function updateDefaultVenueWithGlobalPlaylist() {
	try {
		console.log('🎵 Starting default venue update with global playlist...');

		// Get the global default playlist
		const globalPlaylist = await getGlobalDefaultPlaylist();

		if (!globalPlaylist.tracks || globalPlaylist.tracks.length === 0) {
			throw new Error('No tracks found in global playlist');
		}

		// Get the last song for now_playing
		const lastSong = globalPlaylist.tracks[globalPlaylist.tracks.length - 1];
		console.log(`🎵 Setting now_playing to: "${lastSong.title}" by ${lastSong.artist || lastSong.channelTitle || 'Unknown'}`);

		// Prepare the update data
		const updateData = {
			now_playing: JSON.stringify(lastSong),
			active_queue: JSON.stringify(globalPlaylist.tracks),
			last_updated: new Date().toISOString()
		};

		// Update the default venue
		console.log('💾 Updating default venue in database...');
		const updatedVenue = await databases.updateDocument(
			DATABASE_ID,
			'venues',
			'default',
			updateData
		);

		console.log('✅ Successfully updated default venue!');
		console.log(`🎵 Now playing: "${lastSong.title}"`);
		console.log(`📋 Active queue: ${globalPlaylist.tracks.length} tracks`);
		console.log('🔄 Last updated:', updatedVenue.last_updated);

		return {
			success: true,
			nowPlaying: lastSong,
			queueLength: globalPlaylist.tracks.length,
			venue: updatedVenue
		};

	} catch (error) {
		console.error('❌ Failed to update default venue:', error);
		throw error;
	}
}

// Run the update if this script is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
	updateDefaultVenueWithGlobalPlaylist()
		.then((result) => {
			console.log('🎉 Update completed successfully!');
			process.exit(0);
		})
		.catch((error) => {
			console.error('💥 Update failed:', error);
			process.exit(1);
		});
}

export { updateDefaultVenueWithGlobalPlaylist };