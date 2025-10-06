import { databases, DATABASE_ID, COLLECTIONS } from '$lib/utils/appwrite';
import type { Playlist, Track as PlaylistTrack } from '$lib/types.ts';
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
	 * Parse tracks from various response formats
	 */
	private parseTracksFromResponse(response: any): PlaylistTrack[] {
		try {
			console.log('parseTracksFromResponse - response.tracks type:', typeof response.tracks);
			console.log('parseTracksFromResponse - response.tracks value:', response.tracks);

			// Handle direct object with tracks array (like global default playlist)
			if (response.tracks && typeof response.tracks === 'object' && response.tracks.tracks && Array.isArray(response.tracks.tracks)) {
				console.log(`Parsed ${response.tracks.tracks.length} tracks from direct nested object`);
				return response.tracks.tracks;
			}

			// First try the tracks field (JSON string)
			if (response.tracks && typeof response.tracks === 'string') {
				console.log('Parsing tracks from JSON string...');
				const parsed = JSON.parse(response.tracks);
				if (Array.isArray(parsed)) {
					console.log(`Parsed ${parsed.length} tracks from tracks field`);
					return parsed;
				}
				// Handle nested object structure (like global default playlist)
				if (parsed && typeof parsed === 'object' && parsed.tracks && Array.isArray(parsed.tracks)) {
					console.log(`Parsed ${parsed.tracks.length} tracks from nested tracks object`);
					return parsed.tracks;
				}
			}			// Then try tracks_array field (array of JSON strings)
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
				$collectionId: directResponse.$collectionId,
				$databaseId: directResponse.$databaseId,
				$createdAt: directResponse.$createdAt,
				$updatedAt: directResponse.$updatedAt,
				$permissions: directResponse.$permissions || [],
				playlist_id: directResponse.playlist_id || directResponse.$id,
				name: directResponse.name,
				description: directResponse.description,
				owner_id: directResponse.owner_id || directResponse.user_id,
				venue_id: directResponse.venue_id,
				is_public: directResponse.is_public,
				is_default: directResponse.is_default,
				is_starred: directResponse.is_starred,
				category: directResponse.category,
				cover_image_url: directResponse.cover_image_url || directResponse.thumbnail,
				tracks: this.parseTracksFromResponse(directResponse) || [],
				track_count: directResponse.track_count || (this.parseTracksFromResponse(directResponse)?.length || 0),
				total_duration: directResponse.total_duration,
				tags: directResponse.tags,
				play_count: directResponse.play_count,
				last_played_at: directResponse.last_played_at,
				created_at: directResponse.created_at || directResponse.$createdAt,
				updated_at: directResponse.updated_at || directResponse.$updatedAt,
				// Backward compatibility
				user_id: directResponse.user_id,
				isPublic: directResponse.is_public,
				isDefault: directResponse.is_default,
				isStarred: directResponse.is_starred,
				coverImage: directResponse.cover_image_url || directResponse.thumbnail,
				trackCount: directResponse.track_count,
				totalDuration: directResponse.total_duration,
				updated: directResponse.updated_at || directResponse.$updatedAt,
				created: directResponse.created_at || directResponse.$createdAt,
				id: directResponse.$id
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
				$collectionId: doc.$collectionId,
				$databaseId: doc.$databaseId,
				$createdAt: doc.$createdAt,
				$updatedAt: doc.$updatedAt,
				$permissions: doc.$permissions || [],
				playlist_id: doc.playlist_id || doc.$id,
				name: doc.name,
				description: doc.description,
				owner_id: doc.owner_id || doc.user_id,
				venue_id: doc.venue_id,
				is_public: doc.is_public,
				is_default: doc.is_default,
				is_starred: doc.is_starred,
				category: doc.category,
				cover_image_url: doc.cover_image_url || doc.thumbnail,
				tracks: this.parseTracksFromResponse(doc) || [],
				track_count: doc.track_count || (this.parseTracksFromResponse(doc)?.length || 0),
				total_duration: doc.total_duration,
				tags: doc.tags,
				play_count: doc.play_count,
				last_played_at: doc.last_played_at,
				created_at: doc.created_at || doc.$createdAt,
				updated_at: doc.updated_at || doc.$updatedAt,
				// Backward compatibility
				user_id: doc.user_id,
				isPublic: doc.is_public,
				isDefault: doc.is_default,
				isStarred: doc.is_starred,
				coverImage: doc.cover_image_url || doc.thumbnail,
				trackCount: doc.track_count,
				totalDuration: doc.total_duration,
				updated: doc.updated_at || doc.$updatedAt,
				created: doc.created_at || doc.$createdAt,
				id: doc.$id
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
				$collectionId: response.$collectionId,
				$databaseId: response.$databaseId,
				$createdAt: response.$createdAt,
				$updatedAt: response.$updatedAt,
				$permissions: response.$permissions || [],
				playlist_id: response.playlist_id || response.$id,
				name: response.name,
				description: response.description,
				owner_id: response.owner_id || response.user_id,
				venue_id: response.venue_id,
				is_public: response.is_public,
				is_default: response.is_default,
				is_starred: response.is_starred,
				category: response.category,
				cover_image_url: response.cover_image_url || response.thumbnail,
				tracks: response.tracks || [],
				track_count: response.track_count || (response.tracks?.length || 0),
				total_duration: response.total_duration,
				tags: response.tags,
				play_count: response.play_count,
				last_played_at: response.last_played_at,
				created_at: response.created_at || response.$createdAt,
				updated_at: response.updated_at || response.$updatedAt,
				// Backward compatibility
				user_id: response.user_id,
				isPublic: response.is_public,
				isDefault: response.is_default,
				isStarred: response.is_starred,
				coverImage: response.cover_image_url || response.thumbnail,
				trackCount: response.track_count,
				totalDuration: response.total_duration,
				updated: response.updated_at || response.$updatedAt,
				created: response.created_at || response.$createdAt,
				id: response.$id
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
				$collectionId: response.$collectionId,
				$databaseId: response.$databaseId,
				$createdAt: response.$createdAt,
				$updatedAt: response.$updatedAt,
				$permissions: response.$permissions || [],
				playlist_id: response.playlist_id || response.$id,
				name: response.name,
				description: response.description,
				owner_id: response.owner_id || response.user_id,
				venue_id: response.venue_id,
				is_public: response.is_public,
				is_default: response.is_default,
				is_starred: response.is_starred,
				category: response.category,
				cover_image_url: response.cover_image_url || response.thumbnail,
				tracks: response.tracks || [],
				track_count: response.track_count || (response.tracks?.length || 0),
				total_duration: response.total_duration,
				tags: response.tags,
				play_count: response.play_count,
				last_played_at: response.last_played_at,
				created_at: response.created_at || response.$createdAt,
				updated_at: response.updated_at || response.$updatedAt,
				// Backward compatibility
				user_id: response.user_id,
				isPublic: response.is_public,
				isDefault: response.is_default,
				isStarred: response.is_starred,
				coverImage: response.cover_image_url || response.thumbnail,
				trackCount: response.track_count,
				totalDuration: response.total_duration,
				updated: response.updated_at || response.$updatedAt,
				created: response.created_at || response.$createdAt,
				id: response.$id
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