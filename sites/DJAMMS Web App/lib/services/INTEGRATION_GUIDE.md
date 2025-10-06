# Enhanced Collections Integration Guide

## 🎯 Overview

This guide shows how to integrate the new enhanced collections with your existing DJAMMS components.

## 📁 What's Available

### **TypeScript Interfaces** (`src/lib/types/enhanced-collections.ts`)
- `UserQueue` & `ParsedUserQueue` - Queue management with shuffle/repeat
- `UserInstanceSettings` - User preferences per instance
- `EnhancedPlaylist` & `ParsedEnhancedPlaylist` - Rich playlist metadata
- `UserPlayHistory` - Listening analytics
- `UserPlaylistFavorites` - Favorites and ratings system

### **Service Classes** (`src/lib/services/`)
- `UserQueueService` - Queue CRUD operations
- `UserInstanceSettingsService` - Settings management
- `EnhancedPlaylistService` - Enhanced playlist operations
- `UserPlayHistoryService` - Analytics tracking
- `UserPlaylistFavoritesService` - Favorites management
- `PlaylistMigrationService` - Legacy to enhanced migration

### **Svelte Stores** (`src/lib/stores/enhanced.ts`)
- Reactive stores for all collections
- LocalStorage persistence
- Cross-store integration helpers

## 🚀 Basic Integration Examples

### 1. Using Enhanced Playlists

```typescript
// In your component script
import { Services } from '$lib/services';
import { enhancedPlaylists, currentEnhancedPlaylist } from '$lib/stores/enhanced';
import { onMount } from 'svelte';

const enhancedPlaylistService = Services.enhancedPlaylist();

onMount(async () => {
    try {
        const playlists = await enhancedPlaylistService.getUserPlaylists(userId);
        enhancedPlaylists.set(playlists);
    } catch (error) {
        console.error('Failed to load playlists:', error);
    }
});

// Create a new playlist
async function createPlaylist(name: string, tracks: PlaylistTrack[]) {
    try {
        const playlist = await enhancedPlaylistService.createPlaylist({
            user_id: userId,
            name: name,
            tracks: JSON.stringify(tracks),
            category: 'general'
        });
        
        // Update store
        enhancedPlaylists.update(playlists => [...playlists, playlist]);
    } catch (error) {
        console.error('Failed to create playlist:', error);
    }
}
```

### 2. Queue Management

```typescript
import { Services } from '$lib/services';
import { currentUserQueue } from '$lib/stores/enhanced';

const queueService = Services.userQueue();

// Load user queue
async function loadQueue(userId: string, instanceId: string) {
    try {
        const queue = await queueService.getUserQueue(userId, instanceId);
        currentUserQueue.set(queue);
    } catch (error) {
        console.error('Failed to load queue:', error);
    }
}

// Add track to queue
async function addTrackToQueue(track: PlaylistTrack) {
    try {
        const updatedQueue = await queueService.addTrackToQueue(
            userId, 
            instanceId, 
            track
        );
        currentUserQueue.set(updatedQueue);
    } catch (error) {
        console.error('Failed to add track:', error);
    }
}
```

### 3. User Settings Management

```typescript
import { Services } from '$lib/services';
import { userInstanceSettings } from '$lib/stores/enhanced';

const settingsService = Services.userSettings();

// Load settings with defaults
async function loadSettings(userId: string, instanceId: string) {
    try {
        const settings = await settingsService.getOrCreateUserSettings(
            userId, 
            instanceId
        );
        userInstanceSettings.set(settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Update audio quality
async function updateAudioQuality(quality: 'auto' | 'high' | 'medium' | 'low') {
    try {
        const updated = await settingsService.updateAudioQuality(
            userId, 
            instanceId, 
            quality
        );
        userInstanceSettings.set(updated);
    } catch (error) {
        console.error('Failed to update audio quality:', error);
    }
}
```

### 4. Play History Tracking

```typescript
import { Services } from '$lib/services';

const historyService = Services.playHistory();

// Record track play
async function recordPlay(track: PlaylistTrack, playedDuration: number) {
    try {
        await historyService.recordTrackPlayFromTrack(
            userId,
            instanceId,
            track,
            playlistId,
            sessionId,
            playedDuration,
            false // wasSkipped
        );
    } catch (error) {
        console.error('Failed to record play:', error);
    }
}

// Get listening stats
async function getStats() {
    try {
        const stats = await historyService.getUserListeningStats(userId, 30);
        console.log('Listening stats:', stats);
    } catch (error) {
        console.error('Failed to get stats:', error);
    }
}
```

### 5. Favorites Management

```typescript
import { Services } from '$lib/services';
import { userFavorites, favoritePlaylistIds } from '$lib/stores/enhanced';

const favoritesService = Services.favorites();

// Toggle favorite
async function toggleFavorite(playlistId: string) {
    try {
        const favorite = await favoritesService.toggleFavorite(userId, playlistId);
        
        // Update stores
        const favorites = await favoritesService.getUserFavorites(userId);
        userFavorites.set(favorites);
        updateFavoriteIds(favorites); // Helper from stores
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
    }
}

// Rate playlist
async function ratePlaylist(playlistId: string, rating: number) {
    try {
        await favoritesService.ratePlaylist(userId, playlistId, rating);
    } catch (error) {
        console.error('Failed to rate playlist:', error);
    }
}
```

