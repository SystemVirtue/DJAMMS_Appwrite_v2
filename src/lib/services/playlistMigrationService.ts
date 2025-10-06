import { PlaylistService } from './playlistService.js';
import { EnhancedPlaylistService } from './enhancedPlaylistService.js';
import type { 
	Playlist, 
	Track as PlaylistTrack, 
	ParsedEnhancedPlaylist,
	EnhancedPlaylistCreate 
} from '$lib/types.ts';

/**
 * Migration service to transition from legacy playlists to enhanced playlists
 */
export class PlaylistMigrationService {
	private static instance: PlaylistMigrationService;
	
	static getInstance(): PlaylistMigrationService {
		if (!PlaylistMigrationService.instance) {
			PlaylistMigrationService.instance = new PlaylistMigrationService();
		}
		return PlaylistMigrationService.instance;
	}

	private legacyService = PlaylistService.getInstance();
	private enhancedService = EnhancedPlaylistService.getInstance();

	/**
	 * Migrate a single legacy playlist to enhanced format
	 */
	async migrateLegacyPlaylist(
		legacyPlaylist: Playlist,
		userId: string,
		options: {
			category?: string;
			tags?: string;
			makePublic?: boolean;
			copyMode?: boolean; // If true, keeps original, otherwise migrates
		} = {}
	): Promise<ParsedEnhancedPlaylist> {
		try {
			const {
				category = 'general',
				tags = '',
				makePublic = legacyPlaylist.is_public || false,
				copyMode = true
			} = options;

			console.log(`Migrating playlist: ${legacyPlaylist.name}`);
			
			// Calculate total duration
			const totalDuration = legacyPlaylist.tracks?.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;
			
			// Create enhanced playlist data
			const enhancedData: Omit<EnhancedPlaylistCreate, 'created_at' | 'updated_at'> = {
				user_id: userId,
				name: legacyPlaylist.name,
				description: legacyPlaylist.description || '',
				tracks: JSON.stringify(legacyPlaylist.tracks || []),
				tags,
				category,
				is_public: makePublic,
				is_featured: false,
				created_by_admin: false,
				play_count: 0,
				total_duration: totalDuration
			};

			// Create the enhanced playlist
			const enhancedPlaylist = await this.enhancedService.createPlaylist(enhancedData);
			
			console.log(`✅ Successfully migrated playlist: ${enhancedPlaylist.name}`);
			
			// If not in copy mode, delete the legacy playlist
			if (!copyMode && legacyPlaylist.$id) {
				try {
					await this.legacyService.deletePlaylist(legacyPlaylist.$id);
					console.log(`🗑️ Deleted legacy playlist: ${legacyPlaylist.name}`);
				} catch (deleteError) {
					console.warn(`Failed to delete legacy playlist ${legacyPlaylist.name}:`, deleteError);
				}
			}

			return enhancedPlaylist;
		} catch (error) {
			console.error(`Failed to migrate playlist ${legacyPlaylist.name}:`, error);
			throw error;
		}
	}

