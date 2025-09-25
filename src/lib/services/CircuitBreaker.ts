// Enhanced Circuit Breaker and Error Handling for DJAMMS
// Inspired by React app patterns with SvelteKit integration

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Types for circuit breaker and error handling
export interface CircuitBreakerState {
	isOpen: boolean;
	failureCount: number;
	lastFailureTime: number;
	successCount: number;
	totalCalls: number;
	state: 'closed' | 'open' | 'half-open';
}

export interface ApiEndpoint {
	name: string;
	url: string;
	maxFailures: number;
	timeout: number;
	resetTimeout: number;
	rateLimitPerMinute: number;
	priority: number;
}

export interface ErrorContext {
	operation: string;
	endpoint: string;
	error: Error;
	timestamp: number;
	retryAttempt: number;
	context?: any;
}

export interface ApiQuotaStatus {
	endpoint: string;
	callsThisMinute: number;
	callsThisHour: number;
	quotaLimitMinute: number;
	quotaLimitHour: number;
	resetTime: number;
	isQuotaExceeded: boolean;
}

// Default circuit breaker configuration
const DEFAULT_CIRCUIT_CONFIG = {
	maxFailures: 5,
	timeout: 10000, // 10 seconds
	resetTimeout: 60000, // 1 minute
	rateLimitPerMinute: 15,
	halfOpenMaxCalls: 3
};

export class DjammsCircuitBreaker {
	private circuitStates = new Map<string, CircuitBreakerState>();
	private callCounts = new Map<string, number[]>(); // Timestamps of API calls
	private apiQuotas = new Map<string, ApiQuotaStatus>();
	private errorHistory: ErrorContext[] = [];
	
	// Reactive stores for monitoring
	public circuitStatus = writable<Map<string, CircuitBreakerState>>(new Map());
	public errorLog = writable<ErrorContext[]>([]);
	public quotaStatus = writable<Map<string, ApiQuotaStatus>>(new Map());
	
	// Configuration
	private config = DEFAULT_CIRCUIT_CONFIG;

	constructor(customConfig?: Partial<typeof DEFAULT_CIRCUIT_CONFIG>) {
		if (customConfig) {
			this.config = { ...this.config, ...customConfig };
		}

		// Setup periodic cleanup
		if (browser) {
			this.setupPeriodicCleanup();
		}
	}

	// ===== CIRCUIT BREAKER CORE LOGIC =====

	/**
	 * Execute an operation with circuit breaker protection
	 */
	async executeWithBreaker<T>(
		endpointName: string,
		operation: () => Promise<T>,
		fallback?: () => Promise<T>
	): Promise<T> {
		const circuitState = this.getCircuitState(endpointName);

		// Check if circuit is open
		if (circuitState.state === 'open') {
			if (this.shouldAttemptReset(circuitState)) {
				circuitState.state = 'half-open';
				console.log(`🔄 Circuit Breaker: ${endpointName} attempting reset (half-open)`);
			} else {
				const error = new Error(`Circuit breaker is open for ${endpointName}`);
				if (fallback) {
					console.log(`🔄 Circuit Breaker: Using fallback for ${endpointName}`);
					return await fallback();
				}
				throw error;
			}
		}

		// Check API quota before making call
		if (!this.canMakeApiCall(endpointName)) {
			const error = new Error(`API quota exceeded for ${endpointName}`);
			this.recordError(endpointName, 'quota_exceeded', error);
			
			if (fallback) {
				console.log(`📊 API Quota: Using fallback for ${endpointName}`);
				return await fallback();
			}
			throw error;
		}

		try {
			// Record the API call
			this.recordApiCall(endpointName);
			
			// Execute with timeout
			const result = await this.executeWithTimeout(operation, this.config.timeout);
			
			// Record success
			this.recordSuccess(endpointName);
			
			return result;
			
		} catch (error) {
			this.recordFailure(endpointName, error as Error);
			
			// If we have a fallback and circuit is not completely broken, try it
			if (fallback && circuitState.failureCount < this.config.maxFailures * 2) {
				console.log(`🔄 Circuit Breaker: Trying fallback for ${endpointName} after error:`, error);
				try {
					return await fallback();
				} catch (fallbackError) {
					console.error(`🔄 Circuit Breaker: Fallback also failed for ${endpointName}:`, fallbackError);
					throw error; // Throw original error
				}
			}
			
			throw error;
		}
	}

