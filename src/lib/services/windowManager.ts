import { browser } from '$app/environment';
import { InstanceIds } from '../utils/idGenerator';

interface WindowInfo {
	id: string;
	endpoint: string;
	window?: Window;
	opened: number;
	tabId: string;
}

/**
 * WindowManager - Manages multiple application windows and prevents duplicates
 * Uses BroadcastChannel + sessionStorage for robust duplicate prevention
 */
export class WindowManager {
	private static instance: WindowManager;
	private broadcastChannel: BroadcastChannel | null = null;
	private openWindows = new Map<string, WindowInfo>();
	private currentEndpoint: string = '';
	private currentTabId: string = '';

	private constructor() {
		if (browser) {
			this.currentTabId = this.generateTabId();
			this.setupBroadcastChannel();
			this.setupBeforeUnloadHandler();
			this.registerCurrentWindow();
			this.startPeriodicCleanup();
		}
	}

	static getInstance(): WindowManager {
		if (!WindowManager.instance) {
			WindowManager.instance = new WindowManager();
		}
		return WindowManager.instance;
	}

	private generateTabId(): string {
		return InstanceIds.tab();
	}

	private setupBroadcastChannel() {
		try {
			this.broadcastChannel = new BroadcastChannel('djamms-window-manager');
			this.broadcastChannel.addEventListener('message', this.handleMessage.bind(this));
		} catch (error) {
			console.warn('Failed to setup window manager broadcast channel:', error);
		}
	}

	private handleMessage(event: MessageEvent) {
		const { type, payload } = event.data;

		switch (type) {
			case 'window-opened':
				this.openWindows.set(payload.endpoint, payload);
				break;
			case 'window-closed':
				this.openWindows.delete(payload.endpoint);
				this.clearEndpointFlag(payload.endpoint);
				break;
			case 'window-focus-request':
				if (payload.endpoint === this.currentEndpoint) {
					// Multiple focus attempts for better reliability
					window.focus();
					
					// Scroll to top to ensure visibility
					window.scrollTo(0, 0);
					
					// Try focusing with a slight delay
					setTimeout(() => {
						window.focus();
						document.body.focus();
					}, 50);
					
					// Send confirmation back
					this.broadcastChannel?.postMessage({
						type: 'window-focused',
						payload: { endpoint: this.currentEndpoint }
					});
				}
				break;
			case 'ping-windows':
				// Respond with current window info
				this.broadcastWindowInfo();
				break;
			case 'instance-check':
				// Respond if we have this endpoint open
				if (payload.endpoint === this.currentEndpoint) {
					this.broadcastChannel?.postMessage({
						type: 'instance-exists',
						payload: { 
							endpoint: this.currentEndpoint,
							tabId: this.currentTabId
						}
					});
				}
				break;
		}
	}

	private setupBeforeUnloadHandler() {
		window.addEventListener('beforeunload', () => {
			this.unregisterCurrentWindow();
		});
	}

	private startPeriodicCleanup() {
		// Clean up closed windows every 5 seconds
		setInterval(() => {
			this.cleanupClosedWindows();
		}, 5000);
	}

	private cleanupClosedWindows() {
		for (const [endpoint, windowInfo] of this.openWindows.entries()) {
			if (windowInfo.window && windowInfo.window.closed) {
				console.log(`Cleaning up closed window for ${endpoint}`);
				this.openWindows.delete(endpoint);
				this.clearEndpointFlag(endpoint);
				this.broadcastChannel?.postMessage({
					type: 'window-closed',
					payload: { endpoint }
				});
			}
		}
	}

	private registerCurrentWindow() {
		this.currentEndpoint = window.location.pathname;
		
		// Set sessionStorage flag for this endpoint
		this.setEndpointFlag(this.currentEndpoint);

		const windowInfo: WindowInfo = {
			id: InstanceIds.window(),
			endpoint: this.currentEndpoint,
			window: window,
			opened: Date.now(),
			tabId: this.currentTabId
		};

		this.openWindows.set(this.currentEndpoint, windowInfo);
		this.broadcastWindowOpened(windowInfo);
	}

