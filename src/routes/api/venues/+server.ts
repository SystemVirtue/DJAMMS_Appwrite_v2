/**
 * Venue Management API Route
 *
 * Handles venue creation, updates, and management operations.
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { databases, DATABASE_ID } from '$lib/utils/appwrite';
import { successResponse, errorResponse } from '$lib/utils/apiResponse';
import { ID, Query } from 'appwrite';

const adminEmails = [
	'admin@djamms.app',
	'dev@djamms.app',
];

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, userId, venueData } = await request.json();

		if (!userId) {
			throw error(400, 'Missing userId');
		}

		switch (action) {
			case 'create':
				if (!venueData?.name) {
					throw error(400, 'Missing venue name');
				}

				const venueId = ID.unique();
				const newVenue = {
					venue_id: venueId,
					venue_name: venueData.name,
					owner_id: userId,
					active_player_instance_id: null,
					now_playing: null,
					state: 'idle',
					current_time: 0,
					volume: 80,
					active_queue: JSON.stringify([]),
					priority_queue: JSON.stringify([]),
					player_settings: JSON.stringify({
						autoPlay: true,
						showNotifications: true,
						theme: 'dark',
						quality: 'auto'
					}),
					is_shuffled: false,
					last_heartbeat_at: new Date().toISOString(),
					last_updated: new Date().toISOString(),
					created_at: new Date().toISOString()
				};

				const createdVenue = await databases.createDocument(
					DATABASE_ID,
					'venues',
					venueId,
					newVenue
				);

				return json(successResponse({ venue: createdVenue }, 'Venue created successfully'));

			case 'update':
				if (!venueData?.venueId) {
					throw error(400, 'Missing venueId');
				}

				const updateData: any = {};
				if (venueData.name) updateData.venue_name = venueData.name;
				if (venueData.settings) updateData.player_settings = JSON.stringify(venueData.settings);
				updateData.last_updated = new Date().toISOString();

				await databases.updateDocument(
					DATABASE_ID,
					'venues',
					venueData.venueId,
					updateData
				);

				return json(successResponse(null, 'Venue updated successfully'));

			default:
				throw error(400, `Unknown action: ${action}`);
		}

		} catch (err: any) {
		console.error('Venue API error:', err);
		const resp = errorResponse({ code: err?.code || 'VENUE_API_ERROR', message: err?.message || 'Internal server error', details: err });
		return new Response(JSON.stringify(resp), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const userId = url.searchParams.get('userId');

		if (!userId) {
			throw error(400, 'Missing userId parameter');
		}

		const venues = await databases.listDocuments(DATABASE_ID, 'venues', [
			Query.equal('owner_id', userId)
		]);

		return json({
			success: true,
			venues: venues.documents
		});

	} catch (err: any) {
		console.error('Venue GET error:', err);
		const resp = errorResponse({ code: err?.code || 'VENUE_GET_ERROR', message: err?.message || 'Internal server error', details: err });
		return new Response(JSON.stringify(resp), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};