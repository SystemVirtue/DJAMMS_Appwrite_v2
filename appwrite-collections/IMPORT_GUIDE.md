# Appwrite Collection Import Guide

## 📋 Collections to Create

### 1. user_queues
**Collection ID:** `user_queues`
**Description:** Manages user-specific playback queues per instance
**CSV File:** `user_queues_attributes.csv`

**Enum Values:**
- **repeat_mode:** `none`, `one`, `all`

**Indexes to Create After Import:**
```
- user_id (ASC)
- instance_id (ASC) 
- user_id + instance_id (UNIQUE compound index)
```

### 2. user_instance_settings  
**Collection ID:** `user_instance_settings`
**Description:** User preferences and settings per player instance
**CSV File:** `user_instance_settings_attributes.csv`

**Enum Values:**
- **audio_quality:** `auto`, `high`, `medium`, `low`

**Indexes to Create After Import:**
```
- user_id (ASC)
- instance_id (ASC)
- user_id + instance_id (UNIQUE compound index)
```

### 3. enhanced_playlists
**Collection ID:** `enhanced_playlists` 
**Description:** Enhanced playlist structure with categorization and metadata
**CSV File:** `enhanced_playlists_attributes.csv`

**Indexes to Create After Import:**
```
- user_id (ASC)
- is_public (ASC)
- category (ASC)
- is_featured (ASC)
- created_by_admin (ASC)
- user_id + name (UNIQUE compound index)
```

### 4. user_play_history
**Collection ID:** `user_play_history`
**Description:** Track user listening history and analytics
**CSV File:** `user_play_history_attributes.csv`

**Indexes to Create After Import:**
```
- user_id (ASC)
- played_at (DESC)
- instance_id (ASC)
- playlist_id (ASC)
- user_id + played_at (compound index)
```

### 5. user_playlist_favorites
**Collection ID:** `user_playlist_favorites`
**Description:** User favorites and personal playlist organization
**CSV File:** `user_playlist_favorites_attributes.csv`

**Indexes to Create After Import:**
```
- user_id (ASC)
- playlist_id (ASC)
- is_favorite (ASC)
- user_id + playlist_id (UNIQUE compound index)
```

## 🚀 Import Steps

### For Each Collection:

1. **Create Collection**
   - Go to Appwrite Console → Databases → djamms_db
   - Click "Create Collection"
   - Set Collection ID (use the IDs above)
   - Set appropriate permissions

2. **Import Attributes**
   - In the collection, go to "Attributes" tab
   - Click "Import" 
   - Upload the corresponding CSV file
   - Review and confirm attribute settings

3. **Create Indexes**
   - Go to "Indexes" tab
   - Create the indexes listed above for optimal performance

4. **Set Permissions**
   - Configure read/write permissions as needed
   - Typically: Users can read/write their own documents

## 🔧 Permission Suggestions

### user_queues & user_instance_settings:
```
Read: users
Write: users (own documents)
Create: users
Update: users (own documents)
Delete: users (own documents)
```

### enhanced_playlists:
```
Read: users (public playlists) + users (own playlists)
Write: users (own playlists)
Create: users
Update: users (own playlists)
Delete: users (own playlists)
```

### user_play_history & user_playlist_favorites:
```
Read: users (own documents)
Write: users (own documents)  
Create: users
Update: users (own documents)
Delete: users (own documents)
```