	/**
	 * Migrate all user playlists to enhanced format
	 */
	async migrateAllUserPlaylists(
		userId: string,
		options: {
			copyMode?: boolean;
			defaultCategory?: string;
			batchSize?: number;
		} = {}
	): Promise<{
		migrated: ParsedEnhancedPlaylist[];
		failed: Array<{ playlist: Playlist; error: string }>;
	}> {
		try {
			const {
				copyMode = true,
				defaultCategory = 'general',
				batchSize = 5
			} = options;

			console.log(`Starting migration of all playlists for user: ${userId}`);
			
			// Get all legacy playlists
			const legacyPlaylists = await this.legacyService.getUserPlaylists(userId);
			console.log(`Found ${legacyPlaylists.length} legacy playlists to migrate`);

			const migrated: ParsedEnhancedPlaylist[] = [];
			const failed: Array<{ playlist: Playlist; error: string }> = [];

			// Process in batches to avoid overwhelming the system
			for (let i = 0; i < legacyPlaylists.length; i += batchSize) {
				const batch = legacyPlaylists.slice(i, i + batchSize);
				console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(legacyPlaylists.length / batchSize)}`);

				const batchPromises = batch.map(async (playlist) => {
					try {
						const migrated = await this.migrateLegacyPlaylist(playlist, userId, {
							category: defaultCategory,
							copyMode
						});
						return { success: true, migrated };
					} catch (error) {
						return { 
							success: false, 
							playlist, 
							error: error instanceof Error ? error.message : 'Unknown error' 
						};
					}
				});

				const results = await Promise.allSettled(batchPromises);
				
				results.forEach((result, index) => {
					if (result.status === 'fulfilled') {
						const res = result.value;
						if (res.success) {
							if (res.migrated) {
								migrated.push(res.migrated);
							}
						} else {
							failed.push({ 
								playlist: res.playlist || batch[index], 
								error: res.error || 'Unknown migration error' 
							});
						}
					} else {
						const playlist = batch[index];
						failed.push({ 
							playlist, 
							error: `Promise rejected: ${result.reason}` 
						});
					}
				});

				// Small delay between batches
				if (i + batchSize < legacyPlaylists.length) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}

			console.log(`Migration completed: ${migrated.length} successful, ${failed.length} failed`);
			return { migrated, failed };
		} catch (error) {
			console.error('Failed to migrate all user playlists:', error);
			throw error;
		}
	}

	/**
	 * Check if user has any legacy playlists that need migration
	 */
	async hasLegacyPlaylists(userId: string): Promise<boolean> {
		try {
			const legacyPlaylists = await this.legacyService.getUserPlaylists(userId);
			return legacyPlaylists.length > 0;
		} catch (error) {
			console.error('Failed to check for legacy playlists:', error);
			return false;
		}
	}

	/**
	 * Get migration status for user
	 */
	async getMigrationStatus(userId: string): Promise<{
		hasLegacy: boolean;
		legacyCount: number;
		enhancedCount: number;
		recommendMigration: boolean;
	}> {
		try {
			const [legacyPlaylists, enhancedPlaylists] = await Promise.all([
				this.legacyService.getUserPlaylists(userId),
				this.enhancedService.getUserPlaylists(userId)
			]);

			const hasLegacy = legacyPlaylists.length > 0;
			const legacyCount = legacyPlaylists.length;
			const enhancedCount = enhancedPlaylists.length;
			const recommendMigration = hasLegacy && enhancedCount === 0;

			return {
				hasLegacy,
				legacyCount,
				enhancedCount,
				recommendMigration
			};
		} catch (error) {
			console.error('Failed to get migration status:', error);
			return {
				hasLegacy: false,
				legacyCount: 0,
				enhancedCount: 0,
				recommendMigration: false
			};
		}
	}

	/**
	 * Auto-categorize playlists based on name patterns
	 */
	private autoCategorizePlaylists(playlistName: string): string {
		const name = playlistName.toLowerCase();
		
		// Workout related
		if (/workout|gym|fitness|run|exercise/.test(name)) return 'workout';
		
		// Party/Dance
		if (/party|dance|club|mix|dj/.test(name)) return 'party';
		
		// Chill/Relaxing
		if (/chill|relax|calm|ambient|lo-fi|study/.test(name)) return 'chill';
		
		// Genre-based categorization
		if (/rock|metal|punk/.test(name)) return 'rock';
		if (/pop|mainstream/.test(name)) return 'pop';
		if (/hip.?hop|rap|trap/.test(name)) return 'hip-hop';
		if (/electronic|edm|techno|house/.test(name)) return 'electronic';
		if (/jazz|blues/.test(name)) return 'jazz';
		if (/classical|orchestra/.test(name)) return 'classical';
		if (/country|folk/.test(name)) return 'country';
		if (/r&b|soul|rnb/.test(name)) return 'r&b';
		if (/indie|alternative|alt/.test(name)) return 'indie';
		
		// Sleep/Night
		if (/sleep|night|bedtime/.test(name)) return 'sleep';
		
		return 'general';
	}

	/**
	 * Migrate with smart categorization
	 */
	async migrateWithSmartCategorization(
		userId: string,
		copyMode = true
	): Promise<{
		migrated: ParsedEnhancedPlaylist[];
		failed: Array<{ playlist: Playlist; error: string }>;
	}> {
		try {
			console.log(`Starting smart categorization migration for user: ${userId}`);
			
			const legacyPlaylists = await this.legacyService.getUserPlaylists(userId);
			const migrated: ParsedEnhancedPlaylist[] = [];
			const failed: Array<{ playlist: Playlist; error: string }> = [];

			for (const playlist of legacyPlaylists) {
				try {
					const category = this.autoCategorizePlaylists(playlist.name);
					const enhancedPlaylist = await this.migrateLegacyPlaylist(playlist, userId, {
						category,
						copyMode
					});
					migrated.push(enhancedPlaylist);
				} catch (error) {
					failed.push({
						playlist,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}

				// Small delay between migrations
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			console.log(`Smart migration completed: ${migrated.length} successful, ${failed.length} failed`);
			return { migrated, failed };
		} catch (error) {
			console.error('Failed smart categorization migration:', error);
			throw error;
		}
	}

	/**
	 * Create a unified playlist service that works with both legacy and enhanced
	 */
	createUnifiedService() {
		return {
			async getUserPlaylists(userId: string): Promise<ParsedEnhancedPlaylist[]> {
				// Try enhanced first, fall back to converted legacy
				try {
					const enhanced = await EnhancedPlaylistService.getInstance().getUserPlaylists(userId);
					
					// If no enhanced playlists, check for legacy and suggest migration
					if (enhanced.length === 0) {
						const legacy = await PlaylistService.getInstance().getUserPlaylists(userId);
						if (legacy.length > 0) {
							console.log(`Found ${legacy.length} legacy playlists. Consider migrating.`);
							// Convert legacy to enhanced format for UI compatibility
							return legacy.map(playlist => convertLegacyToEnhanced(playlist, userId));
						}
					}
					
					return enhanced;
				} catch (error) {
					console.error('Failed to get unified playlists:', error);
					throw error;
				}
			}
		};
	}
}

/**
 * Convert legacy playlist to enhanced format (for UI compatibility)
 */
function convertLegacyToEnhanced(legacyPlaylist: Playlist, userId: string): ParsedEnhancedPlaylist {
	return {
		$id: legacyPlaylist.$id || '',
		$collectionId: legacyPlaylist.$collectionId || '',
		$databaseId: legacyPlaylist.$databaseId || '',
		$permissions: [], // Default empty permissions for enhanced playlist
		user_id: userId,
		name: legacyPlaylist.name || 'Untitled Playlist',
		description: legacyPlaylist.description || '',
		tracks: Array.isArray(legacyPlaylist.tracks) ? legacyPlaylist.tracks : [],
		tags: '',
		category: 'general',
		is_public: legacyPlaylist.is_public || false,
		is_featured: false,
		created_by_admin: false,
		play_count: 0,
		total_duration: legacyPlaylist.tracks?.reduce((sum: number, track: PlaylistTrack) => sum + (track.duration || 0), 0) || 0,
		created_at: legacyPlaylist.$createdAt || new Date().toISOString(),
		updated_at: legacyPlaylist.$updatedAt || new Date().toISOString(),
		$createdAt: legacyPlaylist.$createdAt,
		$updatedAt: legacyPlaylist.$updatedAt
	};
}

// Export the migration service instance
export const playlistMigration = PlaylistMigrationService.getInstance();