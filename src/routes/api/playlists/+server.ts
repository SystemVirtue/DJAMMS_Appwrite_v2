/**
 * Playlist Management API Route
 *
 * Handles playlist CRUD operations for venue-centric architecture.
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { databases, DATABASE_ID } from '$lib/utils/appwrite';
import { ID } from 'appwrite';
import { successResponse, errorResponse } from '$lib/utils/apiResponse';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, userId, playlistData } = await request.json();

		if (!userId) {
			throw error(400, 'Missing userId');
		}

		switch (action) {
			case 'create':
				if (!playlistData?.name) {
					throw error(400, 'Missing playlist name');
				}

				const playlistId = ID.unique();
				const newPlaylist = {
					playlist_id: playlistId,
					name: playlistData.name,
					description: playlistData.description || '',
					owner_id: userId,
					venue_id: playlistData.venueId || null,
					is_public: playlistData.isPublic || false,
					is_default: playlistData.isDefault || false,
					is_starred: playlistData.isStarred || false,
					category: playlistData.category || 'user',
					cover_image_url: playlistData.coverImage || null,
					tracks: JSON.stringify(playlistData.tracks || []),
					track_count: playlistData.tracks?.length || 0,
					total_duration: playlistData.totalDuration || 0,
					tags: JSON.stringify(playlistData.tags || []),
					play_count: 0,
					last_played_at: null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};

				const createdPlaylist = await databases.createDocument(
					DATABASE_ID,
					'playlists',
					playlistId,
					newPlaylist
				);

				return json(successResponse({ playlist: createdPlaylist }, 'Playlist created successfully'));

			case 'update':
				if (!playlistData?.playlistId) {
					throw error(400, 'Missing playlistId');
				}

				const updateData: any = {};
				if (playlistData.name) updateData.name = playlistData.name;
				if (playlistData.description !== undefined) updateData.description = playlistData.description;
				if (playlistData.isPublic !== undefined) updateData.is_public = playlistData.isPublic;
				if (playlistData.isStarred !== undefined) updateData.is_starred = playlistData.isStarred;
				if (playlistData.tracks) {
					updateData.tracks = JSON.stringify(playlistData.tracks);
					updateData.track_count = playlistData.tracks.length;
				}
				if (playlistData.tags) updateData.tags = JSON.stringify(playlistData.tags);
				updateData.updated_at = new Date().toISOString();

				await databases.updateDocument(
					DATABASE_ID,
					'playlists',
					playlistData.playlistId,
					updateData
				);

				return json(successResponse(null, 'Playlist updated successfully'));

			case 'delete':
				if (!playlistData?.playlistId) {
					throw error(400, 'Missing playlistId');
				}

				await databases.deleteDocument(
					DATABASE_ID,
					'playlists',
					playlistData.playlistId
				);

				return json(successResponse(null, 'Playlist deleted successfully'));

			default:
				throw error(400, `Unknown action: ${action}`);
		}

	} catch (err: any) {
		console.error('Playlist API error:', err);
		const resp = errorResponse({ code: err?.code || 'PLAYLIST_API_ERROR', message: err?.message || 'Internal server error', details: err });
		return new Response(JSON.stringify(resp), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const userId = url.searchParams.get('userId');
		const venueId = url.searchParams.get('venueId');

		if (!userId && !venueId) {
			throw error(400, 'Missing userId or venueId parameter');
		}

		let queries: any[] = [];

		if (userId) {
			queries.push({ key: 'owner_id', value: userId });
		}

		if (venueId) {
			queries.push({ key: 'venue_id', value: venueId });
		}

		const playlists = await databases.listDocuments(DATABASE_ID, 'playlists', queries);

		return json({
			success: true,
			playlists: playlists.documents
		});

	} catch (err: any) {
		console.error('Playlist GET error:', err);
		const resp = errorResponse({ code: err?.code || 'PLAYLIST_GET_ERROR', message: err?.message || 'Internal server error', details: err });
		return new Response(JSON.stringify(resp), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};