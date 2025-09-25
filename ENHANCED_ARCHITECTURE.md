# DJAMMS Enhanced Architecture - Implementation Guide

## 🎯 **Migration Overview**

Transform DJAMMS from polling-based state management to a robust, Appwrite-powered real-time jukebox system with proper queue management and multi-window synchronization.

## 📊 **Phase 1: Appwrite Collections Setup**

### **Required Collections in Appwrite Dashboard:**

```javascript
// 1. jukebox_state
{
  "$id": "string",
  "isPlayerRunning": "boolean", 
  "isPlayerPaused": "boolean",
  "currentVideoId": "string",
  "currentlyPlaying": "string", 
  "lastPlayedVideoId": "string",
  "playerStatus": "string", // 'ready'|'playing'|'paused'|'ended'|'loading'|'error'
  "isReadyForNextSong": "boolean",
  "instanceId": "string",
  "lastUpdated": "datetime",
  "currentPosition": "integer",
  "totalDuration": "integer", 
  "volume": "integer"
}

// 2. priority_queue  
{
  "$id": "string",
  "videoId": "string",
  "title": "string",
  "channelTitle": "string", 
  "thumbnail": "string",
  "duration": "string",
  "timestamp": "datetime",
  "requestedBy": "string",
  "priority": "integer"
}

// 3. memory_playlist
{
  "$id": "string", 
  "videoId": "string",
  "title": "string",
  "channelTitle": "string",
  "thumbnail": "string", 
  "duration": "string",
  "lastPlayedTimestamp": "datetime",
  "playCount": "integer",
  "isActive": "boolean",
  "shuffleOrder": "integer"
}
```

### **Indexes to Create:**
- `priority_queue`: Index on `priority` (DESC) and `timestamp` (ASC)
- `memory_playlist`: Index on `isActive` and `lastPlayedTimestamp`  
- `memory_playlist`: Index on `shuffleOrder`

## 🔄 **Phase 2: Update Current Components**

### **A. VideoPlayer Route Integration**

```typescript
// src/routes/videoplayer/+page.svelte (Enhanced)
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { jukeboxState, currentTrack, jukeboxActions, initializeJukebox } from '$lib/stores/jukebox';
  
  let player: YT.Player;
  let playerContainer: HTMLElement;
  
  // Subscribe to jukebox state for real-time updates
  $: if ($currentTrack.videoId && player) {
    loadVideo($currentTrack.videoId);
  }
  
  onMount(async () => {
    // Initialize jukebox system
    await initializeJukebox(instanceId, DATABASE_ID);
    
    // Initialize YouTube player
    await loadYouTubeAPI();
    initializePlayer();
  });
  
  function initializePlayer() {
    player = new YT.Player(playerContainer, {
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange
      }
    });
  }
  
  function onPlayerStateChange(event: YT.OnStateChangeEvent) {
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        jukeboxActions.updatePlayerStatus('playing');
        startProgressTracking();
        break;
      case YT.PlayerState.PAUSED: 
        jukeboxActions.updatePlayerStatus('paused');
        stopProgressTracking();
        break;
      case YT.PlayerState.ENDED:
        jukeboxActions.videoEnded(); // Triggers next song
        break;
    }
  }
  
  function startProgressTracking() {
    progressInterval = setInterval(() => {
      if (player) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        jukeboxActions.updatePosition(currentTime, duration);
      }
    }, 250); // Higher frequency updates
  }
</script>
```

### **B. Queue Manager Integration** 

```typescript
// src/routes/queuemanager/+page.svelte (Enhanced)
<script lang="ts">
  import { jukeboxState, priorityQueue, currentTrack, jukeboxActions } from '$lib/stores/jukebox';
  
  // Real-time queue updates automatically via store subscriptions
  $: currentQueue = $priorityQueue;
  $: nowPlaying = $currentTrack;
  
  async function requestSong(videoId: string, title: string, channelTitle: string) {
    await jukeboxActions.addRequest(videoId, title, channelTitle);
  }
  
  // Queue is automatically updated via real-time subscriptions
  // No more manual array manipulation!
</script>

<div class="queue-display">
  <h2>Now Playing</h2>
  {#if nowPlaying.title}
    <div class="now-playing">
      <h3>{nowPlaying.title}</h3>
      <p>Status: {nowPlaying.status}</p>
      <progress value={nowPlaying.position} max={nowPlaying.duration}></progress>
    </div>
  {/if}
  
  <h2>Queue ({$priorityQueue.length})</h2>
  {#each currentQueue as song}
    <div class="queue-item">
      <span>{song.title} - {song.channelTitle}</span>
      <span class="timestamp">{song.timestamp}</span>
    </div>
  {/each}
</div>
```

## 🎵 **Phase 3: Integration Points**

### **Replace Current Stores**

```typescript
// OLD: src/lib/stores/player.ts (Replace with jukebox.ts)
// OLD: src/lib/services/playerSync.ts (Replace with jukeboxOrchestrator.ts)

// NEW: Import pattern
import { 
  jukeboxState, 
  currentTrack, 
  jukeboxActions, 
  initializeJukebox 
} from '$lib/stores/jukebox';
```

### **Dashboard Integration**

```typescript
// src/routes/dashboard/+page.svelte 
<script lang="ts">
  import { currentTrack, playerControls, queueInfo } from '$lib/stores/jukebox';
  
  // Real-time dashboard updates
  $: trackInfo = $currentTrack;
  $: controls = $playerControls; 
  $: queue = $queueInfo;
</script>

<div class="dashboard">
  <div class="now-playing-card">
    <h2>Now Playing</h2>
    {#if trackInfo.title}
      <p>{trackInfo.title}</p>
      <p>Status: {trackInfo.status}</p>
    {:else}
      <p>No song playing</p>
    {/if}
  </div>
  
  <div class="queue-info">
    <h3>Queue: {queue.count} songs</h3>
    {#if queue.next}
      <p>Next: {queue.next.title}</p>
    {/if}
  </div>
</div>
```

## ⚡ **Phase 4: Key Benefits**

### **Real-Time Synchronization**
- ✅ **No more polling** - Appwrite real-time updates all windows instantly
- ✅ **Conflict resolution** - Central state prevents sync issues
- ✅ **Offline resilience** - Queue and retry mechanism for network issues

### **True Circular Queue**
- ✅ **Songs never disappear** - Priority queue and playlist cycle independently  
- ✅ **Smart duplicate prevention** - `lastPlayedVideoId` prevents immediate repeats
- ✅ **Proper queue priority** - User requests always take precedence

### **Robust Architecture**
- ✅ **Single source of truth** - Appwrite database is authoritative
- ✅ **Event-driven design** - State changes trigger appropriate actions
- ✅ **Error handling** - Fallback mechanisms for API failures

### **Performance Improvements**
- ✅ **Higher frequency updates** - 250ms progress tracking vs 1000ms
- ✅ **Optimistic updates** - UI responds immediately, syncs in background
- ✅ **Efficient subscriptions** - Only relevant changes trigger updates

## 🚀 **Migration Steps**

1. **Create Appwrite Collections** (Use dashboard or migrations)
2. **Install new store files** (jukebox.ts, jukeboxService.ts, jukeboxOrchestrator.ts)
3. **Update videoplayer route** (Replace current state management)
4. **Update queuemanager route** (Use new store subscriptions)
5. **Update dashboard** (Real-time display components)
6. **Test multi-window sync** (Verify real-time updates work)
7. **Remove old files** (player.ts, playerSync.ts when confident)

This enhanced architecture solves all current issues while providing a foundation for future features like user accounts, playlist sharing, and advanced queue management!