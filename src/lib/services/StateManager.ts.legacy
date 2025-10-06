// Enhanced Local State Manager for DJAMMS
// Implements React-inspired local persistence with smart conflict resolution

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { QueueState, QueuedRequest, PlaylistItem } from './HybridQueueManager';

// Types for state persistence
export interface PersistedState {
	queueState: QueueState;
	userPreferences: UserPreferences;
	sessionMetadata: SessionMetadata;
	version: string;
	lastUpdated: number;
	instanceId: string;
}

export interface UserPreferences {
	volume: number;
	isRepeat: boolean;
	isShuffle: boolean;
	autoplay: boolean;
	theme: 'dark' | 'light' | 'auto';
	displaySettings: {
		showThumbnails: boolean;
		showDuration: boolean;
		showChannelInfo: boolean;
		queueDisplayLimit: number;
	};
	audioSettings: {
		quality: 'auto' | 'high' | 'medium' | 'low';
		normalization: boolean;
		crossfade: boolean;
	};
}

export interface SessionMetadata {
	sessionId: string;
	startTime: number;
	lastActivity: number;
	windowCount: number;
	totalPlaytime: number;
	songsPlayed: number;
	userInteractions: number;
	crashRecoveryData?: {
		lastPlayingTrack: QueuedRequest | null;
		lastPlayingPosition: number;
		wasPlaying: boolean;
	};
}

export interface ConflictResolution {
	strategy: 'merge' | 'local-wins' | 'remote-wins' | 'user-choice';
	mergedState: PersistedState;
	conflicts: ConflictDetail[];
	timestamp: number;
}

export interface ConflictDetail {
	field: string;
	localValue: any;
	remoteValue: any;
	resolution: 'local' | 'remote' | 'merged';
	confidence: number;
}

// Default preferences
const DEFAULT_USER_PREFERENCES: UserPreferences = {
	volume: 0.8,
	isRepeat: false,
	isShuffle: false,
	autoplay: true,
	theme: 'dark',
	displaySettings: {
		showThumbnails: true,
		showDuration: true,
		showChannelInfo: true,
		queueDisplayLimit: 50
	},
	audioSettings: {
		quality: 'auto',
		normalization: true,
		crossfade: false
	}
};

export class DjammsStateManager {
	// Core stores
	public persistedState = writable<PersistedState | null>(null);
	public userPreferences = writable<UserPreferences>(DEFAULT_USER_PREFERENCES);
	public sessionMetadata = writable<SessionMetadata | null>(null);
	public syncStatus = writable<'synced' | 'syncing' | 'conflict' | 'error'>('synced');
	public conflictResolutions = writable<ConflictResolution[]>([]);

	// Configuration
	private readonly STORAGE_KEY = 'djamms-state-v2';
	private readonly STATE_VERSION = '2.1.0';
	private readonly MAX_CONFLICT_HISTORY = 10;
	private readonly SYNC_DEBOUNCE_MS = 2000;
	private readonly BACKUP_INTERVAL_MS = 300000; // 5 minutes

	// Internal state
	private instanceId: string;
	private appwriteClient: any;
	private syncDebounceTimer: NodeJS.Timeout | null = null;
	private backupTimer: NodeJS.Timeout | null = null;
	private lastSyncTimestamp = 0;
	private pendingConflicts: ConflictResolution[] = [];

	constructor(instanceId: string, appwriteClient?: any) {
		this.instanceId = instanceId;
		this.appwriteClient = appwriteClient;

		if (browser) {
			this.initializeLocalState();
			this.setupPeriodicBackup();
			this.setupCrashRecovery();
		}
	}

	// ===== STATE INITIALIZATION =====

	private initializeLocalState(): void {
		try {
			// Load from localStorage first
			const savedState = this.loadFromLocalStorage();
			
			if (savedState) {
				this.persistedState.set(savedState);
				this.userPreferences.set(savedState.userPreferences);
				this.sessionMetadata.set(savedState.sessionMetadata);
				
				// Check for crash recovery
				this.handleCrashRecovery(savedState);
				
				console.log('📁 State Manager: Loaded from localStorage', {
					version: savedState.version,
					instanceId: savedState.instanceId,
					lastUpdated: new Date(savedState.lastUpdated).toISOString()
				});
			} else {
				// Initialize new session
				this.initializeNewSession();
			}

			// Start syncing with remote if available
			if (this.appwriteClient) {
				this.syncWithRemote();
			}

		} catch (error) {
			console.error('📁 State Manager: Failed to initialize:', error);
			this.initializeNewSession();
		}
	}

