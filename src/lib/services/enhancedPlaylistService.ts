import { databases, DATABASE_ID, COLLECTIONS } from '$lib/utils/appwrite';
import type { 
	EnhancedPlaylist, 
	EnhancedPlaylistCreate, 
	EnhancedPlaylistUpdate, 
	ParsedEnhancedPlaylist,
	Track as PlaylistTrack 
} from '$lib/types.ts';
import { Query } from 'appwrite';

/**
 * Service for managing enhanced playlists in Appwrite
 */
export class EnhancedPlaylistService {
	private static instance: EnhancedPlaylistService;

	static getInstance(): EnhancedPlaylistService {
		if (!EnhancedPlaylistService.instance) {
			EnhancedPlaylistService.instance = new EnhancedPlaylistService();
		}
		return EnhancedPlaylistService.instance;
	}

	private readonly collectionId = COLLECTIONS.ENHANCED_PLAYLISTS;

	/**
	 * Parse tracks from JSON string
	 */
	private parseTracksFromString(tracksString: string): PlaylistTrack[] {
		try {
			const parsed = JSON.parse(tracksString);
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error('Failed to parse tracks from string:', error);
			return [];
		}
	}

	/**
	 * Convert EnhancedPlaylist to ParsedEnhancedPlaylist
	 */
	private parseEnhancedPlaylist(playlist: EnhancedPlaylist): ParsedEnhancedPlaylist {
		return {
			...playlist,
			tracks: this.parseTracksFromString(playlist.tracks)
		};
	}

	/**
	 * Calculate playlist duration from tracks
	 */
	private calculatePlaylistDuration(tracks: PlaylistTrack[]): number {
		return tracks.reduce((total, track) => total + (track.duration || 0), 0);
	}

	/**
	 * Create a new enhanced playlist
	 */
	async createPlaylist(playlistData: Omit<EnhancedPlaylistCreate, 'created_at' | 'updated_at'>): Promise<ParsedEnhancedPlaylist> {
		try {
			const now = new Date().toISOString();
			const tracks = this.parseTracksFromString(playlistData.tracks);
			const totalDuration = this.calculatePlaylistDuration(tracks);

			const fullPlaylistData: EnhancedPlaylistCreate = {
				...playlistData,
				total_duration: totalDuration,
				created_at: now,
				updated_at: now
			};

			const response = await databases.createDocument(
				DATABASE_ID,
				this.collectionId,
				'unique()',
				fullPlaylistData
			);

			return this.parseEnhancedPlaylist(response as unknown as EnhancedPlaylist);
		} catch (error) {
			console.error('Failed to create enhanced playlist:', error);
			throw error;
		}
	}

	/**
	 * Get playlist by ID
	 */
	async getPlaylist(playlistId: string): Promise<ParsedEnhancedPlaylist | null> {
		try {
			const response = await databases.getDocument(
				DATABASE_ID,
				this.collectionId,
				playlistId
			);

			return this.parseEnhancedPlaylist(response as unknown as EnhancedPlaylist);
		} catch (error) {
			console.error('Failed to get playlist:', error);
			return null;
		}
	}

	/**
	 * Update playlist
	 */
	async updatePlaylist(playlistId: string, updates: Omit<EnhancedPlaylistUpdate, 'updated_at'>): Promise<ParsedEnhancedPlaylist> {
		try {
			let fullUpdates: EnhancedPlaylistUpdate = {
				...updates,
				updated_at: new Date().toISOString()
			};

			// Recalculate duration if tracks are updated
			if (updates.tracks) {
				const tracks = this.parseTracksFromString(updates.tracks);
				fullUpdates.total_duration = this.calculatePlaylistDuration(tracks);
			}

			const response = await databases.updateDocument(
				DATABASE_ID,
				this.collectionId,
				playlistId,
				fullUpdates
			);

			return this.parseEnhancedPlaylist(response as unknown as EnhancedPlaylist);
		} catch (error) {
			console.error('Failed to update playlist:', error);
			throw error;
		}
	}

