# DJAMMS Database Schema Documentation

## Table of Contents
- [Schema Overview](#schema-overview)
- [Collection Specifications](#collection-specifications)
- [Automated User Management](#automated-user-management)
- [Relationships & Constraints](#relationships--constraints)
- [Indexes & Performance](#indexes--performance)
- [Data Migration Guide](#data-migration-guide)
- [Security & Permissions](#security--permissions)

## Schema Overview

DJAMMS uses Appwrite as its Backend-as-a-Service (BaaS) with a simplified NoSQL document-based database structure. The Enhanced Architecture v3 features a streamlined **5-collection schema** that reduces API calls by 60% through embedded JSON patterns and optimized data access.

### Database Configuration
- **Database ID**: `djamms_production` 
- **Engine**: Appwrite Database v1.4+
- **Document Limit**: 1,000,000 documents per collection
- **Storage Limit**: 2GB per project
- **API Rate Limit**: 60 requests per minute per IP (with Rate Limit Fuse protection)
- **Schema Version**: v3 (Simplified Architecture)

### Collection Architecture (Enhanced v3)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  djamms_users   │    │player_instances │    │active_queues    │
│                 │    │                 │    │                 │
│ User accounts   │────│ Player configs  │────│ Queue management│
│ roles & approval│    │ & instance data │    │ with priorities │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │──────────────│   playlists     │──────────────│
                        │                 │
                        │ User playlists  │
                        │ with embedded   │
                        │ track data (JSON)│
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │ user_activity   │
                        │                 │
                        │ Play history &  │
                        │ activity logs   │
                        └─────────────────┘
```

## Automated User Management

DJAMMS v3 includes a comprehensive automated user population system that synchronizes users between Appwrite Auth and the DJAMMS database.

### User Synchronization Process
1. **Authentication**: Users sign in via Google OAuth through Appwrite Auth
2. **Auto-Detection**: System detects new users and automatically creates DJAMMS profiles
3. **Role Assignment**: Intelligent role determination based on email patterns
4. **Approval Workflow**: Automated approval for admins/developers, manual for regular users

### User Roles & Permissions
- **Admin**: Full system access, can approve users, manage all instances
  - Auto-assigned: `admin@djamms.app`, `mike.clarkin@gmail.com`, `admin@sysvir.com`
- **Developer**: Can create instances, access dev features, auto-approved
  - Auto-assigned: `demo@djamms.app`, `dev@djamms.com`
- **User**: Standard user access, requires approval for instance creation

### Synchronization Scripts
```bash
# Sync all Auth users to DJAMMS database
node scripts/sync-users.js sync-all

# Sync specific user by ID
node scripts/sync-users.js sync-user <USER_ID>

# Verify synchronization results
node scripts/verify-users.js

# Check system status
node scripts/system-status.js
```

## Collection Specifications

### 1. djamms_users Collection

Stores comprehensive user account information with role-based access control and approval workflow.

#### Schema Definition
```typescript
interface DJAMMSUser {
  $id: string;
  venue_id: string; // Unique venue identifier (user-supplied, validated)
  email: string;
  name: string;
  avatar?: string;
  userRole: 'user' | 'admin' | 'developer';
  devApproved: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}
```

#### Key Features
- **Automated Population**: Synced from Appwrite Auth system
- **Role-Based Access**: Admin, Developer, User roles with different permissions
- **Approval Workflow**: Dev-approved users can create player instances
- **Activity Tracking**: Last login and account creation timestamps

### 2. player_instances Collection

Manages individual player instance configurations and settings for each user.

#### Schema Definition
```typescript
interface PlayerInstance {
  $id: string;
  venue_id: string; // Unique venue identifier (matches djamms_users.venue_id)
  instanceName: string;
  settings: string; // JSON: PlayerSettings
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string;
}
```

#### Key Features
- **User Association**: Each instance belongs to a specific user
- **Embedded Settings**: Player preferences stored as JSON
- **Activity Status**: Track active/inactive instances
- **Auto-Creation**: Created automatically for dev-approved users

### 3. active_queues Collection

Manages song queues for each player instance with priority and metadata.

#### Schema Definition
```typescript
interface ActiveQueue {
  $id: string;
  instanceId: string;
  queueData: string; // JSON: QueueItem[]
  currentIndex: number;
  totalTracks: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Key Features
- **Instance Association**: Each queue belongs to a player instance
- **Embedded Queue Data**: Songs stored as JSON array
- **Position Tracking**: Current playback position
- **Auto-Population**: Initialized with global_default_playlist

### 4. playlists Collection

Stores user-created playlists with embedded track data for optimal performance.

#### Schema Definition
```typescript
interface Playlist {
  $id: string;
  venue_id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  tracks: string; // JSON: Track[]
  trackCount: number;
  totalDuration: number;
  tags: string; // JSON: string[]
  category: 'user' | 'system' | 'imported';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### Key Features
- **Embedded Tracks**: Full track data stored as JSON (60% API reduction)
- **Rich Metadata**: Categories, tags, visibility settings
- **Performance Optimized**: Single query retrieves complete playlist
- **Default Support**: Global default playlist for new instances

### 5. user_activity Collection

Tracks user actions, play history, and system activity for analytics.

#### Schema Definition
```typescript
interface UserActivity {
  $id: string;
  venue_id: string;
  activityType: string;
  activityData: string; // JSON: Activity details
  timestamp: string;
  instanceId?: string;
}
```

#### Key Features
- **Comprehensive Tracking**: All user actions logged
- **Flexible Data**: Activity details stored as JSON
- **Instance Correlation**: Link activities to specific instances
- **Analytics Support**: Data for usage patterns and insights
      "size": 20,
      "default": "ready"
    },
    {
      "key": "current_track",
      "type": "object",
      "status": "available",
      "required": false,
      "array": false,
      "nested": [
        {
          "key": "id",
          "type": "string",
          "required": true,
          "size": 20
        },
        {
          "key": "title",
          "type": "string", 
          "required": true,
          "size": 200
        },
        {
          "key": "artist",
          "type": "string",
          "required": false,
          "size": 100
        },
        {
          "key": "duration",
          "type": "integer",
          "required": true
        },
        {
          "key": "thumbnail",
          "type": "string",
          "required": false,
          "size": 500
        }
      ]
    },
    {
      "key": "position",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 0,
      "max": 999999,
      "default": 0
    },
    {
      "key": "volume",
      "type": "float",
      "status": "available", 
      "required": true,
      "array": false,
      "min": 0.0,
      "max": 1.0,
      "default": 0.5
    },
    {
      "key": "is_shuffle",
      "type": "boolean",
      "status": "available",
      "required": true,
      "array": false,
      "default": false
    },
    {
      "key": "is_repeat",
      "type": "boolean",
      "status": "available",
      "required": true,
      "array": false,
      "default": false
    },
    {
      "key": "last_updated",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    }
  ],
  "indexes": [
    {
      "key": "idx_last_updated",
      "type": "key",
      "status": "available",
      "attributes": ["last_updated"],
      "orders": ["DESC"]
    }
  ]
}
```

#### Valid Status Values
- `ready` - Player initialized, no video loaded
- `loading` - Video being fetched from YouTube
- `playing` - Video actively playing
- `paused` - Video paused by user
- `ended` - Video completed, ready for next
- `error` - Playback error occurred
- `blocked` - Content blocked (copyright/region)

#### Example Document
```json
{
  "$id": "jukebox_main_state",
  "$collectionId": "jukebox_state",
  "$databaseId": "djamms_production",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:32:15.000+00:00",
  "$permissions": ["read(\"any\")", "write(\"any\")"],
  "status": "playing",
  "current_track": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Video)",
    "artist": "Rick Astley",
    "duration": 212,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  },
  "position": 47,
  "volume": 0.75,
  "is_shuffle": false,
  "is_repeat": false,
  "last_updated": "2024-01-20T14:32:15.000Z"
}
```

### 2. priority_queue Collection

Manages the song queue with priority-based ordering system.

#### Schema Definition
```json
{
  "$id": "priority_queue",
  "name": "Priority Queue",
  "enabled": true,
  "documentSecurity": true,
  "attributes": [
    {
      "key": "video_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20
    },
    {
      "key": "title",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 200
    },
    {
      "key": "artist",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 100
    },
    {
      "key": "duration",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 1,
      "max": 86400
    },
    {
      "key": "thumbnail",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 500
    },
    {
      "key": "priority",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 1,
      "max": 999,
      "default": 11
    },
    {
      "key": "added_by",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "added_at",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    },
    {
      "key": "source",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20,
      "default": "user_request"
    }
  ],
  "indexes": [
    {
      "key": "idx_priority_order",
      "type": "key", 
      "status": "available",
      "attributes": ["priority", "added_at"],
      "orders": ["ASC", "ASC"]
    },
    {
      "key": "idx_added_by",
      "type": "key",
      "status": "available", 
      "attributes": ["added_by"],
      "orders": ["ASC"]
    },
    {
      "key": "idx_source",
      "type": "key",
      "status": "available",
      "attributes": ["source"],
      "orders": ["ASC"]
    }
  ]
}
```

#### Priority System
- **Priority 1-10**: User-requested songs (1 = highest priority)
- **Priority 11+**: Auto-queued songs from active playlist
- **FIFO within priority**: Same priority items play in chronological order

#### Valid Source Values
- `user_request` - Song added by user interaction
- `playlist_auto` - Auto-queued from active playlist
- `shuffle_add` - Added by shuffle algorithm
- `repeat_add` - Added by repeat functionality

#### Example Document
```json
{
  "$id": "queue_item_abc123",
  "$collectionId": "priority_queue",
  "$databaseId": "djamms_production",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:30:00.000+00:00",
  "$permissions": ["read(\"any\")", "write(\"any\")", "delete(\"user:user_abc_789\")"],
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Video)",
  "artist": "Rick Astley",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "priority": 1,
  "added_by": "user_abc_789",
  "added_at": "2024-01-20T14:30:00.000Z",
  "source": "user_request"
}
```

### 3. playlists Collection

Stores user-created playlists with metadata and configuration.

#### Schema Definition
```json
{
  "$id": "playlists",
  "name": "User Playlists",
  "enabled": true,
  "documentSecurity": true,
  "attributes": [
    {
      "key": "name",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 100
    },
    {
      "key": "description",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 500
    },
    {
      "key": "owner_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "is_active",
      "type": "boolean",
      "status": "available",
      "required": true,
      "array": false,
      "default": false
    },
    {
      "key": "created_at",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    },
    {
      "key": "updated_at", 
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$updatedAt"
    },
    {
      "key": "song_count",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 0,
      "max": 10000,
      "default": 0
    },
    {
      "key": "total_duration",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 0,
      "max": 86400000,
      "default": 0
    }
  ],
  "indexes": [
    {
      "key": "idx_owner_updated",
      "type": "key",
      "status": "available",
      "attributes": ["owner_id", "updated_at"],
      "orders": ["ASC", "DESC"]
    },
    {
      "key": "idx_active_playlists",
      "type": "key", 
      "status": "available",
      "attributes": ["is_active"],
      "orders": ["DESC"]
    },
    {
      "key": "idx_name_search",
      "type": "fulltext",
      "status": "available",
      "attributes": ["name", "description"]
    }
  ]
}
```

#### Example Document
```json
{
  "$id": "playlist_rock_classics",
  "$collectionId": "playlists",
  "$databaseId": "djamms_production",
  "$createdAt": "2024-01-15T10:00:00.000+00:00",
  "$updatedAt": "2024-01-20T14:30:00.000+00:00",
  "$permissions": ["read(\"user:user_abc_789\")", "write(\"user:user_abc_789\")"],
  "name": "Rock Classics",
  "description": "The best rock songs from the 70s, 80s, and 90s",
  "owner_id": "user_abc_789",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00.000Z",
  "updated_at": "2024-01-20T14:30:00.000Z",
  "song_count": 47,
  "total_duration": 11280
}
```

### 4. memory_playlist Collection

Stores songs from the currently active playlist loaded into memory for playback.

#### Schema Definition
```json
{
  "$id": "memory_playlist",
  "name": "Memory Playlist",
  "enabled": true,
  "documentSecurity": true,
  "attributes": [
    {
      "key": "video_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20
    },
    {
      "key": "title",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 200
    },
    {
      "key": "artist",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 100
    },
    {
      "key": "duration",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 1,
      "max": 86400
    },
    {
      "key": "thumbnail",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 500
    },
    {
      "key": "playlist_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "play_count",
      "type": "integer",
      "status": "available",
      "required": true,
      "array": false,
      "min": 0,
      "max": 999999,
      "default": 0
    },
    {
      "key": "last_played",
      "type": "datetime",
      "status": "available",
      "required": false,
      "array": false
    },
    {
      "key": "added_at",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    }
  ],
  "indexes": [
    {
      "key": "idx_playlist_played",
      "type": "key",
      "status": "available",
      "attributes": ["playlist_id", "last_played"],
      "orders": ["ASC", "ASC"]
    },
    {
      "key": "idx_play_count",
      "type": "key",
      "status": "available",
      "attributes": ["play_count"],
      "orders": ["ASC"]
    },
    {
      "key": "idx_video_lookup",
      "type": "key",
      "status": "available",
      "attributes": ["video_id"],
      "orders": ["ASC"]
    }
  ]
}
```

#### Example Document
```json
{
  "$id": "memory_song_def456",
  "$collectionId": "memory_playlist",
  "$databaseId": "djamms_production",
  "$createdAt": "2024-01-15T10:00:00.000+00:00",
  "$updatedAt": "2024-01-20T12:45:00.000+00:00",
  "$permissions": ["read(\"any\")", "write(\"any\")"],
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Video)",
  "artist": "Rick Astley",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "playlist_id": "playlist_rock_classics",
  "play_count": 3,
  "last_played": "2024-01-20T12:45:00.000Z",
  "added_at": "2024-01-15T10:00:00.000Z"
}
```

### 5. instance_states Collection

Tracks active browser windows/instances for multi-window synchronization.

#### Schema Definition
```json
{
  "$id": "instance_states",
  "name": "Instance States",
  "enabled": true,
  "documentSecurity": true,
  "attributes": [
    {
      "key": "instance_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 50
    },
    {
      "key": "instance_type",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20
    },
    {
      "key": "user_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "is_active",
      "type": "boolean",
      "status": "available",
      "required": true,
      "array": false,
      "default": true
    },
    {
      "key": "last_heartbeat",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    },
    {
      "key": "player_status",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 20
    },
    {
      "key": "window_title",
      "type": "string",
      "status": "available",
      "required": false,
      "array": false,
      "size": 100
    },
    {
      "key": "created_at",
      "type": "datetime",
      "status": "available",
      "required": true,
      "array": false,
      "default": "$createdAt"
    }
  ],
  "indexes": [
    {
      "key": "idx_user_active",
      "type": "key",
      "status": "available",
      "attributes": ["user_id", "is_active", "last_heartbeat"],
      "orders": ["ASC", "DESC", "DESC"]
    },
    {
      "key": "idx_instance_lookup",
      "type": "key",
      "status": "available",
      "attributes": ["instance_id"],
      "orders": ["ASC"]
    }
  ]
}
```

#### Valid Instance Types
- `dashboard` - Main dashboard window
- `player` - Video player window  
- `queue` - Queue manager window
- `playlist` - Playlist library window
- `admin` - Admin console window

#### Example Document
```json
{
  "$id": "player-1705763400-abc123",
  "$collectionId": "instance_states",
  "$databaseId": "djamms_production",
  "$createdAt": "2024-01-20T14:30:00.000+00:00",
  "$updatedAt": "2024-01-20T14:32:00.000+00:00",
  "$permissions": ["read(\"user:user_abc_789\")", "write(\"user:user_abc_789\")", "delete(\"user:user_abc_789\")"],
  "instance_id": "player-1705763400-abc123",
  "instance_type": "player",
  "user_id": "user_abc_789",
  "is_active": true,
  "last_heartbeat": "2024-01-20T14:32:00.000Z",
  "player_status": "playing",
  "window_title": "DJAMMS Video Player - Rick Astley",
  "created_at": "2024-01-20T14:30:00.000Z"
}
```

## Relationships & Constraints

### Foreign Key Relationships
```
playlists.owner_id → users.$id (Appwrite Auth)
memory_playlist.playlist_id → playlists.$id
priority_queue.added_by → users.$id (Appwrite Auth)
instance_states.user_id → users.$id (Appwrite Auth)
```

### Business Logic Constraints
1. **Single Active Playlist**: Only one playlist can be active (`is_active = true`) per user
2. **Unique Queue Items**: No duplicate `video_id` entries in priority_queue
3. **Memory Playlist Sync**: memory_playlist must be cleared when playlist is deactivated
4. **Instance Cleanup**: Inactive instances (no heartbeat > 5 minutes) are automatically removed

### Data Consistency Rules
- `playlists.song_count` must equal count of related memory_playlist documents  
- `playlists.total_duration` must equal sum of duration from related memory_playlist documents
- `jukebox_state.current_track` must match front item in priority_queue when playing
- `instance_states.last_heartbeat` must be updated every 30 seconds for active instances

## Indexes & Performance

### Query Performance Optimization

#### Most Common Query Patterns
1. **Get Queue in Order**: `priority_queue` sorted by `priority ASC, added_at ASC`
2. **User's Playlists**: `playlists` filtered by `owner_id` sorted by `updated_at DESC`
3. **Active Playlist Songs**: `memory_playlist` filtered by `playlist_id` sorted by `last_played ASC`
4. **User's Active Instances**: `instance_states` filtered by `user_id, is_active=true`

#### Index Strategy
- **Compound indexes** for multi-field sorting (priority + time)
- **Single field indexes** for foreign key lookups
- **Fulltext indexes** for playlist name/description search
- **Descending indexes** for chronological data (newest first)

### Expected Collection Sizes
- `jukebox_state`: 1 document (singleton)
- `priority_queue`: 0-100 documents (active queue)
- `playlists`: 1-50 documents per user
- `memory_playlist`: 0-1000 documents (active playlist)
- `instance_states`: 1-10 documents per user

## Data Migration Guide

### Schema Version History

#### v1.0.0 (Initial Schema)
- Basic collections with core attributes
- Simple priority system
- Manual queue management only

#### v1.1.0 (Playlist Integration) 
- Added `playlists` and `memory_playlist` collections
- Introduced auto-queue functionality
- Enhanced priority system with playlist sources

#### v1.2.0 (Multi-Window Support)
- Added `instance_states` collection
- Implemented real-time synchronization
- Added heartbeat mechanism

#### v1.3.0 (Performance Optimization)
- Added compound indexes
- Optimized query patterns
- Introduced fulltext search

### Migration Scripts

#### Migrate to v1.1.0
```javascript
// Add new collections
await databases.createCollection('djamms_production', 'playlists', 'User Playlists');
await databases.createCollection('djamms_production', 'memory_playlist', 'Memory Playlist');

// Add new attributes to priority_queue
await databases.createStringAttribute('djamms_production', 'priority_queue', 'source', 20, true, 'user_request');

// Update existing documents
const queueItems = await databases.listDocuments('djamms_production', 'priority_queue');
for (const item of queueItems.documents) {
    await databases.updateDocument('djamms_production', 'priority_queue', item.$id, {
        source: 'user_request'
    });
}
```

#### Migrate to v1.2.0
```javascript
// Add instance_states collection
await databases.createCollection('djamms_production', 'instance_states', 'Instance States');

// Create required attributes and indexes
await databases.createStringAttribute('djamms_production', 'instance_states', 'instance_id', 50, true);
await databases.createIndex('djamms_production', 'instance_states', 'idx_instance_lookup', 'key', ['instance_id'], ['ASC']);
```

## Security & Permissions

### Permission Model

#### Document-Level Security
All collections use `documentSecurity: true` for granular access control.

#### Permission Patterns

**jukebox_state**: Global read/write access
```javascript
permissions: ["read(\"any\")", "write(\"any\")"]
```

**priority_queue**: Global read, authenticated write, owner delete
```javascript
permissions: [
    "read(\"any\")", 
    "write(\"any\")", 
    "delete(\"user:${added_by}\")"
]
```

**playlists**: Owner-only access
```javascript
permissions: [
    "read(\"user:${owner_id}\")", 
    "write(\"user:${owner_id}\")",
    "delete(\"user:${owner_id}\")"
]
```

**memory_playlist**: Global read for active playlist, admin write
```javascript
permissions: [
    "read(\"any\")", 
    "write(\"any\")"
]
```

**instance_states**: Owner-only access
```javascript
permissions: [
    "read(\"user:${user_id}\")", 
    "write(\"user:${user_id}\")",
    "delete(\"user:${user_id}\")"
]
```

### Data Validation

#### Client-Side Validation
- YouTube video ID format validation (11 characters, alphanumeric + underscore/hyphen)
- Playlist name length limits (1-100 characters)
- Priority range validation (1-999)
- Volume range validation (0.0-1.0)

#### Server-Side Validation (Appwrite)
- Required field enforcement
- Data type validation
- String length constraints  
- Numeric range constraints
- Datetime format validation

### Security Best Practices

1. **API Key Security**: Never expose Appwrite API keys in client code
2. **User Authentication**: All operations require valid JWT session token
3. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors
4. **Input Sanitization**: Sanitize user input before database operations
5. **Permission Auditing**: Regularly review document permissions for overly broad access