	private initializeNewSession(): void {
		const sessionMetadata: SessionMetadata = {
			sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
			startTime: Date.now(),
			lastActivity: Date.now(),
			windowCount: 1,
			totalPlaytime: 0,
			songsPlayed: 0,
			userInteractions: 0
		};

		const defaultState: PersistedState = {
			queueState: {
				currentlyPlaying: null,
				priorityQueue: [],
				backgroundPlaylist: [],
				isProcessing: false,
				lastSync: 0,
				queueHistory: [],
				totalPlayed: 0,
				sessionStartTime: Date.now()
			},
			userPreferences: DEFAULT_USER_PREFERENCES,
			sessionMetadata,
			version: this.STATE_VERSION,
			lastUpdated: Date.now(),
			instanceId: this.instanceId
		};

		this.persistedState.set(defaultState);
		this.userPreferences.set(defaultState.userPreferences);
		this.sessionMetadata.set(sessionMetadata);
		
		this.saveToLocalStorage();
		console.log('📁 State Manager: Initialized new session');
	}

	// ===== LOCAL STORAGE OPERATIONS =====

	private loadFromLocalStorage(): PersistedState | null {
		try {
			const saved = localStorage.getItem(this.STORAGE_KEY);
			if (!saved) return null;

			const parsed = JSON.parse(saved) as PersistedState;
			
			// Validate version compatibility
			if (!this.isVersionCompatible(parsed.version)) {
				console.warn('📁 State Manager: Version mismatch, migrating state');
				return this.migrateState(parsed);
			}

			// Validate data integrity
			if (this.validateState(parsed)) {
				return parsed;
			} else {
				console.warn('📁 State Manager: Invalid state data, discarding');
				return null;
			}

		} catch (error) {
			console.error('📁 State Manager: Failed to load from localStorage:', error);
			return null;
		}
	}

	private saveToLocalStorage(): void {
		if (!browser) return;

		try {
			const currentState = get(this.persistedState);
			if (!currentState) return;

			const stateToSave: PersistedState = {
				...currentState,
				lastUpdated: Date.now(),
				sessionMetadata: {
					...currentState.sessionMetadata,
					lastActivity: Date.now()
				}
			};

			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
			this.persistedState.set(stateToSave);

		} catch (error) {
			console.error('📁 State Manager: Failed to save to localStorage:', error);
		}
	}

	// ===== STATE VALIDATION AND MIGRATION =====

	private isVersionCompatible(version: string): boolean {
		// Simple version compatibility check
		const [major] = version.split('.');
		const [currentMajor] = this.STATE_VERSION.split('.');
		return major === currentMajor;
	}

	private validateState(state: PersistedState): boolean {
		try {
			return !!(
				state.version && 
				state.instanceId &&
				state.queueState &&
				state.userPreferences &&
				state.sessionMetadata &&
				typeof state.lastUpdated === 'number' &&
				Array.isArray(state.queueState.priorityQueue) &&
				Array.isArray(state.queueState.backgroundPlaylist)
			);
		} catch {
			return false;
		}
	}

	private migrateState(oldState: PersistedState): PersistedState {
		// Implement state migration logic for different versions
		return {
			...oldState,
			version: this.STATE_VERSION,
			userPreferences: {
				...DEFAULT_USER_PREFERENCES,
				...oldState.userPreferences
			},
			sessionMetadata: {
				...oldState.sessionMetadata,
				lastActivity: Date.now()
			}
		};
	}

	// ===== REMOTE SYNCHRONIZATION =====

	async syncWithRemote(): Promise<void> {
		if (!this.appwriteClient) return;

		try {
			this.syncStatus.set('syncing');
			
			// Fetch remote state
			const remoteState = await this.fetchRemoteState();
			const localState = get(this.persistedState);
			
			if (remoteState && localState) {
				// Check for conflicts
				const conflicts = this.detectConflicts(localState, remoteState);
				
				if (conflicts.length > 0) {
					const resolution = await this.resolveConflicts(localState, remoteState, conflicts);
					this.applyConflictResolution(resolution);
				} else {
					// No conflicts, merge states
					const mergedState = this.mergeStates(localState, remoteState);
					this.persistedState.set(mergedState);
					this.saveToLocalStorage();
				}
			}

			this.syncStatus.set('synced');
			this.lastSyncTimestamp = Date.now();

		} catch (error) {
			console.error('📁 State Manager: Sync failed:', error);
			this.syncStatus.set('error');
		}
	}