## 🔄 Migration from Legacy System

### Automatic Migration

```typescript
import { Services } from '$lib/services';

const migrationService = Services.migration();

// Check migration status
async function checkMigrationNeeded() {
    const status = await migrationService.getMigrationStatus(userId);
    
    if (status.recommendMigration) {
        console.log(`Found ${status.legacyCount} playlists to migrate`);
        return true;
    }
    
    return false;
}

// Perform smart migration
async function performMigration() {
    try {
        const result = await migrationService.migrateWithSmartCategorization(
            userId,
            true // copyMode - keeps originals
        );
        
        console.log(`Migrated: ${result.migrated.length}, Failed: ${result.failed.length}`);
        
        if (result.failed.length > 0) {
            console.warn('Some playlists failed to migrate:', result.failed);
        }
        
        return result;
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
```

## 🎨 Component Integration Patterns

### Enhanced Playlist Component

```svelte
<script lang="ts">
    import { Services } from '$lib/services';
    import { enhancedPlaylists, isPlaylistsLoading } from '$lib/stores/enhanced';
    import { onMount } from 'svelte';
    
    export let userId: string;
    
    const playlistService = Services.enhancedPlaylist();
    
    onMount(async () => {
        await loadPlaylists();
    });
    
    async function loadPlaylists() {
        isPlaylistsLoading.set(true);
        try {
            const playlists = await playlistService.getUserPlaylists(userId);
            enhancedPlaylists.set(playlists);
        } catch (error) {
            console.error('Failed to load playlists:', error);
        } finally {
            isPlaylistsLoading.set(false);
        }
    }
    
    async function incrementPlayCount(playlistId: string) {
        try {
            await playlistService.incrementPlayCount(playlistId);
            await loadPlaylists(); // Refresh
        } catch (error) {
            console.error('Failed to increment play count:', error);
        }
    }
</script>

{#if $isPlaylistsLoading}
    <div class="loading">Loading playlists...</div>
{:else}
    <div class="playlists-grid">
        {#each $enhancedPlaylists as playlist}
            <div class="playlist-card">
                <h3>{playlist.name}</h3>
                <p>{playlist.description}</p>
                <div class="metadata">
                    <span class="category">{playlist.category}</span>
                    <span class="play-count">{playlist.play_count} plays</span>
                    <span class="duration">{Math.floor(playlist.total_duration / 60)}min</span>
                </div>
                <button on:click={() => incrementPlayCount(playlist.$id)}>
                    Play
                </button>
            </div>
        {/each}
    </div>
{/if}
```

## 🔧 Advanced Patterns

### Unified Service Pattern

```typescript
// Create a unified service that handles both legacy and enhanced
class UnifiedPlaylistService {
    private migration = Services.migration();
    private enhanced = Services.enhancedPlaylist();
    
    async getPlaylists(userId: string) {
        // Try enhanced first
        const enhanced = await this.enhanced.getUserPlaylists(userId);
        
        if (enhanced.length === 0) {
            // Check for legacy and suggest migration
            const needsMigration = await this.migration.hasLegacyPlaylists(userId);
            if (needsMigration) {
                // Auto-migrate or prompt user
                return this.handleLegacyPlaylists(userId);
            }
        }
        
        return enhanced;
    }
    
    private async handleLegacyPlaylists(userId: string) {
        // Implementation depends on your UX preferences
        const result = await this.migration.migrateWithSmartCategorization(userId);
        return result.migrated;
    }
}
```

## 📊 Analytics Integration

```typescript
// Track comprehensive analytics
class AnalyticsTracker {
    private history = Services.playHistory();
    
    async trackPlaySession(
        track: PlaylistTrack,
        startTime: Date,
        endTime: Date,
        wasCompleted: boolean
    ) {
        const playedDuration = (endTime.getTime() - startTime.getTime()) / 1000;
        
        await this.history.recordTrackPlayFromTrack(
            userId,
            instanceId,
            track,
            playlistId,
            generateSessionId(),
            playedDuration,
            !wasCompleted
        );
    }
    
    async getDashboardStats() {
        return await this.history.getUserListeningStats(userId, 7); // Last 7 days
    }
}
```

## 🎯 Best Practices

### 1. **Error Handling**
- Always wrap service calls in try-catch
- Provide user-friendly error messages
- Implement retry logic for critical operations

### 2. **Performance**
- Use stores for reactive UI updates
- Implement pagination for large datasets
- Cache frequently accessed data

### 3. **Migration Strategy**
- Start with copy mode (keeps originals)
- Test thoroughly before deleting legacy data
- Provide rollback mechanism

### 4. **User Experience**
- Show loading states during async operations
- Provide progress feedback for migrations
- Allow users to control migration timing

This integration approach ensures a smooth transition while unlocking the full potential of the enhanced collection system! 🎵