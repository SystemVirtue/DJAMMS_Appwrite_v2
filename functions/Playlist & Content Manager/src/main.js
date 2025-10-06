import { Client, Databases, Storage, ID, Query } from 'node-appwrite';

/**
 * Playlist & Content Manager - Appwrite Function
 *
 * Centralizes all actions related to playlists and content.
 * Backend for content library and playlist management UI.
 *
 * Triggers: Manual API calls from the UI Admin Console
 *
 * Responsibilities:
 * - Playlist Operations: CRUD and sharing for playlists
 * - Track Management: Add/remove tracks and manage queue order
 * - Content Gallery: Storage and metadata for uploaded content
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const storage = new Storage(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
  const BUCKET_ID = process.env.APPWRITE_BUCKET_ID || 'content-gallery';

  try {
    log('📋 Playlist & Content Manager started');

    // Parse request body
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      log(`📦 Received payload: ${JSON.stringify(payload)}`);
    } catch (parseError) {
      error(`❌ Failed to parse request payload: ${parseError.message}`);
      return res.json({ success: false, error: 'Invalid payload format' }, 400);
    }

    // Extract required parameters
    const { action, venueId, userId, ...actionData } = payload;

    if (!action || !venueId) {
      error('❌ Missing required parameters: action and venueId');
      return res.json({ success: false, error: 'Missing action or venueId' }, 400);
    }

    log(`🎯 Processing ${action} action for venue: ${venueId}`);

    // Validate venue access
    let venue;
    try {
      venue = await databases.getDocument(DATABASE_ID, 'venues', venueId);
      log(`✅ Venue access validated: ${venueId}`);
    } catch (venueError) {
      error(`❌ Venue not found or access denied: ${venueId}`);
      return res.json({ success: false, error: 'Venue not found or access denied' }, 404);
    }

    // Process action based on type
    let result;
    switch (action) {
      case 'createPlaylist':
        result = await handleCreatePlaylist(databases, DATABASE_ID, venueId, userId, actionData, log);
        break;

      case 'updatePlaylist':
        result = await handleUpdatePlaylist(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'deletePlaylist':
        result = await handleDeletePlaylist(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'addTrack':
        result = await handleAddTrack(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'removeTrack':
        result = await handleRemoveTrack(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'reorderTracks':
        result = await handleReorderTracks(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'sharePlaylist':
        result = await handleSharePlaylist(databases, DATABASE_ID, venueId, actionData, log);
        break;

      case 'uploadContent':
        result = await handleUploadContent(storage, databases, DATABASE_ID, BUCKET_ID, venueId, actionData, log);
        break;

      case 'deleteContent':
        result = await handleDeleteContent(storage, databases, DATABASE_ID, BUCKET_ID, venueId, actionData, log);
        break;

      case 'getPlaylists':
        result = await handleGetPlaylists(databases, DATABASE_ID, venueId, actionData, log);
        break;

      default:
        log(`⚠️ Unknown action: ${action}`);
        return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
    }

    // Log activity
    try {
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        venue_id: venueId,
        user_id: userId,
        event_type: 'playlist_content_action',
        event_data: JSON.stringify({
          action,
          result: result?.success ? 'success' : 'failed',
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date().toISOString()
      });
    } catch (activityError) {
      log(`⚠️ Failed to log activity: ${activityError.message}`);
    }

    log(`✅ ${action} action completed successfully for venue: ${venueId}`);
    return res.json({
      success: true,
      message: `${action} completed`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (globalError) {
    error(`💥 Global error in Playlist & Content Manager: ${globalError.message}`);
    error(`Stack trace: ${globalError.stack}`);

    return res.json({
      success: false,
      error: 'Internal server error during content management',
      details: process.env.NODE_ENV === 'development' ? globalError.message : undefined
    }, 500);
  }
};

/**
 * Create a new playlist
 */
async function handleCreatePlaylist(databases, databaseId, venueId, userId, actionData, log) {
  try {
    const { name, description, isPublic = false, tracks = [] } = actionData;

    if (!name) {
      throw new Error('Playlist name is required');
    }

    const playlist = await databases.createDocument(databaseId, 'playlists', ID.unique(), {
      venue_id: venueId,
      name: name,
      description: description || '',
      tracks: JSON.stringify(tracks),
      is_public: isPublic,
      created_by: userId,
      track_count: tracks.length,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });

    log(`📝 Created playlist: ${name} (${playlist.$id})`);
    return { playlistId: playlist.$id, trackCount: tracks.length };
  } catch (err) {
    log(`❌ Failed to create playlist: ${err.message}`);
    throw err;
  }
}