	private unregisterCurrentWindow() {
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: 'window-closed',
				payload: { endpoint: this.currentEndpoint }
			});
		}
		this.clearEndpointFlag(this.currentEndpoint);
		this.openWindows.delete(this.currentEndpoint);
	}

	private setEndpointFlag(endpoint: string) {
		try {
			sessionStorage.setItem(`djamms-open-${endpoint}`, this.currentTabId);
		} catch (error) {
			console.warn('Failed to set endpoint flag:', error);
		}
	}

	private clearEndpointFlag(endpoint: string) {
		try {
			const currentTabId = sessionStorage.getItem(`djamms-open-${endpoint}`);
			if (currentTabId === this.currentTabId) {
				sessionStorage.removeItem(`djamms-open-${endpoint}`);
			}
		} catch (error) {
			console.warn('Failed to clear endpoint flag:', error);
		}
	}

	private isEndpointFlagged(endpoint: string): boolean {
		try {
			return sessionStorage.getItem(`djamms-open-${endpoint}`) !== null;
		} catch (error) {
			console.warn('Failed to check endpoint flag:', error);
			return false;
		}
	}

	private broadcastWindowOpened(windowInfo: WindowInfo) {
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: 'window-opened',
				payload: {
					id: windowInfo.id,
					endpoint: windowInfo.endpoint,
					opened: windowInfo.opened,
					tabId: windowInfo.tabId
				}
			});
		}
	}

	private broadcastWindowInfo() {
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: 'window-opened',
				payload: {
					id: InstanceIds.window(),
					endpoint: this.currentEndpoint,
					opened: Date.now(),
					tabId: this.currentTabId
				}
			});
		}
	}

	private pingAllWindows() {
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: 'ping-windows',
				payload: {}
			});
		}
	}

	/**
	 * Check if endpoint is already open using multiple detection methods
	 */
	private async checkInstanceExists(endpoint: string): Promise<boolean> {
		// Method 1: Check sessionStorage flag
		if (this.isEndpointFlagged(endpoint)) {
			console.log(`${endpoint} flagged as open in sessionStorage`);
			
			// Method 2: Verify via BroadcastChannel
			if (this.broadcastChannel) {
				return new Promise((resolve) => {
					const timeout = setTimeout(() => {
						console.log(`No response for ${endpoint} - may be stale flag`);
						this.clearEndpointFlag(endpoint); // Clear stale flag
						resolve(false);
					}, 200);

					const handler = (event: MessageEvent) => {
						const { type, payload } = event.data;
						if (type === 'instance-exists' && payload.endpoint === endpoint) {
							clearTimeout(timeout);
							this.broadcastChannel?.removeEventListener('message', handler);
							resolve(true);
						}
					};

					if (this.broadcastChannel) {
						this.broadcastChannel.addEventListener('message', handler);
						this.broadcastChannel.postMessage({
							type: 'instance-check',
							payload: { endpoint }
						});
					}
				});
			}
		}

		return false;
	}

	/**
	 * Focus an existing window for the given endpoint
	 */
	private focusWindow(endpoint: string) {
		console.log(`Attempting to focus existing window for ${endpoint}`);
		
		// Method 1: Try direct window reference first (most reliable)
		const windowInfo = this.openWindows.get(endpoint);
		if (windowInfo && windowInfo.window && !windowInfo.window.closed) {
			try {
				// Multiple focus attempts for better reliability
				windowInfo.window.focus();
				
				// Try to bring window to front (works in some browsers)
				const anyWindow = windowInfo.window as any;
				if (anyWindow.moveToFront) {
					anyWindow.moveToFront();
				}
				
				// Alternative focus method
				setTimeout(() => {
					if (windowInfo.window && !windowInfo.window.closed) {
						windowInfo.window.focus();
					}
				}, 100);
				
				console.log(`Successfully focused window for ${endpoint}`);
			} catch (error) {
				console.warn('Failed to focus window directly:', error);
			}
		}
		
		// Method 2: Send broadcast message as backup
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: 'window-focus-request',
				payload: { endpoint }
			});
		}
		
		// Method 3: Try to simulate user interaction (works around popup blockers)
		setTimeout(() => {
			if (windowInfo && windowInfo.window && !windowInfo.window.closed) {
				try {
					// Create a temporary event to try focusing again
					const focusEvent = new Event('focus', { bubbles: true });
					windowInfo.window.dispatchEvent(focusEvent);
				} catch (error) {
					console.warn('Failed to dispatch focus event:', error);
				}
			}
		}, 200);
	}

	/**
	 * Open an endpoint, focusing existing window if available
	 */
	async openEndpoint(endpoint: string): Promise<boolean> {
		console.log(`Attempting to open ${endpoint}`);

		// Check if endpoint is already open
		const instanceExists = await this.checkInstanceExists(endpoint);
		
		if (instanceExists) {
			console.log(`${endpoint} already open - focusing existing window`);
			this.focusWindow(endpoint);
			return false; // Didn't open new window
		} else {
			console.log(`Opening new window for ${endpoint}`);
			
			// Create absolute URL for the endpoint
			const absoluteUrl = window.location.origin + endpoint;
			const newWindow = window.open(absoluteUrl, '_blank', this.getWindowFeatures(endpoint));
			
			if (newWindow) {
				// Register the new window
				const windowInfo: WindowInfo = {
					id: InstanceIds.window(),
					endpoint: endpoint,
					window: newWindow,
					opened: Date.now(),
					tabId: InstanceIds.tab()
				};
				
				this.openWindows.set(endpoint, windowInfo);
				this.setEndpointFlag(endpoint); // Set flag after successful registration
				this.broadcastWindowOpened(windowInfo);
				return true; // Opened new window
			} else {
				// Failed to open window
				return false;
			}
		}
	}

	private getWindowFeatures(endpoint: string): string {
		const base = 'resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no';
		switch (endpoint) {
			case '/videoplayer':
				return `${base},width=1280,height=720,left=100,top=100`;
			case '/queuemanager':
				return `${base},width=1000,height=800,left=200,top=150`;
			case '/playlistlibrary':
				return `${base},width=1200,height=900,left=150,top=100`;
			case '/dashboard':
			case '/adminconsole':
				return `${base},width=1100,height=850,left=250,top=200`;
			default:
				return `${base},width=1024,height=768`;
		}
	}

	/**
	 * Get all currently open windows
	 */
	getOpenWindows(): any[] {
		const windows: any[] = [];
		
		for (const [endpoint, windowInfo] of this.openWindows.entries()) {
			windows.push({
				endpoint,
				opened: new Date(windowInfo.opened).toLocaleString(),
				tabId: windowInfo.tabId,
				isCurrentWindow: endpoint === this.currentEndpoint
			});
		}
		
		return windows;
	}

	/**
	 * Check if a specific endpoint/window is currently open
	 */
	isWindowOpen(endpoint: string): boolean {
		// Check if we have the window in our registry and it's not closed
		const windowInfo = this.openWindows.get(endpoint);
		if (!windowInfo) {
			return false;
		}

		// If it has a window reference, check if it's still open
		if (windowInfo.window && windowInfo.window.closed) {
			// Clean up closed window
			this.openWindows.delete(endpoint);
			this.clearEndpointFlag(endpoint);
			return false;
		}

		// Check sessionStorage flag as backup
		return this.isEndpointFlagged(endpoint);
	}

	/**
	 * Check if current page should prevent loading due to duplicate instance
	 */
	shouldPreventDuplicate(): boolean {
		const currentPath = window.location.pathname;
		
		// Only prevent duplicates for specific endpoints
		const restrictedPaths = ['/videoplayer', '/queuemanager', '/playlistlibrary', '/dashboard', '/adminconsole'];
		if (!restrictedPaths.includes(currentPath)) {
			return false;
		}

		// Check if this endpoint is flagged by another tab
		const existingTabId = sessionStorage.getItem(`djamms-open-${currentPath}`);
		return existingTabId !== null && existingTabId !== this.currentTabId;
	}
}

// Export singleton instance
export const windowManager = WindowManager.getInstance();