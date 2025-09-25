# DJAMMS API Endpoint & Schema Documentation

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [Jukebox State Endpoints](#jukebox-state-endpoints)
- [Priority Queue Endpoints](#priority-queue-endpoints)
- [Memory Playlist Endpoints](#memory-playlist-endpoints)
- [Instance Management Endpoints](#instance-management-endpoints)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Schema Definitions](#schema-definitions)

## Authentication Endpoints

### Google OAuth Authentication
```
POST /v1/account/sessions/oauth2/google
Headers: Content-Type: application/json
Body: {
  "code": "string",
  "state": "string"
}
Response: {
  "$id": "string",
  "venue_id": "string",
  "expire": "ISO8601",
  "provider": "google",
  "providerUid": "string"
}
```

### Session Management
```
GET /v1/account/sessions/current
Response: {
  "$id": "string", 
  "venue_id": "string",
  "expire": "ISO8601",
  "current": true
}

DELETE /v1/account/sessions/current
Response: 204 No Content
```

## Jukebox State Endpoints

### Get Jukebox State
```
GET /v1/databases/{databaseId}/collections/jukebox_state/documents/{instanceId}
Response: JukeboxState
```

### Create Jukebox State
```
POST /v1/databases/{databaseId}/collections/jukebox_state/documents
Body: {
  "documentId": "string",
  "data": JukeboxState
}
Response: JukeboxState
```

### Update Jukebox State
```
PATCH /v1/databases/{databaseId}/collections/jukebox_state/documents/{instanceId}
Body: Partial<JukeboxState>
Response: JukeboxState
```

## Priority Queue Endpoints

### List Queue Items
```
GET /v1/databases/{databaseId}/collections/priority_queue/documents
Query Parameters:
  - queries[]: ["orderAsc('priority')", "orderAsc('timestamp')", "limit(100)"]
Response: {
  "total": number,
  "documents": PriorityQueueItem[]
}
```

### Add to Queue
```
POST /v1/databases/{databaseId}/collections/priority_queue/documents
Body: {
  "documentId": "unique()",
  "data": PriorityQueueItem
}
Response: PriorityQueueItem
```

### Remove from Queue
```
DELETE /v1/databases/{databaseId}/collections/priority_queue/documents/{itemId}
Response: 204 No Content
```

### Move Queue Item
```
PATCH /v1/databases/{databaseId}/collections/priority_queue/documents/{itemId}
Body: {
  "priority": number,
  "timestamp": "ISO8601"
}
Response: PriorityQueueItem
```

## Memory Playlist Endpoints

### List Playlist Items
```
GET /v1/databases/{databaseId}/collections/memory_playlist/documents
Query Parameters:
  - queries[]: ["equal('isActive', true)", "orderAsc('shuffleOrder')", "limit(500)"]
Response: {
  "total": number,
  "documents": InMemoryPlaylistItem[]
}
```

### Get Next Song
```
GET /v1/databases/{databaseId}/collections/memory_playlist/documents
Query Parameters:
  - queries[]: ["equal('isActive', true)", "orderAsc('lastPlayedTimestamp')", "limit(10)"]
Response: {
  "total": number,
  "documents": InMemoryPlaylistItem[]
}
```

### Update Play Statistics
```
PATCH /v1/databases/{databaseId}/collections/memory_playlist/documents/{songId}
Body: {
  "lastPlayedTimestamp": "ISO8601",
  "playCount": number
}
Response: InMemoryPlaylistItem
```

## Instance Management Endpoints

### List Instances
```
GET /v1/databases/{databaseId}/collections/instance_states/documents
Response: {
  "total": number,
  "documents": InstanceState[]
}
```

### Update Instance State
```
PATCH /v1/databases/{databaseId}/collections/instance_states/documents/{instanceId}
Body: Partial<InstanceState>
Response: InstanceState
```

### Create Instance State
```
POST /v1/databases/{databaseId}/collections/instance_states/documents
Body: {
  "documentId": "string",
  "data": InstanceState
}
Response: InstanceState
```

## Real-time Subscriptions

### Jukebox State Subscription
```
WebSocket: /v1/realtime
Subscribe to: databases.{databaseId}.collections.jukebox_state.documents.{instanceId}
Events:
  - databases.*.collections.*.documents.*.update
  - databases.*.collections.*.documents.*.create
```

### Priority Queue Subscription
```
WebSocket: /v1/realtime
Subscribe to: databases.{databaseId}.collections.priority_queue.documents
Events:
  - databases.*.collections.*.documents.*.create
  - databases.*.collections.*.documents.*.update
  - databases.*.collections.*.documents.*.delete
```

### Instance States Subscription
```
WebSocket: /v1/realtime
Subscribe to: databases.{databaseId}.collections.instance_states.documents
Events:
  - databases.*.collections.*.documents.*.update
  - databases.*.collections.*.documents.*.create
```

## Schema Definitions

### JukeboxState
```typescript
interface JukeboxState {
  $id?: string;
  isPlayerRunning: boolean;
  isPlayerPaused: boolean;
  currentVideoId: string | null;
  currentlyPlaying: string | null;
  currentChannelTitle: string | null;
  currentThumbnail: string | null;
  currentVideoDuration: string | null;
  lastPlayedVideoId: string | null;
  playerStatus: 'ready' | 'playing' | 'paused' | 'ended' | 'loading' | 'error' | 'blocked';
  isReadyForNextSong: boolean;
  instanceId: string;
  lastUpdated: string; // ISO8601
  currentPosition: number;
  totalDuration: number;
  volume: number;
}
```

### PriorityQueueItem
```typescript
interface PriorityQueueItem {
  $id?: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  timestamp: string; // ISO8601
  priority: number; // Lower number = higher priority
}
```

### InMemoryPlaylistItem
```typescript
interface InMemoryPlaylistItem {
  $id?: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: string;
  lastPlayedTimestamp?: string; // ISO8601
  playCount: number;
  isActive: boolean;
  shuffleOrder: number;
  addedToPlaylistAt: string; // ISO8601
}
```

### InstanceState
```typescript
interface InstanceState {
  $id?: string;
  instance_id: string;
  is_playing: boolean;
  current_video_id: string | null;
  current_time: number;
  volume: number;
}
```

## Error Responses

### Standard Error Format
```json
{
  "message": "string",
  "code": "string|number",
  "type": "string",
  "version": "string"
}
```

### Common Error Codes
- `400`: Bad Request - Invalid request parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource already exists
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

## Rate Limits
- API Requests: 100 requests per minute per IP
- Real-time Connections: 10 concurrent connections per user
- Database Operations: 1000 operations per hour per project

## Authentication Headers
All authenticated requests require:
```
X-Appwrite-Project: {projectId}
X-Appwrite-Response-Format: 1.5.0
Cookie: a_session_{projectId}={sessionId}
```