	private async fetchRemoteState(): Promise<PersistedState | null> {
		try {
			const response = await this.appwriteClient.database.getDocument(
				'media_instances',
				this.instanceId
			);
			
			return response.persistedState as PersistedState;
		} catch (error) {
			// Document might not exist yet, that's okay
			return null;
		}
	}

	// ===== CONFLICT DETECTION AND RESOLUTION =====

	private detectConflicts(localState: PersistedState, remoteState: PersistedState): ConflictDetail[] {
		const conflicts: ConflictDetail[] = [];

		// Check queue conflicts
		if (localState.queueState.lastSync !== remoteState.queueState.lastSync) {
			if (localState.queueState.priorityQueue.length !== remoteState.queueState.priorityQueue.length) {
				conflicts.push({
					field: 'queueState.priorityQueue',
					localValue: localState.queueState.priorityQueue,
					remoteValue: remoteState.queueState.priorityQueue,
					resolution: 'merged', // Default resolution
					confidence: 0.8
				});
			}

			if (this.isDifferentTrack(localState.queueState.currentlyPlaying, remoteState.queueState.currentlyPlaying)) {
				conflicts.push({
					field: 'queueState.currentlyPlaying',
					localValue: localState.queueState.currentlyPlaying,
					remoteValue: remoteState.queueState.currentlyPlaying,
					resolution: 'local', // Prefer local for current track
					confidence: 0.9
				});
			}
		}

		// Check preference conflicts
		if (this.hasPreferenceConflicts(localState.userPreferences, remoteState.userPreferences)) {
			conflicts.push({
				field: 'userPreferences',
				localValue: localState.userPreferences,
				remoteValue: remoteState.userPreferences,
				resolution: 'local', // Prefer local preferences
				confidence: 0.95
			});
		}

		return conflicts;
	}

	private isDifferentTrack(local: QueuedRequest | null, remote: QueuedRequest | null): boolean {
		if (!local && !remote) return false;
		if (!local || !remote) return true;
		return local.videoId !== remote.videoId || local.requestedAt !== remote.requestedAt;
	}

	private hasPreferenceConflicts(local: UserPreferences, remote: UserPreferences): boolean {
		// Check key preference differences
		return (
			local.volume !== remote.volume ||
			local.isRepeat !== remote.isRepeat ||
			local.isShuffle !== remote.isShuffle ||
			local.theme !== remote.theme
		);
	}

	private async resolveConflicts(
		localState: PersistedState,
		remoteState: PersistedState,
		conflicts: ConflictDetail[]
	): Promise<ConflictResolution> {
		// Smart conflict resolution based on conflict type and confidence
		const resolution: ConflictResolution = {
			strategy: 'merge',
			mergedState: localState,
			conflicts,
			timestamp: Date.now()
		};

		// Apply resolution strategy
		let mergedState = { ...localState };

		for (const conflict of conflicts) {
			switch (conflict.resolution) {
				case 'local':
					// Keep local value (already in mergedState)
					break;
					
				case 'remote':
					mergedState = this.applyRemoteValue(mergedState, conflict.field, conflict.remoteValue);
					break;
					
				case 'merged':
					if (conflict.field === 'queueState.priorityQueue') {
						// Merge queues intelligently
						mergedState.queueState.priorityQueue = this.mergeQueues(
							conflict.localValue as QueuedRequest[],
							conflict.remoteValue as QueuedRequest[]
						);
					}
					break;
			}
		}

		resolution.mergedState = mergedState;
		return resolution;
	}

	private applyRemoteValue(state: PersistedState, field: string, value: any): PersistedState {
		const newState = { ...state };
		const fieldParts = field.split('.');
		
		// Navigate to the field and update it
		let current: any = newState;
		for (let i = 0; i < fieldParts.length - 1; i++) {
			current = current[fieldParts[i]];
		}
		current[fieldParts[fieldParts.length - 1]] = value;
		
		return newState;
	}

	private mergeQueues(localQueue: QueuedRequest[], remoteQueue: QueuedRequest[]): QueuedRequest[] {
		// Combine and deduplicate queues
		const allRequests = [...localQueue, ...remoteQueue];
		const uniqueRequests = allRequests.reduce((acc, request) => {
			const existing = acc.find(r => r.id === request.id);
			if (!existing) {
				acc.push(request);
			} else if (request.requestedAt > existing.requestedAt) {
				// Replace with newer version
				acc = acc.filter(r => r.id !== request.id);
				acc.push(request);
			}
			return acc;
		}, [] as QueuedRequest[]);

		// Sort by request time
		return uniqueRequests
			.sort((a, b) => a.requestedAt - b.requestedAt)
			.slice(0, 100); // Limit merged queue size
	}

