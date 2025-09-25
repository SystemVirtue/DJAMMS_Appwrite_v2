# DJAMMS Copilot Instructions Documentation

## Table of Contents
- [Instructions Overview](#instructions-overview)
- [Project Context Guidelines](#project-context-guidelines)
- [Development Patterns](#development-patterns)
- [Code Style Guidelines](#code-style-guidelines)
- [Architecture Principles](#architecture-principles)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Troubleshooting Guide](#troubleshooting-guide)

## Instructions Overview

This document explains the GitHub Copilot instructions for the DJAMMS project, providing context and guidance for AI-assisted development. These instructions help Copilot understand the project's unique architecture, coding patterns, and development philosophy.

### Purpose of Copilot Instructions
- **Context Awareness**: Help Copilot understand DJAMMS's multi-window architecture and real-time synchronization requirements
- **Code Consistency**: Ensure generated code follows project patterns and conventions
- **Technical Focus**: Guide Copilot toward SvelteKit, TypeScript, and Appwrite best practices
- **Domain Knowledge**: Provide understanding of jukebox/music player domain concepts

## Project Context Guidelines

### Core Project Identity
```markdown
# DJAMMS - Digital Jukebox and Media Management System

## Project Overview
DJAMMS (Digital Jukebox and Media Management System) is a comprehensive YouTube music video player and media manager built with SvelteKit, TypeScript, and Appwrite backend.

## Architecture
- **Multi-window application** with real-time synchronization
- **Instance-based architecture** where each player has a unique identifier
- **SvelteKit frontend** with TypeScript and Tailwind CSS
- **Appwrite backend** for authentication, database, and real-time features
```

### Key Architectural Concepts

#### Multi-Window Architecture
When working with DJAMMS, Copilot should understand:
- Each browser window/tab is an independent "instance"
- Instances synchronize state through Appwrite real-time subscriptions
- Instance IDs follow pattern: `{type}-{timestamp}-{random}`
- Heartbeat mechanism keeps instances alive and synchronized

#### Real-Time Synchronization
Critical concepts for Copilot awareness:
- State changes propagate immediately across all open windows
- WebSocket connections handle real-time updates
- Conflict resolution handles simultaneous updates
- Background services manage queue progression

#### Priority Queue System
Understanding the queue management:
- Priority 1-10: User-requested songs (1 = highest)
- Priority 11+: Auto-queued from active playlist
- FIFO ordering within same priority level
- Dynamic reordering capabilities

### Component Structure Understanding

#### Route Organization
```
/                  - Homepage with Google OAuth authentication
/dashboard         - Main interface with 4 navigation cards  
/videoplayer       - YouTube video player window
/queuemanager      - Playlist and queue management
/playlistlibrary   - Playlist CRUD operations
/adminconsole      - Player preferences and customization
```

#### Service Layer Architecture
Key services Copilot should be familiar with:
- `JukeboxService`: Central state management and queue operations
- `BackgroundQueueManager`: Auto-progression and playlist management
- `PlayerSync`: Multi-window synchronization logic
- `YouTubeService`: Video search and metadata handling

## Development Patterns

### SvelteKit Patterns

#### File-Based Routing
```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    
    export let data: PageData;
    
    onMount(() => {
        // Component initialization
    });
</script>
```

#### Server-Side Data Loading
```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    // Server-side data loading
    return {
        // Data passed to page component
    };
};
```

### State Management Patterns

#### Svelte Stores
```typescript
// src/lib/stores/jukebox.ts
import { writable, derived } from 'svelte/store';
import type { JukeboxState, QueueItem } from '$lib/types';

export const jukeboxState = writable<JukeboxState | null>(null);
export const queueItems = writable<QueueItem[]>([]);

// Derived stores for computed values
export const isPlaying = derived(
    jukeboxState, 
    $state => $state?.status === 'playing'
);
```

#### Real-Time Subscriptions
```typescript
// Pattern for Appwrite real-time subscriptions
import { client } from '$lib/appwrite';

export function subscribeToJukeboxState(callback: (state: JukeboxState) => void) {
    return client.subscribe(
        `databases.${DATABASE_ID}.collections.jukebox_state.documents`,
        (response) => {
            if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                callback(response.payload);
            }
        }
    );
}
```

### Error Handling Patterns

#### Service Error Handling
```typescript
// Consistent error handling in services
export class JukeboxService {
    async addToQueue(track: Track, priority = 11): Promise<QueueItem> {
        try {
            const result = await databases.createDocument(
                DATABASE_ID,
                'priority_queue',
                'unique()',
                { ...track, priority, added_at: new Date() }
            );
            return result;
        } catch (error) {
            console.error('Failed to add to queue:', error);
            throw new Error(`Queue addition failed: ${error.message}`);
        }
    }
}
```

#### Component Error Boundaries
```svelte
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher<{ error: Error }>();
    
    function handleError(error: Error) {
        console.error('Component error:', error);
        dispatch('error', error);
        // Show user-friendly error message
    }
</script>
```

## Code Style Guidelines

### TypeScript Standards

#### Interface Definitions
```typescript
// Comprehensive type definitions
interface JukeboxState {
    status: PlayerStatus;
    current_track: Track | null;
    position: number;
    volume: number;
    is_shuffle: boolean;
    is_repeat: boolean;
    last_updated: string;
}

interface QueueItem {
    $id: string;
    video_id: string;
    title: string;
    artist?: string;
    duration: number;
    thumbnail?: string;
    priority: number;
    added_by: string;
    added_at: string;
    source: QueueSource;
}

type PlayerStatus = 
    | 'ready'
    | 'loading'
    | 'playing'
    | 'paused'
    | 'ended'
    | 'error'
    | 'blocked';

type QueueSource = 
    | 'user_request'
    | 'playlist_auto'
    | 'shuffle_add'
    | 'repeat_add';
```

#### Service Class Structure
```typescript
export class ServiceName {
    private appwriteClient: Client;
    private database: Databases;
    
    constructor() {
        this.appwriteClient = client;
        this.database = new Databases(this.appwriteClient);
    }
    
    // Public methods with full type safety
    async publicMethod(param: ParamType): Promise<ReturnType> {
        try {
            // Implementation
        } catch (error) {
            // Error handling
        }
    }
    
    // Private utility methods
    private utilityMethod(): void {
        // Helper functionality
    }
}
```

### Svelte Component Structure

#### Component Organization
```svelte
<!-- 1. Script tag with TypeScript -->
<script lang="ts">
    // Imports first
    import { onMount, createEventDispatcher } from 'svelte';
    import type { ComponentProps } from './types';
    
    // Props with proper typing
    export let propName: PropType;
    export let optionalProp: OptionalType | undefined = undefined;
    
    // Event dispatcher
    const dispatch = createEventDispatcher<EventMap>();
    
    // Local state
    let localVariable: StateType;
    
    // Reactive statements
    $: derivedValue = computation(propName);
    $: if (condition) {
        // Reactive side effects
    }
    
    // Lifecycle
    onMount(() => {
        // Mount logic
        return () => {
            // Cleanup
        };
    });
    
    // Event handlers
    function handleEvent(event: Event) {
        // Event handling logic
        dispatch('customEvent', { data });
    }
</script>

<!-- 2. Markup with semantic HTML -->
<main class="container">
    <header class="header">
        <h1 class="title">{title}</h1>
    </header>
    
    <section class="content">
        <!-- Component content -->
    </section>
</main>

<!-- 3. Scoped styles with Tailwind classes -->
<style>
    /* Only custom styles that can't be achieved with Tailwind */
    .custom-animation {
        animation: customKeyframes 0.3s ease-in-out;
    }
    
    @keyframes customKeyframes {
        /* Animation definition */
    }
</style>
```

### CSS and Styling Patterns

#### Tailwind Usage
```svelte
<!-- Prefer Tailwind utility classes -->
<div class="
    bg-surface-100-800-token 
    p-4 rounded-lg shadow-lg
    dark:bg-surface-800 
    transition-colors duration-200
">
    <!-- Content -->
</div>

<!-- Use Skeleton UI tokens for consistency -->
<button class="btn variant-filled-primary">
    Action Button
</button>
```

#### Glass-morphism Design
```svelte
<!-- Glass effect pattern used throughout DJAMMS -->
<div class="
    backdrop-blur-sm bg-surface-100/10 dark:bg-surface-800/10
    border border-surface-200/20 dark:border-surface-700/20
    rounded-lg shadow-lg
">
    <!-- Glass container content -->
</div>
```

## Architecture Principles

### Multi-Window Design Principles

#### Instance Management
```typescript
// Every window should have instance tracking
export class WindowInstance {
    private instanceId: string;
    private heartbeatInterval: number;
    
    constructor(type: WindowType) {
        this.instanceId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.startHeartbeat();
    }
    
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.updateHeartbeat();
        }, 30000); // 30 second heartbeat
    }
}
```

#### State Synchronization
```typescript
// All state changes should propagate via Appwrite
export async function updateJukeboxState(
    updates: Partial<JukeboxState>
): Promise<void> {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            'jukebox_state',
            'jukebox_main_state',
            {
                ...updates,
                last_updated: new Date().toISOString()
            }
        );
        // Real-time subscriptions handle propagation
    } catch (error) {
        throw new Error(`State update failed: ${error.message}`);
    }
}
```

### Service Layer Architecture

#### Single Responsibility Principle
Each service should have a clear, focused responsibility:
- `JukeboxService`: Core jukebox state and queue management
- `PlaylistService`: Playlist CRUD operations  
- `YouTubeService`: Video search and metadata
- `AuthService`: Authentication and user management
- `InstanceService`: Multi-window instance tracking

#### Dependency Injection Pattern
```typescript
// Services should be injected, not instantiated directly
export class ComponentService {
    constructor(
        private jukeboxService: JukeboxService,
        private playlistService: PlaylistService
    ) {}
}

// In Svelte components, get services from context
const jukeboxService = getContext<JukeboxService>('jukeboxService');
```

## Testing & Quality Assurance

### Unit Testing Patterns

#### Service Testing
```typescript
// src/lib/services/__tests__/JukeboxService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JukeboxService } from '../JukeboxService';

describe('JukeboxService', () => {
    let service: JukeboxService;
    
    beforeEach(() => {
        // Mock Appwrite dependencies
        service = new JukeboxService();
    });
    
    it('should add track to queue with correct priority', async () => {
        const track = { /* mock track */ };
        const result = await service.addToQueue(track, 5);
        
        expect(result.priority).toBe(5);
        expect(result.video_id).toBe(track.video_id);
    });
});
```

#### Component Testing
```typescript
// src/lib/components/__tests__/QueueDisplay.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import QueueDisplay from '../QueueDisplay.svelte';

describe('QueueDisplay', () => {
    it('renders queue items in priority order', () => {
        const mockQueue = [/* mock queue items */];
        
        render(QueueDisplay, { queue: mockQueue });
        
        const items = screen.getAllByTestId('queue-item');
        expect(items).toHaveLength(mockQueue.length);
    });
});
```

### End-to-End Testing Patterns

#### Multi-Window Testing
```typescript
// tests/multi-window.spec.ts
import { test, expect } from '@playwright/test';

test('multi-window synchronization', async ({ browser }) => {
    // Create multiple browser contexts (windows)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Both windows navigate to dashboard
    await page1.goto('/dashboard');
    await page2.goto('/videoplayer');
    
    // Action in window 1 should reflect in window 2
    await page1.click('[data-testid="play-button"]');
    
    // Verify synchronization
    await expect(page2.locator('[data-testid="player-status"]'))
        .toContainText('playing');
});
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Real-Time Synchronization Issues
```typescript
// Problem: State not synchronizing between windows
// Solution: Check WebSocket connection status
function debugRealtimeConnection(): void {
    const subscription = client.subscribe('test', (response) => {
        console.log('Real-time connection test:', response);
    });
    
    // Test connection after 5 seconds
    setTimeout(() => {
        subscription(); // Unsubscribe
        console.log('Real-time connection test completed');
    }, 5000);
}
```

#### Queue Priority Issues
```typescript
// Problem: Queue items not appearing in correct order
// Solution: Check priority calculation and sorting
function debugQueueOrder(items: QueueItem[]): void {
    console.log('Queue order debug:');
    items.forEach((item, index) => {
        console.log(`${index}: ${item.title} (Priority: ${item.priority}, Added: ${item.added_at})`);
    });
    
    // Verify sorting logic
    const sorted = [...items].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
    });
    
    console.log('Expected order matches actual:', 
        JSON.stringify(items) === JSON.stringify(sorted)
    );
}
```

#### YouTube Player Issues
```typescript
// Problem: YouTube player not loading or responding
// Solution: Check YouTube API integration
function debugYouTubePlayer(): void {
    if (typeof YT === 'undefined') {
        console.error('YouTube API not loaded');
        return;
    }
    
    if (!window.YT.Player) {
        console.error('YouTube Player API not available');
        return;
    }
    
    console.log('YouTube API status: Ready');
    console.log('Player state:', player?.getPlayerState());
}
```

### Performance Debugging

#### Memory Usage Monitoring
```typescript
// Monitor memory usage for potential leaks
function monitorMemoryUsage(): void {
    if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('Memory usage:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
    }
}

// Monitor every 30 seconds in development
if (import.meta.env.DEV) {
    setInterval(monitorMemoryUsage, 30000);
}
```

#### WebSocket Connection Monitoring
```typescript
// Monitor WebSocket connection health
function monitorRealtimeConnection(): void {
    let connectionAttempts = 0;
    let lastConnectionTime = Date.now();
    
    const subscription = client.subscribe('heartbeat', (response) => {
        const now = Date.now();
        const latency = now - lastConnectionTime;
        
        console.log(`Real-time latency: ${latency}ms`);
        
        if (latency > 1000) {
            console.warn('High real-time latency detected');
        }
        
        lastConnectionTime = now;
    });
    
    return subscription;
}
```

This documentation provides comprehensive guidance for GitHub Copilot when working with the DJAMMS codebase, ensuring consistent, high-quality code generation that aligns with the project's architecture and development patterns.