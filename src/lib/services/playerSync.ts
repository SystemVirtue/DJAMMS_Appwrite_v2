import { djammsStore } from '../stores/djamms';
import { InstanceIds } from '../utils/idGenerator';
import { browser } from '$app/environment';

/**
 * PlayerSyncService - Handles real-time synchronization of player state across multiple windows
 * Uses BroadcastChannel API for cross-window communication
 */
class PlayerSyncService {
	private channel: BroadcastChannel | null = null;
	private instanceId: string | null = null;
	
	constructor() {
		if (browser) {
			this.channel = new BroadcastChannel('djamms-player-sync');
			this.channel.addEventListener('message', this.handleMessage.bind(this));
		}
	}

	/**
	 * Initialize the sync service for the main dashboard/controller window
	 */
	initialize() {
		if (!browser) return;
		
		this.instanceId = InstanceIds.dashboard();
		console.log('PlayerSync initialized for dashboard:', this.instanceId);
	}

	/**
	 * Initialize the sync service for a specific window (videoplayer, queuemanager, etc.)
	 */
	initializeForWindow() {
		if (!browser) return;
		
		this.instanceId = InstanceIds.window();
		console.log('PlayerSync initialized for window:', this.instanceId);
		
		// Request current status from other windows
		this.requestCurrentStatus();
	}

	/**
	 * Handle incoming messages from other windows
	 */
	private handleMessage(event: MessageEvent) {
		const { type, instanceId, status, timestamp } = event.data;
		
		// Don't process our own messages
		if (instanceId === this.instanceId) return;
		
		console.log('PlayerSync received message:', event.data);

		switch (type) {
			case 'player-state-change':
				// Update local player status without broadcasting back
				console.log('🎵 PlayerSync: Received player state change:', status, 'from instance:', instanceId);
				// TODO: Update venue state through djammsStore
				// playerStatus.setStatus({
				// 	status: status,
				// 	last_updated: timestamp
				// });
				break;

			case 'track-change-request':
				// Queue manager is requesting videoplayer to change track
				const { track } = event.data;
				if (track) {
					console.log('PlayerSync: Received track change request:', track.title);
					// This will be handled by videoplayer
					window.dispatchEvent(new CustomEvent('track-change-request', { detail: track }));
				}
				break;
				
			case 'request-status':
				// Another window is requesting current status
				this.broadcastCurrentStatus();
				break;
				
			case 'status-response':
				// Another window is responding with current status
				// TODO: Update venue state through djammsStore
				console.log('PlayerSync: Received status response:', status);
				// playerStatus.setStatus({
				// 	status: status,
				// 	last_updated: timestamp
				// });
				break;
				
			case 'player-disconnection':
				// A player window has disconnected
				if (status === 'no-connected-player') {
					// TODO: Update venue state through djammsStore
					console.log('PlayerSync: Player disconnected');
					// playerStatus.setStatus({
					// 	status: 'no-connected-player',
					// 	last_updated: timestamp
					// });
				}
				break;
		}
	}

	/**
	 * Broadcast a state change to all other windows
	 */
	broadcastStateChange(status: string, sourceInstanceId?: string) {
		if (!browser || !this.channel) return;
		
		const message = {
			type: 'player-state-change',
			instanceId: sourceInstanceId || this.instanceId,
			status: status,
			timestamp: new Date().toISOString()
		};
		
		console.log('Broadcasting state change:', message);
		this.channel.postMessage(message);
	}

	/**
	 * Request current status from other windows
	 */
	requestCurrentStatus() {
		if (!browser || !this.channel) return;
		
		const message = {
			type: 'request-status',
			instanceId: this.instanceId,
			timestamp: new Date().toISOString()
		};
		
		console.log('Requesting current status:', message);
		this.channel.postMessage(message);
	}

	/**
	 * Broadcast current status to other windows (response to request)
	 */
	private broadcastCurrentStatus() {
		if (!browser || !this.channel) return;
		
		// Get current status from store
		let currentStatus = 'no-connected-player';
		// TODO: Get status from djammsStore
		// const unsubscribe = playerStatus.subscribe(status => {
		// 	currentStatus = status.status;
		// });
		// unsubscribe();
		
		const message = {
			type: 'status-response',
			instanceId: this.instanceId,
			status: currentStatus,
			timestamp: new Date().toISOString()
		};
		
		console.log('Broadcasting current status:', message);
		this.channel.postMessage(message);
	}

	/**
	 * Broadcast disconnection event
	 */
	broadcastDisconnection(sourceInstanceId?: string) {
		if (!browser || !this.channel) return;
		
		const message = {
			type: 'player-disconnection',
			instanceId: sourceInstanceId || this.instanceId,
			status: 'no-connected-player',
			timestamp: new Date().toISOString()
		};
		
		console.log('Broadcasting disconnection:', message);
		this.channel.postMessage(message);
	}

	/**
	 * Request videoplayer to change to a specific track
	 */
	requestTrackChange(track: any) {
		if (!browser || !this.channel) return;
		
		const message = {
			type: 'track-change-request',
			instanceId: this.instanceId,
			track: track,
			timestamp: new Date().toISOString()
		};
		
		console.log('Broadcasting track change request:', message);
		this.channel.postMessage(message);
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		if (this.channel) {
			this.channel.close();
			this.channel = null;
		}
		this.instanceId = null;
	}
}

// Export singleton instance
export const playerSync = new PlayerSyncService();
