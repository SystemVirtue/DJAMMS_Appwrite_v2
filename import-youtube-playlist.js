/**
 * Script to import YouTube playlist and update global default playlist and default venue
 * Fetches playlist items from YouTube API and updates Appwrite database
 */

import { Client, Databases } from 'node-appwrite';
import https from 'https';

// Configuration
const YOUTUBE_API_KEY = 'AIzaSyCdLbPNZnlHlXbk4XUUyp0of1G8_ru_Few';
const PLAYLIST_ID = 'PLJ7vMjpVbhBWLWJpweVDki43Wlcqzsqdu';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Initialize Appwrite client
const client = new Client()
	.setEndpoint('https://syd.cloud.appwrite.io/v1')
	.setProject('68cc86c3002b27e13947')
	.setKey('standard_25289fad1759542a75506309bd927c04928587ec211c9da1b7ab1817d5fb4a67e2aee4fcd29c36738d9fb2e2e8fe0379f7da761f150940a6d0fe6e89a08cc2d1e5cc95720132db4ed19a13396c9c779c467223c754acbc57abfb48469b866bfccce774903a8de9a93b55f65d2b30254447cb6664661d378b3722a979d9d71f92');

const databases = new Databases(client);
const DATABASE_ID = '68cc92d30024e1b6eeb6';