	private applyConflictResolution(resolution: ConflictResolution): void {
		this.persistedState.set(resolution.mergedState);
		this.userPreferences.set(resolution.mergedState.userPreferences);
		this.sessionMetadata.set(resolution.mergedState.sessionMetadata);
		
		// Store resolution for audit
		this.conflictResolutions.update(resolutions => [
			resolution,
			...resolutions.slice(0, this.MAX_CONFLICT_HISTORY - 1)
		]);

		this.saveToLocalStorage();
		console.log('📁 State Manager: Applied conflict resolution', {
			conflicts: resolution.conflicts.length,
			strategy: resolution.strategy
		});
	}

	// ===== STATE MERGING UTILITIES =====

	private mergeStates(localState: PersistedState, remoteState: PersistedState): PersistedState {
		// Simple merge for non-conflicting states
		const mostRecent = localState.lastUpdated > remoteState.lastUpdated ? localState : remoteState;
		
		return {
			...mostRecent,
			queueState: {
				...mostRecent.queueState,
				// Merge specific fields that should be combined
				queueHistory: this.mergeHistory(localState.queueState.queueHistory, remoteState.queueState.queueHistory),
				totalPlayed: Math.max(localState.queueState.totalPlayed, remoteState.queueState.totalPlayed)
			},
			sessionMetadata: {
				...mostRecent.sessionMetadata,
				lastActivity: Math.max(localState.sessionMetadata.lastActivity, remoteState.sessionMetadata.lastActivity)
			},
			lastUpdated: Date.now()
		};
	}

	private mergeHistory(localHistory: QueuedRequest[], remoteHistory: QueuedRequest[]): QueuedRequest[] {
		const combined = [...localHistory, ...remoteHistory];
		const unique = combined.reduce((acc, item) => {
			if (!acc.find(existing => existing.id === item.id)) {
				acc.push(item);
			}
			return acc;
		}, [] as QueuedRequest[]);

		return unique
			.sort((a, b) => b.requestedAt - a.requestedAt) // Most recent first
			.slice(0, 100); // Limit history size
	}

	// ===== CRASH RECOVERY =====

	private setupCrashRecovery(): void {
		// Save crash recovery data before page unload
		window.addEventListener('beforeunload', () => {
			this.saveCrashRecoveryData();
		});

		// Check for unhandled errors
		window.addEventListener('error', () => {
			this.saveCrashRecoveryData();
		});
	}

	private saveCrashRecoveryData(): void {
		try {
			const currentState = get(this.persistedState);
			if (!currentState) return;

			const crashRecovery = {
				lastPlayingTrack: currentState.queueState.currentlyPlaying,
				lastPlayingPosition: 0, // TODO: Get actual position from player
				wasPlaying: currentState.queueState.currentlyPlaying !== null,
				timestamp: Date.now()
			};

			localStorage.setItem(`${this.STORAGE_KEY}-crash-recovery`, JSON.stringify(crashRecovery));
		} catch (error) {
			console.error('📁 State Manager: Failed to save crash recovery data:', error);
		}
	}

	private handleCrashRecovery(state: PersistedState): void {
		try {
			const crashData = localStorage.getItem(`${this.STORAGE_KEY}-crash-recovery`);
			if (!crashData) return;

			const recovery = JSON.parse(crashData);
			const timeSinceCrash = Date.now() - recovery.timestamp;

			// Only recover if crash was recent (< 5 minutes)
			if (timeSinceCrash < 300000) {
				state.sessionMetadata.crashRecoveryData = recovery;
				console.log('📁 State Manager: Crash recovery data available', recovery);
				
				// TODO: Emit event for UI to show recovery options
				if (browser) {
					window.dispatchEvent(new CustomEvent('djamms-crash-recovery', {
						detail: recovery
					}));
				}
			}

			// Clean up crash recovery data
			localStorage.removeItem(`${this.STORAGE_KEY}-crash-recovery`);

		} catch (error) {
			console.error('📁 State Manager: Failed to handle crash recovery:', error);
		}
	}

	// ===== PUBLIC API =====

