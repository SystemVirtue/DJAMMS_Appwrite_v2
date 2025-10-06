// Ensure the following file exists: src/lib/utils/appwrite.ts
// If the file is missing, create it and export the required symbols.
// If the path is incorrect, update it to the correct relative path.

import { databases, DATABASE_ID, COLLECTIONS } from '../utils/appwrite';
import type { 
	UserInstanceSettings, 
	UserInstanceSettingsCreate, 
	UserInstanceSettingsUpdate 
} from '$lib/types';
import { Query } from 'appwrite';

/**
 * Service for managing user instance settings in Appwrite
 */
export class UserInstanceSettingsService {
	private static instance: UserInstanceSettingsService;

	static getInstance(): UserInstanceSettingsService {
		if (!UserInstanceSettingsService.instance) {
			UserInstanceSettingsService.instance = new UserInstanceSettingsService();
		}
		return UserInstanceSettingsService.instance;
	}

	private readonly collectionId = COLLECTIONS.USER_INSTANCE_SETTINGS;

	/**
	 * Get user settings for specific instance
	 */
	async getUserSettings(userId: string, instanceId: string): Promise<UserInstanceSettings | null> {
		try {
			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				[
					Query.equal('user_id', userId),
					Query.equal('instance_id', instanceId),
					Query.limit(1)
				]
			);

			if (response.documents.length > 0) {
				return response.documents[0] as unknown as UserInstanceSettings;
			}

			return null;
		} catch (error) {
			console.error('Failed to get user settings:', error);
			throw error;
		}
	}

	/**
	 * Create new user settings
	 */
	async createUserSettings(settingsData: UserInstanceSettingsCreate): Promise<UserInstanceSettings> {
		try {
			const response = await databases.createDocument(
				DATABASE_ID,
				this.collectionId,
				'unique()',
				{
					...settingsData,
					last_updated: new Date().toISOString()
				}
			);

			return response as unknown as UserInstanceSettings;
		} catch (error) {
			console.error('Failed to create user settings:', error);
			throw error;
		}
	}

	/**
	 * Update user settings
	 */
	async updateUserSettings(settingsId: string, updates: UserInstanceSettingsUpdate): Promise<UserInstanceSettings> {
		try {
			const response = await databases.updateDocument(
				DATABASE_ID,
				this.collectionId,
				settingsId,
				{
					...updates,
					last_updated: new Date().toISOString()
				}
			);

			return response as unknown as UserInstanceSettings;
		} catch (error) {
			console.error('Failed to update user settings:', error);
			throw error;
		}
	}

	/**
	 * Get or create user settings (ensures settings always exist)
	 */
	async getOrCreateUserSettings(userId: string, instanceId: string, defaults?: Partial<UserInstanceSettingsCreate>): Promise<UserInstanceSettings> {
		try {
			const existing = await this.getUserSettings(userId, instanceId);
			
			if (existing) {
				return existing;
			}

			// Create default settings
			const defaultSettings: UserInstanceSettingsCreate = {
				user_id: userId,
				instance_id: instanceId,
				audio_quality: 'auto',
				crossfade_duration: 3,
				auto_play: true,
				volume_level: 80,
				theme_preference: 'dark',
				notification_enabled: true,
				last_updated: new Date().toISOString(),
				...defaults
			};

			return this.createUserSettings(defaultSettings);
		} catch (error) {
			console.error('Failed to get or create user settings:', error);
			throw error;
		}
	}

	/**
	 * Update specific setting
	 */
	async updateSetting(userId: string, instanceId: string, setting: string, value: any): Promise<UserInstanceSettings> {
		try {
			const currentSettings = await this.getOrCreateUserSettings(userId, instanceId);
			
			const updates = {
				[setting]: value,
				last_updated: new Date().toISOString()
			} as UserInstanceSettingsUpdate;

			return this.updateUserSettings(currentSettings.$id, updates);
		} catch (error) {
			console.error('Failed to update setting:', error);
			throw error;
		}
	}

	/**
	 * Update audio quality
	 */
	async updateAudioQuality(userId: string, instanceId: string, audioQuality: 'auto' | 'high' | 'medium' | 'low'): Promise<UserInstanceSettings> {
		return this.updateSetting(userId, instanceId, 'audio_quality', audioQuality);
	}

	/**
	 * Update volume level
	 */
	async updateVolumeLevel(userId: string, instanceId: string, volumeLevel: number): Promise<UserInstanceSettings> {
		if (volumeLevel < 0 || volumeLevel > 100) {
			throw new Error('Volume level must be between 0 and 100');
		}
		return this.updateSetting(userId, instanceId, 'volume_level', volumeLevel);
	}

	/**
	 * Update crossfade duration
	 */
	async updateCrossfadeDuration(userId: string, instanceId: string, duration: number): Promise<UserInstanceSettings> {
		if (duration < 0 || duration > 10) {
			throw new Error('Crossfade duration must be between 0 and 10 seconds');
		}
		return this.updateSetting(userId, instanceId, 'crossfade_duration', duration);
	}

	/**
	 * Toggle auto-play
	 */
	async toggleAutoPlay(userId: string, instanceId: string): Promise<UserInstanceSettings> {
		try {
			const currentSettings = await this.getOrCreateUserSettings(userId, instanceId);
			const newAutoPlay = !currentSettings.auto_play;
			return this.updateSetting(userId, instanceId, 'auto_play', newAutoPlay);
		} catch (error) {
			console.error('Failed to toggle auto-play:', error);
			throw error;
		}
	}

	/**
	 * Update theme preference
	 */
	async updateThemePreference(userId: string, instanceId: string, theme: string): Promise<UserInstanceSettings> {
		return this.updateSetting(userId, instanceId, 'theme_preference', theme);
	}

	/**
	 * Toggle notifications
	 */
	async toggleNotifications(userId: string, instanceId: string): Promise<UserInstanceSettings> {
		try {
			const currentSettings = await this.getOrCreateUserSettings(userId, instanceId);
			const newNotificationEnabled = !currentSettings.notification_enabled;
			return this.updateSetting(userId, instanceId, 'notification_enabled', newNotificationEnabled);
		} catch (error) {
			console.error('Failed to toggle notifications:', error);
			throw error;
		}
	}

	/**
	 * Get all settings for a user (across instances)
	 */
	async getAllUserSettings(userId: string): Promise<UserInstanceSettings[]> {
		try {
			const response = await databases.listDocuments(
				DATABASE_ID,
				this.collectionId,
				[
					Query.equal('user_id', userId),
					Query.orderDesc('last_updated')
				]
			);

			return response.documents as unknown as UserInstanceSettings[];
		} catch (error) {
			console.error('Failed to get all user settings:', error);
			throw error;
		}
	}

	/**
	 * Delete user settings
	 */
	async deleteUserSettings(settingsId: string): Promise<void> {
		try {
			await databases.deleteDocument(DATABASE_ID, this.collectionId, settingsId);
		} catch (error) {
			console.error('Failed to delete user settings:', error);
			throw error;
		}
	}

	/**
	 * Reset settings to default
	 */
	async resetToDefaults(userId: string, instanceId: string): Promise<UserInstanceSettings> {
		try {
			const currentSettings = await this.getUserSettings(userId, instanceId);
			
			if (!currentSettings) {
				return this.getOrCreateUserSettings(userId, instanceId);
			}

			const defaultUpdates: UserInstanceSettingsUpdate = {
				audio_quality: 'auto',
				crossfade_duration: 3,
				auto_play: true,
				volume_level: 80,
				theme_preference: 'dark',
				notification_enabled: true,
				last_updated: new Date().toISOString()
			};

			return this.updateUserSettings(currentSettings.$id, defaultUpdates);
		} catch (error) {
			console.error('Failed to reset settings to defaults:', error);
			throw error;
		}
	}
}