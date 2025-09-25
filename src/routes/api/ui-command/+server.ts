/**
 * UI Command & Sync Hub - Venue-Centric API Route
 *
 * Handles all venue state operations from the frontend.
 * Processes commands like play_track, skip_next, update_now_playing, etc.
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { databases, DATABASE_ID } from '$lib/utils/appwrite';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { command, venueId, userId, data } = await request.json();

		if (!venueId || !userId) {
			throw error(400, 'Missing venueId or userId');
		}

		// Get current venue state
		const venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);

		let updateData: any = {};
		const now = new Date().toISOString();

		// Process command
		switch (command) {
			case 'play_track':
				if (!data?.track) throw error(400, 'Missing track data');
				updateData = {
					now_playing: JSON.stringify(data.track),
					state: 'playing',
					current_time: 0,
					last_updated: now
				};
				break;

			case 'pause':
				updateData = {
					state: 'paused',
					last_updated: now
				};
				break;

			case 'resume':
				updateData = {
					state: 'playing',
					last_updated: now
				};
				break;

			case 'skip_next':
				// Get next track from queue
				const activeQueue = venue.active_queue ? JSON.parse(venue.active_queue) : [];
				if (activeQueue.length > 0) {
					const nextTrack = activeQueue[0];
					const remainingQueue = activeQueue.slice(1);

					updateData = {
						now_playing: JSON.stringify(nextTrack),
						active_queue: JSON.stringify(remainingQueue),
						state: 'playing',
						current_time: 0,
						last_updated: now
					};
				}
				break;

			case 'add_to_queue':
				if (!data?.track) throw error(400, 'Missing track data');
				const currentQueue = venue.active_queue ? JSON.parse(venue.active_queue) : [];
				const updatedQueue = [...currentQueue, data.track];

				updateData = {
					active_queue: JSON.stringify(updatedQueue),
					last_updated: now
				};
				break;

			case 'remove_from_queue':
				if (!data?.index && data?.index !== 0) throw error(400, 'Missing queue index');
				const queueToModify = venue.active_queue ? JSON.parse(venue.active_queue) : [];
				const modifiedQueue = queueToModify.filter((_: any, i: number) => i !== data.index);

				updateData = {
					active_queue: JSON.stringify(modifiedQueue),
					last_updated: now
				};
				break;

			case 'update_now_playing':
				if (!data?.track) throw error(400, 'Missing track data');
				updateData = {
					now_playing: JSON.stringify(data.track),
					last_updated: now
				};
				break;

			case 'update_progress':
				if (typeof data?.position !== 'number') throw error(400, 'Missing position');
				updateData = {
					current_time: data.position,
					last_updated: now
				};
				break;

			case 'update_volume':
				if (typeof data?.volume !== 'number') throw error(400, 'Missing volume');
				updateData = {
					volume: data.volume,
					last_updated: now
				};
				break;

			case 'logout':
				// Handle logout - this might be handled differently
				break;

			default:
				throw error(400, `Unknown command: ${command}`);
		}

		// Update venue document if there are changes
		if (Object.keys(updateData).length > 0) {
			await databases.updateDocument(DATABASE_ID, 'venues', venueId, updateData);
		}

		return json({
			success: true,
			command,
			venueId,
			timestamp: now
		});

	} catch (err: any) {
		console.error('UI Command error:', err);
		throw error(500, err.message || 'Internal server error');
	}
};