/**
 * Update an existing playlist
 */
async function handleUpdatePlaylist(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId, name, description, isPublic, tracks } = actionData;

    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    // Get current playlist
    const currentPlaylist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (currentPlaylist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    const updates = {
      last_updated: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.is_public = isPublic;
    if (tracks !== undefined) {
      updates.tracks = JSON.stringify(tracks);
      updates.track_count = tracks.length;
    }

    const updatedPlaylist = await databases.updateDocument(databaseId, 'playlists', playlistId, updates);

    log(`📝 Updated playlist: ${playlistId}`);
    return { playlistId, changes: Object.keys(updates) };
  } catch (err) {
    log(`❌ Failed to update playlist: ${err.message}`);
    throw err;
  }
}

/**
 * Delete a playlist
 */
async function handleDeletePlaylist(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId } = actionData;

    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    // Get current playlist for validation
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    await databases.deleteDocument(databaseId, 'playlists', playlistId);

    log(`🗑️ Deleted playlist: ${playlistId}`);
    return { playlistId, deleted: true };
  } catch (err) {
    log(`❌ Failed to delete playlist: ${err.message}`);
    throw err;
  }
}

/**
 * Add a track to a playlist
 */
async function handleAddTrack(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId, track, position } = actionData;

    if (!playlistId || !track) {
      throw new Error('Playlist ID and track data are required');
    }

    // Get current playlist
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    const tracks = JSON.parse(playlist.tracks || '[]');

    // Insert track at specified position or at the end
    const insertPosition = position !== undefined ? Math.min(position, tracks.length) : tracks.length;
    tracks.splice(insertPosition, 0, track);

    await databases.updateDocument(databaseId, 'playlists', playlistId, {
      tracks: JSON.stringify(tracks),
      track_count: tracks.length,
      last_updated: new Date().toISOString()
    });

    log(`➕ Added track to playlist: ${playlistId} at position ${insertPosition}`);
    return { playlistId, trackAdded: track.title || 'Unknown', position: insertPosition };
  } catch (err) {
    log(`❌ Failed to add track: ${err.message}`);
    throw err;
  }
}

/**
 * Remove a track from a playlist
 */
async function handleRemoveTrack(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId, trackIndex } = actionData;

    if (!playlistId || trackIndex === undefined) {
      throw new Error('Playlist ID and track index are required');
    }

    // Get current playlist
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    const tracks = JSON.parse(playlist.tracks || '[]');

    if (trackIndex < 0 || trackIndex >= tracks.length) {
      throw new Error('Invalid track index');
    }

    const removedTrack = tracks.splice(trackIndex, 1)[0];

    await databases.updateDocument(databaseId, 'playlists', playlistId, {
      tracks: JSON.stringify(tracks),
      track_count: tracks.length,
      last_updated: new Date().toISOString()
    });

    log(`➖ Removed track from playlist: ${playlistId} at index ${trackIndex}`);
    return { playlistId, trackRemoved: removedTrack.title || 'Unknown', index: trackIndex };
  } catch (err) {
    log(`❌ Failed to remove track: ${err.message}`);
    throw err;
  }
}

/**
 * Reorder tracks in a playlist
 */
async function handleReorderTracks(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId, newOrder } = actionData;

    if (!playlistId || !Array.isArray(newOrder)) {
      throw new Error('Playlist ID and new order array are required');
    }

    // Get current playlist
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    const currentTracks = JSON.parse(playlist.tracks || '[]');

    // Validate new order indices
    const maxIndex = currentTracks.length - 1;
    if (newOrder.some(index => index < 0 || index > maxIndex)) {
      throw new Error('Invalid track indices in new order');
    }

    // Reorder tracks
    const reorderedTracks = newOrder.map(index => currentTracks[index]);

    await databases.updateDocument(databaseId, 'playlists', playlistId, {
      tracks: JSON.stringify(reorderedTracks),
      last_updated: new Date().toISOString()
    });

    log(`🔄 Reordered tracks in playlist: ${playlistId}`);
    return { playlistId, reordered: true, trackCount: reorderedTracks.length };
  } catch (err) {
    log(`❌ Failed to reorder tracks: ${err.message}`);
    throw err;
  }
}