	/**
	 * Execute operation with timeout protection
	 */
	private async executeWithTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Operation timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			operation()
				.then(result => {
					clearTimeout(timer);
					resolve(result);
				})
				.catch(error => {
					clearTimeout(timer);
					reject(error);
				});
		});
	}

	// ===== API QUOTA MANAGEMENT =====

	canMakeApiCall(endpoint: string): boolean {
		const now = Date.now();
		const calls = this.callCounts.get(endpoint) || [];
		
		// Remove calls older than 1 minute
		const recentCalls = calls.filter(timestamp => now - timestamp < 60000);
		this.callCounts.set(endpoint, recentCalls);
		
		const quota = this.apiQuotas.get(endpoint) || this.createDefaultQuota(endpoint);
		
		// Check minute limit
		const minuteLimit = quota.quotaLimitMinute;
		const canMakeCall = recentCalls.length < minuteLimit;
		
		// Update quota status
		quota.callsThisMinute = recentCalls.length;
		quota.isQuotaExceeded = !canMakeCall;
		quota.resetTime = now + (60000 - (now % 60000)); // Next minute
		
		this.apiQuotas.set(endpoint, quota);
		this.updateQuotaStore();
		
		return canMakeCall;
	}

	recordApiCall(endpoint: string): void {
		const now = Date.now();
		const calls = this.callCounts.get(endpoint) || [];
		calls.push(now);
		this.callCounts.set(endpoint, calls);

		// Update quota tracking
		const quota = this.apiQuotas.get(endpoint) || this.createDefaultQuota(endpoint);
		quota.callsThisMinute = calls.filter(timestamp => now - timestamp < 60000).length;
		quota.callsThisHour = calls.filter(timestamp => now - timestamp < 3600000).length;
		this.apiQuotas.set(endpoint, quota);
		this.updateQuotaStore();
	}

	private createDefaultQuota(endpoint: string): ApiQuotaStatus {
		return {
			endpoint,
			callsThisMinute: 0,
			callsThisHour: 0,
			quotaLimitMinute: this.config.rateLimitPerMinute,
			quotaLimitHour: this.config.rateLimitPerMinute * 60,
			resetTime: Date.now() + 60000,
			isQuotaExceeded: false
		};
	}

	// ===== CIRCUIT STATE MANAGEMENT =====

	private getCircuitState(endpoint: string): CircuitBreakerState {
		if (!this.circuitStates.has(endpoint)) {
			this.circuitStates.set(endpoint, {
				isOpen: false,
				failureCount: 0,
				lastFailureTime: 0,
				successCount: 0,
				totalCalls: 0,
				state: 'closed'
			});
		}
		return this.circuitStates.get(endpoint)!;
	}

	private recordSuccess(endpoint: string): void {
		const state = this.getCircuitState(endpoint);
		state.successCount++;
		state.totalCalls++;
		
		if (state.state === 'half-open') {
			if (state.successCount >= this.config.halfOpenMaxCalls) {
				state.state = 'closed';
				state.failureCount = 0;
				console.log(`✅ Circuit Breaker: ${endpoint} reset to closed state`);
			}
		}
		
		this.updateCircuitStore();
	}

	private recordFailure(endpoint: string, error: Error): void {
		const state = this.getCircuitState(endpoint);
		state.failureCount++;
		state.totalCalls++;
		state.lastFailureTime = Date.now();

		// Record error for analysis
		this.recordError(endpoint, 'circuit_failure', error);

		if (state.failureCount >= this.config.maxFailures) {
			state.state = 'open';
			state.isOpen = true;
			console.error(`🚫 Circuit Breaker: ${endpoint} opened after ${state.failureCount} failures`);
		}

		this.updateCircuitStore();
	}

	private shouldAttemptReset(state: CircuitBreakerState): boolean {
		return Date.now() - state.lastFailureTime > this.config.resetTimeout;
	}

	// ===== ERROR LOGGING AND ANALYSIS =====

	private recordError(endpoint: string, operation: string, error: Error, context?: any): void {
		const errorContext: ErrorContext = {
			operation,
			endpoint,
			error,
			timestamp: Date.now(),
			retryAttempt: 0,
			context
		};

		this.errorHistory.unshift(errorContext);
		
		// Keep only last 100 errors
		if (this.errorHistory.length > 100) {
			this.errorHistory = this.errorHistory.slice(0, 100);
		}

		this.errorLog.set([...this.errorHistory]);
	}

	/**
	 * Get error statistics for monitoring
	 */
	getErrorStats(timeWindow: number = 3600000): {
		totalErrors: number;
		errorsByEndpoint: Record<string, number>;
		errorsByType: Record<string, number>;
		errorRate: number;
	} {
		const now = Date.now();
		const recentErrors = this.errorHistory.filter(error => 
			now - error.timestamp < timeWindow
		);

		const errorsByEndpoint = recentErrors.reduce((acc, error) => {
			acc[error.endpoint] = (acc[error.endpoint] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const errorsByType = recentErrors.reduce((acc, error) => {
			const type = error.error.name || 'Unknown';
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const totalCalls = Array.from(this.circuitStates.values())
			.reduce((sum, state) => sum + state.totalCalls, 0);

		return {
			totalErrors: recentErrors.length,
			errorsByEndpoint,
			errorsByType,
			errorRate: totalCalls > 0 ? recentErrors.length / totalCalls : 0
		};
	}

	// ===== RETRY LOGIC WITH EXPONENTIAL BACKOFF =====

	/**
	 * Retry operation with exponential backoff
	 */
	async retryWithBackoff<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000,
		maxDelay: number = 10000
	): Promise<T> {
		let lastError: Error;
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				if (attempt > 0) {
					const delay = Math.min(
						baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
						maxDelay
					);
					await this.sleep(delay);
				}
				
				return await operation();
				
			} catch (error) {
				lastError = error as Error;
				
				if (attempt === maxRetries) {
					break;
				}
				
				console.log(`🔄 Retry attempt ${attempt + 1} failed:`, error);
			}
		}
		
		throw lastError!;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	// ===== HEALTH MONITORING =====

	/**
	 * Check overall system health
	 */
	getSystemHealth(): {
		status: 'healthy' | 'degraded' | 'critical';
		openCircuits: string[];
		quotaExceededEndpoints: string[];
		recentErrorRate: number;
		recommendation: string;
	} {
		const openCircuits = Array.from(this.circuitStates.entries())
			.filter(([_, state]) => state.state === 'open')
			.map(([endpoint, _]) => endpoint);

		const quotaExceededEndpoints = Array.from(this.apiQuotas.values())
			.filter(quota => quota.isQuotaExceeded)
			.map(quota => quota.endpoint);

		const errorStats = this.getErrorStats();
		const recentErrorRate = errorStats.errorRate;

		let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
		let recommendation = 'System operating normally';

		if (openCircuits.length > 0 || recentErrorRate > 0.1) {
			status = 'critical';
			recommendation = 'Multiple services down - check network connectivity and API status';
		} else if (quotaExceededEndpoints.length > 0 || recentErrorRate > 0.05) {
			status = 'degraded';
			recommendation = 'Some services experiencing issues - consider using fallback methods';
		}

		return {
			status,
			openCircuits,
			quotaExceededEndpoints,
			recentErrorRate,
			recommendation
		};
	}

	// ===== STORE UPDATES =====

	private updateCircuitStore(): void {
		this.circuitStatus.set(new Map(this.circuitStates));
	}

	private updateQuotaStore(): void {
		this.quotaStatus.set(new Map(this.apiQuotas));
	}

	// ===== CLEANUP AND MAINTENANCE =====

	private setupPeriodicCleanup(): void {
		// Clean up old data every 5 minutes
		setInterval(() => {
			this.cleanupOldData();
		}, 300000);
	}

	private cleanupOldData(): void {
		const now = Date.now();
		const oneHourAgo = now - 3600000;

		// Clean up call counts
		for (const [endpoint, calls] of this.callCounts.entries()) {
			const recentCalls = calls.filter(timestamp => timestamp > oneHourAgo);
			this.callCounts.set(endpoint, recentCalls);
		}

		// Clean up error history
		this.errorHistory = this.errorHistory.filter(error => 
			error.timestamp > oneHourAgo
		);
		this.errorLog.set([...this.errorHistory]);

		// Reset quota exceeded flags for endpoints that have cooled down
		for (const [endpoint, quota] of this.apiQuotas.entries()) {
			if (quota.resetTime <= now) {
				quota.callsThisMinute = 0;
				quota.isQuotaExceeded = false;
				this.apiQuotas.set(endpoint, quota);
			}
		}

		this.updateQuotaStore();
	}

	/**
	 * Reset circuit breaker for specific endpoint
	 */
	resetCircuit(endpoint: string): void {
		const state = this.getCircuitState(endpoint);
		state.state = 'closed';
		state.isOpen = false;
		state.failureCount = 0;
		state.successCount = 0;
		
		this.updateCircuitStore();
		console.log(`🔄 Circuit Breaker: Manually reset ${endpoint}`);
	}

	/**
	 * Get circuit breaker statistics
	 */
	getCircuitStats(): {
		totalEndpoints: number;
		healthyEndpoints: number;
		degradedEndpoints: number;
		failedEndpoints: number;
		totalCalls: number;
		successRate: number;
	} {
		const states = Array.from(this.circuitStates.values());
		const totalCalls = states.reduce((sum, state) => sum + state.totalCalls, 0);
		const totalFailures = states.reduce((sum, state) => sum + state.failureCount, 0);

		return {
			totalEndpoints: states.length,
			healthyEndpoints: states.filter(s => s.state === 'closed' && s.failureCount === 0).length,
			degradedEndpoints: states.filter(s => s.state === 'half-open' || (s.state === 'closed' && s.failureCount > 0)).length,
			failedEndpoints: states.filter(s => s.state === 'open').length,
			totalCalls,
			successRate: totalCalls > 0 ? (totalCalls - totalFailures) / totalCalls : 1
		};
	}

	destroy(): void {
		// Clean up any timers or resources
		console.log('🛡️ Circuit Breaker: Destroyed');
	}
}

// ===== SPECIALIZED CIRCUIT BREAKERS FOR DIFFERENT SERVICE TYPES =====

export class YouTubeServiceBreaker extends DjammsCircuitBreaker {
	constructor() {
		super({
			maxFailures: 3,
			timeout: 8000,
			resetTimeout: 120000, // 2 minutes for YouTube API
			rateLimitPerMinute: 10, // More conservative for YouTube
			halfOpenMaxCalls: 2
		});
	}
}

export class AppwriteServiceBreaker extends DjammsCircuitBreaker {
	constructor() {
		super({
			maxFailures: 5,
			timeout: 5000,
			resetTimeout: 30000, // 30 seconds for Appwrite
			rateLimitPerMinute: 30, // Higher limit for our own backend
			halfOpenMaxCalls: 3
		});
	}
}

// ===== SVELTE STORES FOR UI INTEGRATION =====

export function createCircuitBreakerStores() {
	const youtubeBreaker = new YouTubeServiceBreaker();
	const appwriteBreaker = new AppwriteServiceBreaker();
	const mainBreaker = new DjammsCircuitBreaker();

	const systemHealth = derived(
		[youtubeBreaker.circuitStatus, appwriteBreaker.circuitStatus, mainBreaker.circuitStatus],
		([youtube, appwrite, main]) => {
			const allCircuits = new Map([...youtube, ...appwrite, ...main]);
			const openCircuits = Array.from(allCircuits.values())
				.filter(state => state.state === 'open').length;
			
			if (openCircuits === 0) return 'healthy';
			if (openCircuits <= 2) return 'degraded';
			return 'critical';
		}
	);

	const combinedErrors = derived(
		[youtubeBreaker.errorLog, appwriteBreaker.errorLog, mainBreaker.errorLog],
		([youtubeErrors, appwriteErrors, mainErrors]) => 
			[...youtubeErrors, ...appwriteErrors, ...mainErrors]
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, 50)
	);

	return {
		youtubeBreaker,
		appwriteBreaker,
		mainBreaker,
		systemHealth,
		combinedErrors,
		getOverallHealth: () => {
			const youtube = youtubeBreaker.getSystemHealth();
			const appwrite = appwriteBreaker.getSystemHealth();
			const main = mainBreaker.getSystemHealth();
			
			const worstStatus = [youtube.status, appwrite.status, main.status]
				.includes('critical') ? 'critical' :
				[youtube.status, appwrite.status, main.status]
				.includes('degraded') ? 'degraded' : 'healthy';

			return {
				status: worstStatus,
				youtube,
				appwrite,
				main,
				recommendation: worstStatus === 'critical' 
					? 'Multiple critical services down'
					: worstStatus === 'degraded'
					? 'Some services experiencing issues'
					: 'All services operating normally'
			};
		},
		destroy: () => {
			youtubeBreaker.destroy();
			appwriteBreaker.destroy();
			mainBreaker.destroy();
		}
	};
}