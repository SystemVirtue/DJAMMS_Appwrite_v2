import { databases, DATABASE_ID, COLLECTIONS } from '$lib/utils/appwrite';
import type { Playlist, PlaylistTrack } from '$lib/types';
import { Query } from 'appwrite';

/**
 * Service for managing playlists in Appwrite
 */
export class PlaylistService {
	private static instance: PlaylistService;

	static getInstance(): PlaylistService {
		if (!PlaylistService.instance) {
			PlaylistService.instance = new PlaylistService();
		}
		return PlaylistService.instance;
	}

	/**
	 * Parse tracks from Appwrite response - handles both JSON string and array formats
	 */
	private parseTracksFromResponse(response: any): PlaylistTrack[] {
		try {
			// First try the tracks field (JSON string)
			if (response.tracks && typeof response.tracks === 'string') {
				console.log('Parsing tracks from JSON string...');
				const parsed = JSON.parse(response.tracks);
				if (Array.isArray(parsed)) {
					console.log(`Parsed ${parsed.length} tracks from tracks field`);
					return parsed;
				}
			}
			
			// Then try tracks_array field (array of JSON strings)
			if (response.tracks_array && Array.isArray(response.tracks_array)) {
				console.log('Parsing tracks from JSON string array...');
				const parsed = response.tracks_array.map((trackStr: string) => {
					if (typeof trackStr === 'string') {
						return JSON.parse(trackStr);
					}
					return trackStr; // Already an object
				});
				console.log(`Parsed ${parsed.length} tracks from tracks_array field`);
				return parsed;
			}
			
			// Fallback - if tracks_array contains objects directly
			if (response.tracks_array && Array.isArray(response.tracks_array)) {
				console.log('Using tracks_array as direct object array...');
				return response.tracks_array;
			}
			
			console.warn('No parseable tracks found in response');
			return [];
		} catch (error) {
			console.error('Error parsing tracks:', error);
			return [];
		}
	}

	/**
	 * Fetch the global default playlist from Appwrite
	 */
	async getGlobalDefaultPlaylist(): Promise<Playlist | null> {
		try {
			console.log('Fetching global default playlist from Appwrite...');
			
			// Fetch directly by document ID since we know it exists
			const directResponse = await databases.getDocument(
				DATABASE_ID,
				COLLECTIONS.PLAYLISTS,
				'global_default_playlist'
			);
			
			console.log('Successfully found global default playlist:', {
				id: directResponse.$id,
				name: directResponse.name,
				tracks_count: this.parseTracksFromResponse(directResponse)?.length || 0,
				is_public: directResponse.is_public
			});
			
			return {
				$id: directResponse.$id,
				user_id: directResponse.user_id,
				name: directResponse.name,
				description: directResponse.description,
				is_public: directResponse.is_public,
				tracks: this.parseTracksFromResponse(directResponse) || [],
				thumbnail: directResponse.thumbnail,
				$createdAt: directResponse.$createdAt,
				$updatedAt: directResponse.$updatedAt
			} as Playlist;
		} catch (error) {
			console.error('Failed to fetch global default playlist:', error);
			console.log('Falling back to demo playlists...');
			return null;
		}
	}

	/**
	 * Fetch all playlists for the current user
	 */
	async getUserPlaylists(userId?: string): Promise<Playlist[]> {
		try {
			console.log('Fetching user playlists from Appwrite...');
			
			const queries = [Query.limit(100)];
			
			// If userId provided, filter by user, otherwise get public playlists
			if (userId) {
				queries.push(Query.equal('user_id', userId));
			} else {
				queries.push(Query.equal('is_public', true));
			}

			const response = await databases.listDocuments(
				DATABASE_ID,
				COLLECTIONS.PLAYLISTS,
				queries
			);

			const playlists: Playlist[] = response.documents.map((doc: any) => ({
				$id: doc.$id,
				user_id: doc.user_id,
				name: doc.name,
				description: doc.description,
				is_public: doc.is_public,
				tracks: this.parseTracksFromResponse(doc),
				thumbnail: doc.thumbnail,
				$createdAt: doc.$createdAt,
				$updatedAt: doc.$updatedAt
			}));

			console.log(`Successfully loaded ${playlists.length} playlists from Appwrite`);
			return playlists;
		} catch (error) {
			console.error('Failed to fetch user playlists:', error);
			throw error;
		}
	}

	/**
	 * Create a new playlist
	 */
	async createPlaylist(
		userId: string,
		name: string,
		description: string = '',
		isPublic: boolean = false,
		tracks: PlaylistTrack[] = []
	): Promise<Playlist> {
		try {
			console.log('Creating new playlist:', name);
			
			const playlistData = {
				user_id: userId,
				name,
				description,
				is_public: isPublic,
				tracks: tracks,
				thumbnail: tracks.length > 0 ? tracks[0].thumbnail : null
			};

			const response = await databases.createDocument(
				DATABASE_ID,
				COLLECTIONS.PLAYLISTS,
				'unique()',
				playlistData
			);

			console.log('Created playlist:', response);
			
			return {
				$id: response.$id,
				user_id: response.user_id,
				name: response.name,
				description: response.description,
				is_public: response.is_public,
				tracks: response.tracks || [],
				thumbnail: response.thumbnail,
				$createdAt: response.$createdAt,
				$updatedAt: response.$updatedAt
			} as Playlist;
		} catch (error) {
			console.error('Failed to create playlist:', error);
			throw error;
		}
	}

	/**
	 * Update an existing playlist
	 */
	async updatePlaylist(
		playlistId: string,
		updates: Partial<{
			name: string;
			description: string;
			is_public: boolean;
			tracks: PlaylistTrack[];
			thumbnail: string;
		}>
	): Promise<Playlist> {
		try {
			console.log('Updating playlist:', playlistId);
			
			const response = await databases.updateDocument(
				DATABASE_ID,
				COLLECTIONS.PLAYLISTS,
				playlistId,
				updates
			);

			console.log('Updated playlist:', response);
			
			return {
				$id: response.$id,
				user_id: response.user_id,
				name: response.name,
				description: response.description,
				is_public: response.is_public,
				tracks: response.tracks || [],
				thumbnail: response.thumbnail,
				$createdAt: response.$createdAt,
				$updatedAt: response.$updatedAt
			} as Playlist;
		} catch (error) {
			console.error('Failed to update playlist:', error);
			throw error;
		}
	}

	/**
	 * Delete a playlist
	 */
	async deletePlaylist(playlistId: string): Promise<void> {
		try {
			console.log('Deleting playlist:', playlistId);
			
			await databases.deleteDocument(
				DATABASE_ID,
				COLLECTIONS.PLAYLISTS,
				playlistId
			);

			console.log('Deleted playlist successfully');
		} catch (error) {
			console.error('Failed to delete playlist:', error);
			throw error;
		}
	}

	/**
	 * Get fallback/demo playlists when Appwrite is not available
	 * Since we have real Appwrite data, return empty array to force real data usage
	 */
	getFallbackPlaylists(): Playlist[] {
		console.log('Note: Fallback playlists requested - this should rarely happen with working Appwrite connection');
		return [];
	}
}

// Export singleton instance
export const playlistService = PlaylistService.getInstance();