/**
 * Share or unshare a playlist
 */
async function handleSharePlaylist(databases, databaseId, venueId, actionData, log) {
  try {
    const { playlistId, isPublic } = actionData;

    if (!playlistId || isPublic === undefined) {
      throw new Error('Playlist ID and isPublic flag are required');
    }

    // Get current playlist
    const playlist = await databases.getDocument(databaseId, 'playlists', playlistId);

    // Validate ownership
    if (playlist.venue_id !== venueId) {
      throw new Error('Playlist does not belong to this venue');
    }

    await databases.updateDocument(databaseId, 'playlists', playlistId, {
      is_public: isPublic,
      last_updated: new Date().toISOString()
    });

    log(`${isPublic ? '🔓' : '🔒'} ${isPublic ? 'Shared' : 'Unshared'} playlist: ${playlistId}`);
    return { playlistId, isPublic };
  } catch (err) {
    log(`❌ Failed to share playlist: ${err.message}`);
    throw err;
  }
}

/**
 * Upload content to the gallery
 */
async function handleUploadContent(storage, databases, databaseId, bucketId, venueId, actionData, log) {
  try {
    const { fileId, fileName, contentType, metadata = {} } = actionData;

    if (!fileId || !fileName) {
      throw new Error('File ID and name are required');
    }

    // Get file from storage
    const file = await storage.getFile(bucketId, fileId);

    // Create content record
    const content = await databases.createDocument(databaseId, 'content_gallery', ID.unique(), {
      venue_id: venueId,
      file_id: fileId,
      file_name: fileName,
      content_type: contentType || file.mimeType,
      file_size: file.sizeOriginal,
      metadata: JSON.stringify(metadata),
      uploaded_at: new Date().toISOString(),
      is_active: true
    });

    log(`📤 Uploaded content: ${fileName} (${content.$id})`);
    return { contentId: content.$id, fileName, fileSize: file.sizeOriginal };
  } catch (err) {
    log(`❌ Failed to upload content: ${err.message}`);
    throw err;
  }
}

/**
 * Delete content from the gallery
 */
async function handleDeleteContent(storage, databases, databaseId, bucketId, venueId, actionData, log) {
  try {
    const { contentId } = actionData;

    if (!contentId) {
      throw new Error('Content ID is required');
    }

    // Get content record
    const content = await databases.getDocument(databaseId, 'content_gallery', contentId);

    // Validate ownership
    if (content.venue_id !== venueId) {
      throw new Error('Content does not belong to this venue');
    }

    // Delete file from storage
    await storage.deleteFile(bucketId, content.file_id);

    // Delete content record
    await databases.deleteDocument(databaseId, 'content_gallery', contentId);

    log(`🗑️ Deleted content: ${contentId}`);
    return { contentId, deleted: true };
  } catch (err) {
    log(`❌ Failed to delete content: ${err.message}`);
    throw err;
  }
}

/**
 * Get playlists for a venue
 */
async function handleGetPlaylists(databases, databaseId, venueId, actionData, log) {
  try {
    const { includePublic = false, limit = 50 } = actionData;

    // Build query
    const queries = [Query.equal('venue_id', venueId)];
    if (includePublic) {
      queries.push(Query.or([
        Query.equal('is_public', true),
        Query.equal('venue_id', venueId)
      ]));
    }
    queries.push(Query.limit(limit));

    const playlists = await databases.listDocuments(databaseId, 'playlists', queries);

    log(`📋 Retrieved ${playlists.total} playlists for venue: ${venueId}`);
    return {
      playlists: playlists.documents.map(p => ({
        id: p.$id,
        name: p.name,
        description: p.description,
        trackCount: p.track_count,
        isPublic: p.is_public,
        createdAt: p.created_at,
        lastUpdated: p.last_updated
      })),
      total: playlists.total
    };
  } catch (err) {
    log(`❌ Failed to get playlists: ${err.message}`);
    throw err;
  }
}