// Helper function to make HTTPS requests
function makeRequest(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const jsonData = JSON.parse(data);
					if (jsonData.error) {
						reject(new Error(`YouTube API Error: ${jsonData.error.message}`));
					} else {
						resolve(jsonData);
					}
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

// Fetch playlist items from YouTube API
async function fetchYouTubePlaylist(playlistId) {
	console.log('🎵 Fetching YouTube playlist items...');

	const url = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=50`;

	try {
		const response = await makeRequest(url);
		return response.items || [];
	} catch (error) {
		console.error('❌ Failed to fetch YouTube playlist:', error.message);
		throw error;
	}
}

// Transform YouTube API data to DJAMMS track format
function transformYouTubeDataToTracks(youtubeItems) {
	console.log(`🎵 Transforming ${youtubeItems.length} YouTube items to DJAMMS tracks...`);

	return youtubeItems.map((item, index) => {
		const snippet = item.snippet;
		const contentDetails = item.contentDetails;

		// Extract video ID from contentDetails
		const videoId = contentDetails.videoId;

		// Extract title and artist from snippet
		const title = snippet.title;
		const channelTitle = snippet.channelTitle;

		// Try to extract artist from title (common format: "Artist - Song Title")
		let artist = channelTitle;
		let cleanTitle = title;

		// Some titles have artist info in the title
		const dashIndex = title.indexOf(' - ');
		if (dashIndex > 0 && dashIndex < title.length - 10) {
			artist = title.substring(0, dashIndex).trim();
			cleanTitle = title.substring(dashIndex + 3).trim();
		}

		return {
			videoId: videoId,
			title: cleanTitle,
			artist: artist,
			channelTitle: channelTitle,
			duration: '0:00', // Will be populated if we can get duration
			order: index
		};
	});
}

// Fetch video durations for tracks
async function enrichTracksWithDuration(tracks) {
	console.log('🎵 Fetching video durations...');

	// YouTube API allows up to 50 video IDs per request
	const videoIds = tracks.map(track => track.videoId);
	const videoIdString = videoIds.join(',');

	const url = `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIdString}&key=${YOUTUBE_API_KEY}`;

	try {
		const response = await makeRequest(url);
		const videos = response.items || [];

		// Create a map of videoId to duration
		const durationMap = {};
		videos.forEach(video => {
			const duration = parseYouTubeDuration(video.contentDetails.duration);
			durationMap[video.id] = duration;
		});

		// Update tracks with durations
		return tracks.map(track => ({
			...track,
			duration: durationMap[track.videoId] || '0:00'
		}));

	} catch (error) {
		console.warn('⚠️ Failed to fetch video durations, using default durations:', error.message);
		return tracks;
	}
}

// Parse YouTube duration format (PT4M13S) to readable format (4:13)
function parseYouTubeDuration(duration) {
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

	if (!match) return '0:00';

	const hours = parseInt(match[1] || '0');
	const minutes = parseInt(match[2] || '0');
	const seconds = parseInt(match[3] || '0');

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update global default playlist in database
async function updateGlobalDefaultPlaylist(tracks) {
	console.log('💾 Updating global default playlist in database...');

	try {
		// First, try to find the existing global_default_playlist document
		let existingPlaylist = null;
		try {
			existingPlaylist = await databases.getDocument(DATABASE_ID, 'playlists', 'global_default_playlist');
			console.log('📋 Found existing global default playlist');
			console.log('📋 Existing attributes:', Object.keys(existingPlaylist));
		} catch (error) {
			console.log('📋 Global default playlist not found, will create new one');
		}

		// Use only the tracks field for update, keep other existing attributes
		const playlistData = {
			tracks: JSON.stringify(tracks),
			track_count: tracks.length
		};

		// Add name and description if creating new
		if (!existingPlaylist) {
			playlistData.name = 'Global Default Playlist';
			playlistData.description = 'Auto-imported from YouTube playlist';
		}

		if (existingPlaylist) {
			// Update existing playlist
			const updated = await databases.updateDocument(DATABASE_ID, 'playlists', 'global_default_playlist', playlistData);
			console.log('✅ Updated existing global default playlist');
			return updated;
		} else {
			// Create new playlist - try with minimal required fields
			try {
				const created = await databases.createDocument(DATABASE_ID, 'playlists', 'global_default_playlist', playlistData);
				console.log('✅ Created new global default playlist');
				return created;
			} catch (createError) {
				console.error('❌ Failed to create playlist, trying with just tracks field:', createError.message);
				// Try with just the tracks field
				const minimalData = {
					tracks: JSON.stringify(tracks)
				};
				const created = await databases.createDocument(DATABASE_ID, 'playlists', 'global_default_playlist', minimalData);
				console.log('✅ Created new global default playlist with minimal fields');
				return created;
			}
		}

	} catch (error) {
		console.error('❌ Failed to update global default playlist:', error);
		throw error;
	}
}

// Update default venue with new active queue
async function updateDefaultVenueActiveQueue(tracks) {
	console.log('🏛️ Updating default venue active_queue...');

	try {
		const venueData = {
			active_queue: JSON.stringify(tracks),
			last_updated: new Date().toISOString()
		};

		const updated = await databases.updateDocument(DATABASE_ID, 'venues', 'default', venueData);
		console.log('✅ Updated default venue active_queue');
		return updated;

	} catch (error) {
		console.error('❌ Failed to update default venue:', error);
		throw error;
	}
}

// Main execution function
async function importYouTubePlaylistAndUpdateDatabase() {
	try {
		console.log('🚀 Starting YouTube playlist import process...');
		console.log(`📺 Playlist ID: ${PLAYLIST_ID}`);

		// Step 1: Fetch playlist items from YouTube
		const youtubeItems = await fetchYouTubePlaylist(PLAYLIST_ID);
		console.log(`📥 Fetched ${youtubeItems.length} items from YouTube`);

		if (youtubeItems.length === 0) {
			throw new Error('No items found in the YouTube playlist');
		}

		// Step 2: Transform to DJAMMS track format
		let tracks = transformYouTubeDataToTracks(youtubeItems);

		// Step 3: Enrich with video durations
		tracks = await enrichTracksWithDuration(tracks);

		// Log some sample tracks
		console.log('🎵 Sample tracks:');
		tracks.slice(0, 3).forEach((track, index) => {
			console.log(`  ${index + 1}. "${track.title}" by ${track.artist} (${track.duration})`);
		});
		if (tracks.length > 3) {
			console.log(`  ... and ${tracks.length - 3} more tracks`);
		}

		// Step 4: Update global default playlist
		await updateGlobalDefaultPlaylist(tracks);

		// Step 5: Update default venue active_queue
		await updateDefaultVenueActiveQueue(tracks);

		console.log('🎉 Successfully imported YouTube playlist and updated database!');
		console.log(`📊 Total tracks imported: ${tracks.length}`);
		console.log(`🎵 Now playing will be: "${tracks[tracks.length - 1].title}" by ${tracks[tracks.length - 1].artist}`);

		return {
			success: true,
			tracksCount: tracks.length,
			tracks: tracks
		};

	} catch (error) {
		console.error('💥 Import process failed:', error);
		throw error;
	}
}

// Run the import if this script is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
	importYouTubePlaylistAndUpdateDatabase()
		.then((result) => {
			console.log('🎉 Import completed successfully!');
			process.exit(0);
		})
		.catch((error) => {
			console.error('💥 Import failed:', error);
			process.exit(1);
		});
}

export { importYouTubePlaylistAndUpdateDatabase };