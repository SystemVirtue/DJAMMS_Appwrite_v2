# DJAMMS Endpoint Documentation & Examples

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [Jukebox State Management](#jukebox-state-management)
- [Priority Queue Operations](#priority-queue-operations)
- [Playlist Management](#playlist-management)
- [Instance State Tracking](#instance-state-tracking)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Error Response Formats](#error-response-formats)

## Authentication Endpoints

### Create OAuth Session
Initialize Google OAuth authentication flow.

**Endpoint**: `POST /auth/oauth2/google`
```http
POST https://cloud.appwrite.io/v1/account/sessions/oauth2/google
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]

{
  "success": "http://localhost:5173/dashboard",
  "failure": "http://localhost:5173/"
}
```

**Response - Redirect URL**:
```json
{
  "url": "https://accounts.google.com/oauth/authorize?client_id=...",
  "state": "oauth2_state_token"
}
```

### Get Current Session
Retrieve active user session information.

**Endpoint**: `GET /account/sessions/current`
```http
GET https://cloud.appwrite.io/v1/account/sessions/current
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**:
```json
{
  "$id": "session_id_123",
  "userId": "user_abc_789",
  "expire": "2024-12-31T23:59:59.000+00:00",
  "provider": "google",
  "providerUid": "google_user_id",
  "providerAccessToken": "google_access_token",
  "current": true
}
```

### Get User Account
Fetch current user profile data.

**Endpoint**: `GET /account`
```http
GET https://cloud.appwrite.io/v1/account
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**:
```json
{
  "$id": "user_abc_789",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "emailVerification": true,
  "prefs": {},
  "registration": "2024-01-15T10:30:00.000+00:00",
  "status": true
}
```

### Delete Session (Logout)
Terminate active user session.

**Endpoint**: `DELETE /account/sessions/current`
```http
DELETE https://cloud.appwrite.io/v1/account/sessions/current
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**: `204 No Content`

## Jukebox State Management

### Create/Update Jukebox State
Set the current playback state for the jukebox.

**Endpoint**: `POST /databases/[DATABASE_ID]/collections/jukebox_state/documents`
```http
POST https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/jukebox_state/documents
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "documentId": "unique()",
  "data": {
    "status": "playing",
    "current_track": {
      "id": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "artist": "Rick Astley",
      "duration": 212,
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    },
    "position": 45,
    "volume": 0.8,
    "is_shuffle": false,
    "is_repeat": false,
    "last_updated": "2024-01-20T14:30:00.000Z"
  }
}
```

**Response**:
```json
{
  "$id": "jukebox_state_doc",
  "$collectionId": "jukebox_state",
  "$databaseId": "djamms_db",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:30:00.000+00:00",
  "$permissions": ["read(\"user:user_abc_789\")"],
  "status": "playing",
  "current_track": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 212,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  },
  "position": 45,
  "volume": 0.8,
  "is_shuffle": false,
  "is_repeat": false,
  "last_updated": "2024-01-20T14:30:00.000Z"
}
```

### Get Current Jukebox State
Retrieve the current playback state.

**Endpoint**: `GET /databases/[DATABASE_ID]/collections/jukebox_state/documents`
```http
GET https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/jukebox_state/documents
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**:
```json
{
  "total": 1,
  "documents": [
    {
      "$id": "jukebox_state_doc",
      "status": "playing",
      "current_track": {
        "id": "dQw4w9WgXcQ",
        "title": "Rick Astley - Never Gonna Give You Up",
        "artist": "Rick Astley",
        "duration": 212,
        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      },
      "position": 45,
      "volume": 0.8,
      "is_shuffle": false,
      "is_repeat": false,
      "last_updated": "2024-01-20T14:30:00.000Z"
    }
  ]
}
```

## Priority Queue Operations

### Add Song to Queue
Add a new song to the priority queue.

**Endpoint**: `POST /databases/[DATABASE_ID]/collections/priority_queue/documents`
```http
POST https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/priority_queue/documents
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "documentId": "unique()",
  "data": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 212,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "priority": 1,
    "added_by": "user_abc_789",
    "added_at": "2024-01-20T14:30:00.000Z",
    "source": "user_request"
  }
}
```

**Response**:
```json
{
  "$id": "queue_item_123",
  "$collectionId": "priority_queue",
  "$databaseId": "djamms_db",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:30:00.000+00:00",
  "$permissions": ["read(\"user:user_abc_789\")"],
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "artist": "Rick Astley",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "priority": 1,
  "added_by": "user_abc_789",
  "added_at": "2024-01-20T14:30:00.000Z",
  "source": "user_request"
}
```

### Get Priority Queue
Retrieve all items in the queue, sorted by priority.

**Endpoint**: `GET /databases/[DATABASE_ID]/collections/priority_queue/documents`
```http
GET https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/priority_queue/documents?queries[0]=orderAsc("priority")&queries[1]=orderAsc("added_at")
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**:
```json
{
  "total": 3,
  "documents": [
    {
      "$id": "queue_item_123",
      "video_id": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "priority": 1,
      "added_at": "2024-01-20T14:30:00.000Z"
    },
    {
      "$id": "queue_item_124",
      "video_id": "9bZkp7q19f0",
      "title": "PSY - GANGNAM STYLE",
      "priority": 2,
      "added_at": "2024-01-20T14:31:00.000Z"
    },
    {
      "$id": "queue_item_125",
      "video_id": "kJQP7kiw5Fk",
      "title": "Luis Fonsi - Despacito ft. Daddy Yankee",
      "priority": 11,
      "added_at": "2024-01-20T14:32:00.000Z"
    }
  ]
}
```

### Update Queue Item Priority
Change the priority of an existing queue item.

**Endpoint**: `PATCH /databases/[DATABASE_ID]/collections/priority_queue/documents/[DOCUMENT_ID]`
```http
PATCH https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/priority_queue/documents/queue_item_123
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "data": {
    "priority": 5
  }
}
```

**Response**:
```json
{
  "$id": "queue_item_123",
  "$updatedAt": "2024-01-20T14:35:00.000+00:00",
  "priority": 5,
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up"
}
```

### Remove Queue Item
Delete a song from the priority queue.

**Endpoint**: `DELETE /databases/[DATABASE_ID]/collections/priority_queue/documents/[DOCUMENT_ID]`
```http
DELETE https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/priority_queue/documents/queue_item_123
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**: `204 No Content`

## Playlist Management

### Create Playlist
Create a new user playlist.

**Endpoint**: `POST /databases/[DATABASE_ID]/collections/playlists/documents`
```http
POST https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/playlists/documents
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "documentId": "unique()",
  "data": {
    "name": "My Favorite Rock Songs",
    "description": "A collection of the best rock songs from the 80s and 90s",
    "owner_id": "user_abc_789",
    "is_active": false,
    "created_at": "2024-01-20T14:30:00.000Z",
    "updated_at": "2024-01-20T14:30:00.000Z",
    "song_count": 0,
    "total_duration": 0
  }
}
```

**Response**:
```json
{
  "$id": "playlist_456",
  "$collectionId": "playlists",
  "$databaseId": "djamms_db",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:30:00.000+00:00",
  "$permissions": ["read(\"user:user_abc_789\")", "write(\"user:user_abc_789\")"],
  "name": "My Favorite Rock Songs",
  "description": "A collection of the best rock songs from the 80s and 90s",
  "owner_id": "user_abc_789",
  "is_active": false,
  "created_at": "2024-01-20T14:30:00.000Z",
  "updated_at": "2024-01-20T14:30:00.000Z",
  "song_count": 0,
  "total_duration": 0
}
```

### Get User Playlists
Retrieve all playlists for the current user.

**Endpoint**: `GET /databases/[DATABASE_ID]/collections/playlists/documents`
```http
GET https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/playlists/documents?queries[0]=equal("owner_id", "user_abc_789")&queries[1]=orderDesc("updated_at")
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]
```

**Response**:
```json
{
  "total": 2,
  "documents": [
    {
      "$id": "playlist_456",
      "name": "My Favorite Rock Songs",
      "description": "A collection of the best rock songs from the 80s and 90s",
      "is_active": false,
      "song_count": 15,
      "total_duration": 3420,
      "created_at": "2024-01-20T14:30:00.000Z",
      "updated_at": "2024-01-20T15:45:00.000Z"
    },
    {
      "$id": "playlist_789",
      "name": "Chill Vibes",
      "description": "Relaxing songs for studying",
      "is_active": true,
      "song_count": 8,
      "total_duration": 1920,
      "created_at": "2024-01-19T10:15:00.000Z",
      "updated_at": "2024-01-20T12:30:00.000Z"
    }
  ]
}
```

### Add Song to Memory Playlist
Add a song to the active in-memory playlist.

**Endpoint**: `POST /databases/[DATABASE_ID]/collections/memory_playlist/documents`
```http
POST https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/memory_playlist/documents
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "documentId": "unique()",
  "data": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 212,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "playlist_id": "playlist_789",
    "play_count": 0,
    "last_played": null,
    "added_at": "2024-01-20T14:30:00.000Z"
  }
}
```

**Response**:
```json
{
  "$id": "memory_song_101",
  "$collectionId": "memory_playlist",
  "$databaseId": "djamms_db",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "artist": "Rick Astley",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "playlist_id": "playlist_789",
  "play_count": 0,
  "last_played": null,
  "added_at": "2024-01-20T14:30:00.000Z"
}
```

## Instance State Tracking

### Create Player Instance
Register a new player instance for multi-window tracking.

**Endpoint**: `POST /databases/[DATABASE_ID]/collections/instance_states/documents`
```http
POST https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/instance_states/documents
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "documentId": "player-1705763400-abc123",
  "data": {
    "instance_id": "player-1705763400-abc123",
    "instance_type": "player",
    "user_id": "user_abc_789",
    "is_active": true,
    "last_heartbeat": "2024-01-20T14:30:00.000Z",
    "player_status": "ready",
    "window_title": "DJAMMS Video Player",
    "created_at": "2024-01-20T14:30:00.000Z"
  }
}
```

**Response**:
```json
{
  "$id": "player-1705763400-abc123",
  "$collectionId": "instance_states",
  "$databaseId": "djamms_db",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "instance_id": "player-1705763400-abc123",
  "instance_type": "player",
  "user_id": "user_abc_789",
  "is_active": true,
  "last_heartbeat": "2024-01-20T14:30:00.000Z",
  "player_status": "ready",
  "window_title": "DJAMMS Video Player",
  "created_at": "2024-01-20T14:30:00.000Z"
}
```

### Update Instance Heartbeat
Update the last activity timestamp for an instance.

**Endpoint**: `PATCH /databases/[DATABASE_ID]/collections/instance_states/documents/[INSTANCE_ID]`
```http
PATCH https://cloud.appwrite.io/v1/databases/[DATABASE_ID]/collections/instance_states/documents/player-1705763400-abc123
Content-Type: application/json
X-Appwrite-Project: [PROJECT_ID]
X-Appwrite-JWT: [SESSION_TOKEN]

{
  "data": {
    "last_heartbeat": "2024-01-20T14:35:00.000Z",
    "player_status": "playing"
  }
}
```

**Response**:
```json
{
  "$id": "player-1705763400-abc123",
  "$updatedAt": "2024-01-20T14:35:00.000+00:00",
  "last_heartbeat": "2024-01-20T14:35:00.000Z",
  "player_status": "playing",
  "is_active": true
}
```

## Real-time Subscriptions

### Subscribe to Jukebox State Changes
Listen for real-time updates to the jukebox playback state.

**WebSocket Connection**: `wss://cloud.appwrite.io/v1/realtime`

**Subscribe Message**:
```json
{
  "type": "authentication",
  "data": {
    "session": "[SESSION_TOKEN]"
  }
}
```

```json
{
  "type": "subscribe",
  "data": {
    "channels": ["databases.[DATABASE_ID].collections.jukebox_state.documents"]
  }
}
```

**Event Response**:
```json
{
  "type": "event",
  "data": {
    "timestamp": "2024-01-20T14:30:00.000Z",
    "project": "[PROJECT_ID]",
    "userId": "user_abc_789",
    "channels": ["databases.[DATABASE_ID].collections.jukebox_state.documents.jukebox_state_doc"],
    "events": ["databases.*.collections.*.documents.*.update"],
    "payload": {
      "$id": "jukebox_state_doc",
      "$collectionId": "jukebox_state",
      "status": "playing",
      "current_track": {
        "id": "dQw4w9WgXcQ",
        "title": "Rick Astley - Never Gonna Give You Up",
        "position": 47
      },
      "last_updated": "2024-01-20T14:30:00.000Z"
    }
  }
}
```

### Subscribe to Queue Changes
Listen for additions, removals, and reordering of queue items.

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "data": {
    "channels": ["databases.[DATABASE_ID].collections.priority_queue.documents"]
  }
}
```

**Event Response - New Item Added**:
```json
{
  "type": "event",
  "data": {
    "timestamp": "2024-01-20T14:30:00.000Z",
    "project": "[PROJECT_ID]",
    "userId": "user_abc_789",
    "channels": ["databases.[DATABASE_ID].collections.priority_queue.documents.queue_item_126"],
    "events": ["databases.*.collections.*.documents.*.create"],
    "payload": {
      "$id": "queue_item_126",
      "video_id": "L_jWHffIx5E",
      "title": "Smash Mouth - All Star",
      "priority": 3,
      "added_by": "user_abc_789",
      "added_at": "2024-01-20T14:30:00.000Z"
    }
  }
}
```

## Error Response Formats

### Authentication Errors
```json
{
  "message": "Invalid credentials. Please check the X-Appwrite-Key header to ensure the value is correct.",
  "code": 401,
  "type": "user_unauthorized",
  "version": "1.4.13"
}
```

### Permission Errors
```json
{
  "message": "Missing or invalid permissions. You need permission to read this resource.",
  "code": 403,
  "type": "user_unauthorized",
  "version": "1.4.13"
}
```

### Document Not Found
```json
{
  "message": "Document with the requested ID could not be found.",
  "code": 404,
  "type": "document_not_found",
  "version": "1.4.13"
}
```

### Validation Errors
```json
{
  "message": "Invalid document structure: Missing required attribute \"video_id\"",
  "code": 400,
  "type": "document_invalid_structure",
  "version": "1.4.13"
}
```

### Rate Limiting
```json
{
  "message": "Too many requests. Please wait before making another request.",
  "code": 429,
  "type": "rate_limit_exceeded",
  "version": "1.4.13"
}
```

### Server Errors
```json
{
  "message": "Server Error. Please try again later.",
  "code": 500,
  "type": "general_unknown",
  "version": "1.4.13"
}
```

## Common Query Parameters

### Pagination
```http
GET /databases/[DATABASE_ID]/collections/priority_queue/documents?limit=25&offset=0
```

### Filtering
```http
GET /databases/[DATABASE_ID]/collections/playlists/documents?queries[0]=equal("owner_id", "user_123")
```

### Sorting
```http
GET /databases/[DATABASE_ID]/collections/priority_queue/documents?queries[0]=orderAsc("priority")&queries[1]=orderAsc("added_at")
```

### Search
```http
GET /databases/[DATABASE_ID]/collections/memory_playlist/documents?queries[0]=search("title", "never gonna give")
```

### Multiple Conditions
```http
GET /databases/[DATABASE_ID]/collections/instance_states/documents?queries[0]=equal("user_id", "user_123")&queries[1]=equal("is_active", true)&queries[2]=orderDesc("last_heartbeat")
```