	/**
	 * Update user preferences with automatic persistence
	 */
	async updateUserPreferences(updates: Partial<UserPreferences>): Promise<void> {
		this.userPreferences.update(current => ({ ...current, ...updates }));
		
		this.persistedState.update(state => {
			if (!state) return state;
			return {
				...state,
				userPreferences: { ...state.userPreferences, ...updates },
				lastUpdated: Date.now()
			};
		});

		this.debouncedSave();
		this.debouncedSync();
	}

	/**
	 * Update queue state with automatic persistence
	 */
	async updateQueueState(updates: Partial<QueueState>): Promise<void> {
		this.persistedState.update(state => {
			if (!state) return state;
			return {
				...state,
				queueState: { ...state.queueState, ...updates },
				lastUpdated: Date.now()
			};
		});

		this.debouncedSave();
		this.debouncedSync();
	}

	/**
	 * Force immediate sync with remote
	 */
	async forcSync(): Promise<void> {
		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
			this.syncDebounceTimer = null;
		}
		await this.syncWithRemote();
	}

	/**
	 * Clear all local data and start fresh
	 */
	async clearLocalData(): Promise<void> {
		localStorage.removeItem(this.STORAGE_KEY);
		localStorage.removeItem(`${this.STORAGE_KEY}-crash-recovery`);
		this.initializeNewSession();
		console.log('📁 State Manager: Cleared all local data');
	}

	/**
	 * Export state for backup/debugging
	 */
	exportState(): string {
		const currentState = get(this.persistedState);
		return JSON.stringify(currentState, null, 2);
	}

	/**
	 * Import state from backup
	 */
	async importState(stateJson: string): Promise<void> {
		try {
			const importedState = JSON.parse(stateJson) as PersistedState;
			
			if (this.validateState(importedState)) {
				this.persistedState.set(importedState);
				this.userPreferences.set(importedState.userPreferences);
				this.sessionMetadata.set(importedState.sessionMetadata);
				this.saveToLocalStorage();
				
				console.log('📁 State Manager: Imported state successfully');
			} else {
				throw new Error('Invalid state format');
			}
		} catch (error) {
			console.error('📁 State Manager: Failed to import state:', error);
			throw error;
		}
	}

	// ===== DEBOUNCED OPERATIONS =====

	private debouncedSave(): void {
		// Immediate save for critical operations
		this.saveToLocalStorage();
	}

	private debouncedSync(): void {
		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
		}

		this.syncDebounceTimer = setTimeout(() => {
			this.syncWithRemote();
		}, this.SYNC_DEBOUNCE_MS);
	}

	private setupPeriodicBackup(): void {
		this.backupTimer = setInterval(() => {
			this.saveToLocalStorage();
		}, this.BACKUP_INTERVAL_MS);
	}

	// ===== CLEANUP =====

	destroy(): void {
		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
		}
		if (this.backupTimer) {
			clearInterval(this.backupTimer);
		}

		// Final save
		this.saveToLocalStorage();
		
		console.log('📁 State Manager: Destroyed');
	}
}

// ===== SVELTE STORES FOR UI INTEGRATION =====

export function createStateManagementStores(instanceId: string, appwriteClient?: any) {
	const stateManager = new DjammsStateManager(instanceId, appwriteClient);

	// Derived stores for UI consumption
	const isStateLoaded = derived(stateManager.persistedState, $state => $state !== null);
	const hasConflicts = derived(stateManager.syncStatus, $status => $status === 'conflict');
	const lastSyncTime = derived(stateManager.persistedState, $state => 
		$state ? new Date($state.lastUpdated) : null
	);

	return {
		stateManager,
		persistedState: stateManager.persistedState,
		userPreferences: stateManager.userPreferences,
		sessionMetadata: stateManager.sessionMetadata,
		syncStatus: stateManager.syncStatus,
		conflictResolutions: stateManager.conflictResolutions,
		isStateLoaded,
		hasConflicts,
		lastSyncTime,
		// Public methods
		updateUserPreferences: (updates: Partial<UserPreferences>) => 
			stateManager.updateUserPreferences(updates),
		updateQueueState: (updates: Partial<QueueState>) => 
			stateManager.updateQueueState(updates),
		forcSync: () => stateManager.forcSync(),
		clearLocalData: () => stateManager.clearLocalData(),
		exportState: () => stateManager.exportState(),
		importState: (stateJson: string) => stateManager.importState(stateJson),
		destroy: () => stateManager.destroy()
	};
}