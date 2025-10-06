/**
 * UI Command & Sync Hub - Venue-Centric API Route
 *
 * Handles all venue state operations from the frontend.
 * Processes commands like play_track, skip_next, advance_queue, update_now_playing, etc.
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { databases, DATABASE_ID } from '$lib/utils/appwrite';
import { successResponse, errorResponse } from '$lib/utils/apiResponse';
import { getAuthContext, isOwnerOrAdmin } from '$lib/utils/auth';

// TODO (FIX 8C): Enforce venue ownership using authentication context (ownerId) rather than request body.
// This route currently expects `userId` in the body; replace with validated auth context in future.

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { command, venueId, userId, data } = await request.json();

		// derive auth context - now supports Appwrite JWT verification in getAuthContext/verifyAppwriteJWT
		const auth = getAuthContext(request);

		// Require venueId and either a userId (legacy) or a bearer token (Appwrite JWT)
		if (!venueId || (!userId && !auth?.bearer)) {
			return new Response(JSON.stringify(errorResponse({ code: 'MISSING_PARAMS', message: 'Missing venueId or authentication credentials' })), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}

		// Get current venue state
		const venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);

		let updateData: any = {};
		const now = new Date().toISOString();

		// Process command
		switch (command) {
			case 'play_track':
				console.log('🎵 UI Command: play_track', { venueId, userId, track: data?.track?.title });
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
				// Owner/admin required to remove arbitrary items from queue (Fix 8C enforcement)
				if (!await isOwnerOrAdmin(auth, venue)) return new Response(JSON.stringify(errorResponse({ code: 'UNAUTHORIZED', message: 'Owner credentials required to remove queue items' })), { status: 403, headers: { 'Content-Type': 'application/json' } });
				if (typeof data?.index !== 'number') return new Response(JSON.stringify(errorResponse({ code: 'MISSING_PARAMS', message: 'Missing queue index' })), { status: 400, headers: { 'Content-Type': 'application/json' } });
				const queueToModify = venue.active_queue ? JSON.parse(venue.active_queue) : [];
				const modifiedQueue = queueToModify.filter((_: any, i: number) => i !== data.index);

				updateData = {
					active_queue: JSON.stringify(modifiedQueue),
					last_updated: now
				};
				break;

			case 'reorder_queue':
				// Only owner/admin may reorder the queue
				if (!await isOwnerOrAdmin(auth, venue)) return new Response(JSON.stringify(errorResponse({ code: 'UNAUTHORIZED', message: 'Owner credentials required for reorder' })), { status: 403, headers: { 'Content-Type': 'application/json' } });
				if (!data?.newQueue) return new Response(JSON.stringify(errorResponse({ code: 'MISSING_PARAMS', message: 'Missing new queue data' })), { status: 400, headers: { 'Content-Type': 'application/json' } });
				updateData = {
					active_queue: JSON.stringify(data.newQueue),
					last_updated: now
				};
				break;

			case 'advance_queue':
				if (!data?.nowPlaying || !data?.activeQueue) throw error(400, 'Missing nowPlaying or activeQueue data');
				console.log('🎵 UI Command: advance_queue', { venueId, nowPlaying: data.nowPlaying.title, queueLength: data.activeQueue.length });
				updateData = {
					now_playing: JSON.stringify(data.nowPlaying),
					active_queue: JSON.stringify(data.activeQueue),
					state: 'playing',
					current_time: 0,
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

			case 'update_player_state':
				console.log('🎵 UI Command: update_player_state', { venueId, status: data?.status, position: data?.position });
				if (!data?.status) throw error(400, 'Missing status');
				updateData = {
					state: data.status,
					current_time: data.position || 0,
					last_updated: now
				};
				break;

			case 'update_player_position':
				console.log('🎵 UI Command: update_player_position', { venueId, position: data?.position });
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

		return json(successResponse({ command, venueId, timestamp: now }));

	} catch (err: any) {
		console.error('UI Command error:', err);
		const resp = errorResponse({ code: err?.code || 'UI_COMMAND_ERROR', message: err?.message || 'Internal server error', details: err });
		// Use SvelteKit's json with status 500
		return new Response(JSON.stringify(resp), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};