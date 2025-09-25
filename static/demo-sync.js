/**
 * Simple demo showing real-time player status synchronization
 * This demonstrates how the BroadcastChannel API works for multi-window sync
 */

// Mock player status types
const PLAYER_STATUSES = {
	NO_PLAYER: 'no-connected-player',
	CONNECTED_LOCAL_PLAYING: 'connected-local-playing',
	CONNECTED_LOCAL_PAUSED: 'connected-local-paused',
	CONNECTED_REMOTE_PLAYING: 'connected-remote-playing',
	CONNECTED_REMOTE_PAUSED: 'connected-remote-paused',
	SERVER_ERROR: 'server-error'
};

class DJAMMSPlayerSync {
	constructor() {
		this.channel = new BroadcastChannel('djamms-player-sync');
		this.currentStatus = PLAYER_STATUSES.NO_PLAYER;
		this.instanceId = `demo-${Date.now()}`;
		
		// Listen for messages from other windows
		this.channel.addEventListener('message', this.handleMessage.bind(this));
		
		// Create demo UI
		this.createDemoUI();
	}

	handleMessage(event) {
		console.log('Received sync message:', event.data);
		
		if (event.data.type === 'player-state-change') {
			this.updateStatus(event.data.status, false); // Don't broadcast back
		}
	}

	updateStatus(newStatus, shouldBroadcast = true) {
		this.currentStatus = newStatus;
		this.updateUI();
		
		if (shouldBroadcast) {
			this.broadcastStateChange(newStatus);
		}
	}

	broadcastStateChange(status) {
		const message = {
			type: 'player-state-change',
			instanceId: this.instanceId,
			status: status,
			timestamp: new Date().toISOString()
		};
		
		console.log('Broadcasting state change:', message);
		this.channel.postMessage(message);
	}

	createDemoUI() {
		// Add demo controls to the page
		const container = document.createElement('div');
		container.innerHTML = `
			<div style="
				position: fixed;
				top: 20px;
				right: 20px;
				background: rgba(0,0,0,0.8);
				color: white;
				padding: 20px;
				border-radius: 10px;
				border: 1px solid rgba(255,255,255,0.2);
				min-width: 300px;
				font-family: system-ui;
				z-index: 10000;
			">
				<h3 style="margin: 0 0 15px 0; color: #ec4899;">DJAMMS Player Sync Demo</h3>
				<div style="margin-bottom: 10px;">
					<strong>Current Status:</strong> 
					<span id="current-status" style="color: #22d3ee;">${this.currentStatus}</span>
				</div>
				<div style="margin-bottom: 15px;">
					<strong>Instance:</strong> 
					<span style="font-family: monospace; font-size: 12px;">${this.instanceId}</span>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
					<button id="btn-play" style="padding: 8px; background: #16a34a; color: white; border: none; border-radius: 5px; cursor: pointer;">▶ Play</button>
					<button id="btn-pause" style="padding: 8px; background: #dc2626; color: white; border: none; border-radius: 5px; cursor: pointer;">⏸ Pause</button>
					<button id="btn-remote" style="padding: 8px; background: #7c3aed; color: white; border: none; border-radius: 5px; cursor: pointer;">🌐 Remote</button>
					<button id="btn-disconnect" style="padding: 8px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">❌ Disconnect</button>
				</div>
				<div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
					Open this page in multiple windows to see real-time sync in action!
				</div>
			</div>
		`;
		
		document.body.appendChild(container);
		
		// Add event listeners
		document.getElementById('btn-play').onclick = () => {
			this.updateStatus(PLAYER_STATUSES.CONNECTED_LOCAL_PLAYING);
		};
		
		document.getElementById('btn-pause').onclick = () => {
			this.updateStatus(PLAYER_STATUSES.CONNECTED_LOCAL_PAUSED);
		};
		
		document.getElementById('btn-remote').onclick = () => {
			const isPlaying = this.currentStatus.includes('playing');
			this.updateStatus(isPlaying ? PLAYER_STATUSES.CONNECTED_REMOTE_PLAYING : PLAYER_STATUSES.CONNECTED_REMOTE_PAUSED);
		};
		
		document.getElementById('btn-disconnect').onclick = () => {
			this.updateStatus(PLAYER_STATUSES.NO_PLAYER);
		};
	}

	updateUI() {
		const statusElement = document.getElementById('current-status');
		if (statusElement) {
			statusElement.textContent = this.currentStatus;
			
			// Color coding
			if (this.currentStatus.includes('playing')) {
				statusElement.style.color = '#22d3ee'; // cyan
			} else if (this.currentStatus.includes('paused')) {
				statusElement.style.color = '#fbbf24'; // yellow
			} else if (this.currentStatus === PLAYER_STATUSES.NO_PLAYER) {
				statusElement.style.color = '#6b7280'; // gray
			} else {
				statusElement.style.color = '#ef4444'; // red
			}
		}
	}

	destroy() {
		this.channel.close();
	}
}

// Initialize when page loads
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		window.djammsSync = new DJAMMSPlayerSync();
	});
} else {
	window.djammsSync = new DJAMMSPlayerSync();
}

console.log('🎵 DJAMMS Player Sync Demo Loaded!');
console.log('📡 Open this page in multiple browser windows to see real-time synchronization');