	/**
	 * Get user playlists
	 */
	async getUserPlaylists(userId: string, includePublic = false): Promise<ParsedEnhancedPlaylist[]> {
		try {
			const queries = [Query.equal('user_id', userId)];
			
			if (includePublic) {
				queries.push(Query.orderDesc('updated_at'));
			}

			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				queries
			);

			return response.documents.map((doc: any) => this.parseEnhancedPlaylist(doc as EnhancedPlaylist));
		} catch (error) {
			console.error('Failed to get user playlists:', error);
			throw error;
		}
	}

	/**
	 * Get public playlists
	 */
	async getPublicPlaylists(limit = 50): Promise<ParsedEnhancedPlaylist[]> {
		try {
			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				[
					Query.equal('is_public', true),
					Query.orderDesc('play_count'),
					Query.limit(limit)
				]
			);

			return response.documents.map((doc: any) => this.parseEnhancedPlaylist(doc as EnhancedPlaylist));
		} catch (error) {
			console.error('Failed to get public playlists:', error);
			throw error;
		}
	}

	/**
	 * Get featured playlists
	 */
	async getFeaturedPlaylists(limit = 20): Promise<ParsedEnhancedPlaylist[]> {
		try {
			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				[
					Query.equal('is_featured', true),
					Query.equal('is_public', true),
					Query.orderDesc('updated_at'),
					Query.limit(limit)
				]
			);

			return response.documents.map((doc: any) => this.parseEnhancedPlaylist(doc as EnhancedPlaylist));
		} catch (error) {
			console.error('Failed to get featured playlists:', error);
			throw error;
		}
	}

	/**
	 * Search playlists by category
	 */
	async getPlaylistsByCategory(category: string, isPublicOnly = true): Promise<ParsedEnhancedPlaylist[]> {
		try {
			const queries = [Query.equal('category', category)];
			
			if (isPublicOnly) {
				queries.push(Query.equal('is_public', true));
			}
			
			queries.push(Query.orderDesc('play_count'));

			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				queries
			);

			return response.documents.map((doc: any) => this.parseEnhancedPlaylist(doc as EnhancedPlaylist));
		} catch (error) {
			console.error('Failed to get playlists by category:', error);
			throw error;
		}
	}

	/**
	 * Search playlists by name or description
	 */
	async searchPlaylists(searchTerm: string, isPublicOnly = true): Promise<ParsedEnhancedPlaylist[]> {
		try {
			const queries = [Query.search('name', searchTerm)];
			
			if (isPublicOnly) {
				queries.push(Query.equal('is_public', true));
			}

			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				queries
			);

			return response.documents.map((doc: any) => this.parseEnhancedPlaylist(doc as EnhancedPlaylist));
		} catch (error) {
			console.error('Failed to search playlists:', error);
			throw error;
		}
	}

	/**
	 * Add track to playlist
	 */
	async addTrackToPlaylist(playlistId: string, track: PlaylistTrack): Promise<ParsedEnhancedPlaylist> {
		try {
			const playlist = await this.getPlaylist(playlistId);
			if (!playlist) {
				throw new Error('Playlist not found');
			}

			const updatedTracks = [...playlist.tracks, track];
			
			return this.updatePlaylist(playlistId, {
				tracks: JSON.stringify(updatedTracks)
			});
		} catch (error) {
			console.error('Failed to add track to playlist:', error);
			throw error;
		}
	}

	/**
	 * Remove track from playlist
	 */
	async removeTrackFromPlaylist(playlistId: string, trackIndex: number): Promise<ParsedEnhancedPlaylist> {
		try {
			const playlist = await this.getPlaylist(playlistId);
			if (!playlist) {
				throw new Error('Playlist not found');
			}

			if (trackIndex < 0 || trackIndex >= playlist.tracks.length) {
				throw new Error('Invalid track index');
			}

			const updatedTracks = [...playlist.tracks];
			updatedTracks.splice(trackIndex, 1);
			
			return this.updatePlaylist(playlistId, {
				tracks: JSON.stringify(updatedTracks)
			});
		} catch (error) {
			console.error('Failed to remove track from playlist:', error);
			throw error;
		}
	}

	/**
	 * Increment play count
	 */
	async incrementPlayCount(playlistId: string): Promise<ParsedEnhancedPlaylist> {
		try {
			const playlist = await this.getPlaylist(playlistId);
			if (!playlist) {
				throw new Error('Playlist not found');
			}

			const newPlayCount = (playlist.play_count || 0) + 1;
			
			return this.updatePlaylist(playlistId, {
				play_count: newPlayCount
			});
		} catch (error) {
			console.error('Failed to increment play count:', error);
			throw error;
		}
	}

	/**
	 * Toggle playlist visibility
	 */
	async togglePlaylistVisibility(playlistId: string): Promise<ParsedEnhancedPlaylist> {
		try {
			const playlist = await this.getPlaylist(playlistId);
			if (!playlist) {
				throw new Error('Playlist not found');
			}

			return this.updatePlaylist(playlistId, {
				is_public: !playlist.is_public
			});
		} catch (error) {
			console.error('Failed to toggle playlist visibility:', error);
			throw error;
		}
	}

	/**
	 * Delete playlist
	 */
	async deletePlaylist(playlistId: string): Promise<void> {
		try {
			await databases.deleteDocument(DATABASE_ID, this.collectionId, playlistId);
		} catch (error) {
			console.error('Failed to delete playlist:', error);
			throw error;
		}
	}

	/**
	 * Get playlist categories (aggregated)
	 */
	async getPlaylistCategories(): Promise<string[]> {
		try {
			// This would require a custom function in Appwrite to aggregate categories
			// For now, return common categories
			return [
				'general',
				'rock',
				'pop',
				'hip-hop',
				'electronic',
				'jazz',
				'classical',
				'country',
				'r&b',
				'indie',
				'workout',
				'chill',
				'party',
				'study',
				'sleep'
			];
		} catch (error) {
			console.error('Failed to get playlist categories:', error);
			throw error;
		}
	}
}