const sdk = require('node-appwrite');
const fetch = require('node-fetch');

/**
 * Appwrite Function: import-playlist
 * Expects JSON payload: { playlistId: string, playlistUrl: string }
 * Environment variables required:
 * - APPWRITE_ENDPOINT
 * - APPWRITE_API_KEY (service key)
 * - APPWRITE_PROJECT_ID
 * - YOUTUBE_API_KEY
 */

module.exports = async function (req, res) {
  try {
  // Helper to send JSON responses that works whether Appwrite called
    // the function as (req, res) or as a single object containing { req, res, log, error }
    const sendJson = (body, status = 200) => {
      try {
        if (res && typeof res.json === 'function') return res.json(body, status);
        if (req && req.res && typeof req.res.json === 'function') return req.res.json(body, status);
        // If no res.json available, try req.res as a fallback
        if (req && typeof req.json === 'function') return req.json(body, status);
        // Last resort: log and return the body (Appwrite will capture logs)
        console.log('No res.json available; falling back to console.log response:', body);
        return body;
      } catch (e) {
        console.log('Error while sending response:', e && e.message);
        return null;
      }
    };
  // Toggle verbose logs with env var DEBUG_IMPORT_PLAYLIST (default off in production)
  const VERBOSE = !!process.env.DEBUG_IMPORT_PLAYLIST;
    // Defensive payload parsing: `req.payload` may be undefined, already a JSON string,
    // or a JSON string that has been double-serialized. Try multiple strategies and
    // log the raw value for easier debugging in Appwrite logs.
    // Appwrite may call the function with different shapes. The `req` argument
    // we receive can be the raw request object or a context object that contains
    // a nested `req` (e.g. { req, res, log, error }). Try common locations.
    let payloadRaw;
    try {
      if (req && typeof req === 'object' && typeof req.payload !== 'undefined') {
        payloadRaw = req.payload;
        console.log('Found payload at req.payload');
      } else if (req && req.req && typeof req.req.payload !== 'undefined') {
        payloadRaw = req.req.payload;
        console.log('Found payload at req.req.payload');
      } else if (req && req.body && typeof req.body.payload !== 'undefined') {
        payloadRaw = req.body.payload;
        console.log('Found payload at req.body.payload');
      } else if (req && req.req && req.req.body && typeof req.req.body.payload !== 'undefined') {
        payloadRaw = req.req.body.payload;
        console.log('Found payload at req.req.body.payload');
      } else if (req && req.body) {
        // Sometimes Appwrite sends the whole body as the payload directly
        payloadRaw = req.body;
        console.log('Found payload at req.body (fallback)');
      } else {
        payloadRaw = undefined;
      }
    } catch (e) {
      console.log('Error while locating payload in req shape:', e && e.message);
      payloadRaw = req && req.payload;
    }

  if (VERBOSE) console.log('Raw req.payload type:', typeof payloadRaw);
  if (VERBOSE) console.log('Raw req.payload preview:', (payloadRaw || '').toString().slice(0, 200));

    // Extra debug: if payload is undefined, dump top-level req keys and common fields
    if (typeof payloadRaw === 'undefined') {
      try {
        if (VERBOSE) console.log('Req top-level keys:', Object.keys(req || {}));
        if (req && typeof req === 'object') {
          if (VERBOSE && req.body) console.log('Req.body preview:', JSON.stringify(Object.keys(req.body)).slice(0,200));
          if (VERBOSE && req.env) console.log('Req.env keys:', Object.keys(req.env || {}).slice(0,50));
          if (VERBOSE && req.variables) console.log('Req.variables keys:', Object.keys(req.variables || {}).slice(0,50));
          if (VERBOSE && req.headers) console.log('Req.headers keys:', Object.keys(req.headers || {}).slice(0,50));
        }
        // Deep inspect the req object safely to capture shapes Appwrite might send
        try {
          const util = require('util');
          if (VERBOSE) console.log('Req inspect:', util.inspect(req, { depth: 2, maxArrayLength: 20 }));
        } catch (ie) {
          if (VERBOSE) console.log('util.inspect failed:', ie && ie.message);
        }
      } catch (e) {
        if (VERBOSE) console.log('Failed to inspect req object:', e && e.message);
      }
    }

    let payload = {};
    if (!payloadRaw) {
      payload = {};
    } else if (typeof payloadRaw === 'string') {
      try {
        payload = JSON.parse(payloadRaw);
      } catch (e) {
        // Try one more time in case it's double-encoded
        try {
          payload = JSON.parse(JSON.parse(payloadRaw));
        } catch (e) {
              if (VERBOSE) console.log('Failed to parse req.payload as JSON:', e.message);
              payload = {};
            }
      }
    } else {
      payload = payloadRaw;
    }
  let playlistId = payload.playlistId;
  let playlistUrl = payload.playlistUrl;

    if (!playlistId || !playlistUrl) {
      console.log('Missing payload parameters — falling back to DEFAULT playlist for testing');
      // Fallback — use the deterministic global playlist so we can test the function
      const DEFAULT_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLJ7vMjpVbhBWLWJpweVDki43Wlcqzsqdu';
      playlistId = playlistId || 'global_default_playlist';
      playlistUrl = playlistUrl || DEFAULT_PLAYLIST_URL;
    }

    // If payload wasn't found yet, Appwrite sometimes exposes the request body
    // via getters on req.req: bodyJson, bodyText, bodyRaw. Try them.
    if ((!playlistId || !playlistUrl) && req && req.req) {
      try {
        if (typeof req.req.bodyJson !== 'undefined') {
          if (VERBOSE) console.log('Attempting to read req.req.bodyJson');
          const bj = req.req.bodyJson;
          if (VERBOSE) console.log('req.req.bodyJson preview:', JSON.stringify(bj).slice(0,300));
          if (bj && typeof bj.payload !== 'undefined') {
            payloadRaw = bj.payload;
          } else if (bj && (bj.playlistId || bj.playlistUrl)) {
            payloadRaw = bj;
          }
        }

        if ((!payloadRaw || payloadRaw === '') && typeof req.req.bodyText !== 'undefined') {
          if (VERBOSE) console.log('Attempting to read req.req.bodyText');
          const bt = req.req.bodyText;
          if (VERBOSE) console.log('req.req.bodyText preview:', (bt || '').toString().slice(0,300));
          try {
            const parsed = JSON.parse(bt || '');
            if (parsed && typeof parsed.payload !== 'undefined') payloadRaw = parsed.payload;
            else payloadRaw = parsed;
          } catch (pe) {
            // not JSON — if it's urlencoded (payload=...), try to parse
            try {
              const urlsearch = new URLSearchParams(bt || '');
              if (urlsearch.has('payload')) payloadRaw = urlsearch.get('payload');
            } catch (ue) {
              // ignore
            }
          }
        }

        if ((!payloadRaw || payloadRaw === '') && typeof req.req.bodyRaw !== 'undefined') {
          if (VERBOSE) console.log('Attempting to read req.req.bodyRaw');
          const br = req.req.bodyRaw;
          if (VERBOSE) console.log('req.req.bodyRaw preview:', (br || '').toString().slice(0,300));
          payloadRaw = br;
        }
      } catch (e) {
        console.log('Error while reading req.req body getters:', e && e.message);
      }

      // Recompute playlistId/playlistUrl if we found payloadRaw
      if (payloadRaw) {
        try {
          if (typeof payloadRaw === 'string') payload = JSON.parse(payloadRaw);
            else payload = payloadRaw;
        } catch (e) {
          try { payload = JSON.parse(JSON.parse(payloadRaw)); } catch (ee) { payload = payloadRaw; }
        }
        // overwrite local values
        playlistId = payload.playlistId || playlistId;
        playlistUrl = payload.playlistUrl || playlistUrl;
      }
    }

    // Extract playlistId param from playlistUrl if present
    const urlObj = new URL(playlistUrl);
    const listId = urlObj.searchParams.get('list') || playlistId;

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      console.log('YOUTUBE_API_KEY not configured');
      return sendJson({ error: 'Missing YOUTUBE_API_KEY env var' }, 500);
    }

    // Debug: log which Appwrite env vars are present (do not print secrets)
    try {
      if (VERBOSE) console.log('APPWRITE_ENDPOINT present?', !!process.env.APPWRITE_ENDPOINT);
      if (VERBOSE) console.log('APPWRITE_PROJECT_ID present?', !!process.env.APPWRITE_PROJECT_ID);
      if (VERBOSE) console.log('APPWRITE_API_KEY present?', !!process.env.APPWRITE_API_KEY);
      if (VERBOSE) console.log('APPWRITE_DATABASE_ID present?', !!process.env.APPWRITE_DATABASE_ID);
      if (VERBOSE) console.log('APPWRITE_PLAYLISTS_COLLECTION_ID present?', !!process.env.APPWRITE_PLAYLISTS_COLLECTION_ID);
    } catch (e) {
      // ignore
    }

    const client = new sdk.Client();
    // Ensure endpoint includes '/v1' — node-appwrite expects the API base path.
    const rawEndpoint = process.env.APPWRITE_ENDPOINT || '';
    let endpointToUse = rawEndpoint;
    if (!endpointToUse) endpointToUse = 'https://syd.cloud.appwrite.io/v1';
    // Append /v1 if missing
    if (!/\/v1\/?$/.test(endpointToUse)) endpointToUse = endpointToUse.replace(/\/$/, '') + '/v1';
    console.log('Using Appwrite endpoint (final):', endpointToUse);
    client
      .setEndpoint(endpointToUse)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    // Paginate through YouTube playlistItems
    let nextPageToken = '';
    const tracks = [];

    while (true) {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(listId)}&key=${youtubeApiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
  if (VERBOSE) console.log('Fetching', apiUrl);
      let r;
      try {
        r = await fetch(apiUrl);
      } catch (netErr) {
        console.log('Network error when calling YouTube API:', netErr && netErr.message);
        break;
      }

      if (!r) {
        console.log('YouTube fetch returned undefined/null');
        break;
      }

      if (!r.ok) {
        let text = '';
        try {
          text = await r.text();
        } catch (te) {
          text = `failed to read body: ${te.message}`;
        }
        console.log('YouTube API error:', r.status, text);
        break;
      }

      let json;
      try {
        json = await r.json();
      } catch (parseErr) {
        console.log('Failed to parse YouTube response as JSON:', parseErr && parseErr.message);
        break;
      }

      for (const item of json.items || []) {
  const videoId = item.contentDetails?.videoId;
        const title = item.snippet?.title || 'Unknown Title';
        const thumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '';

        tracks.push({
          id: `yt_${videoId}`,
          video_id: videoId,
          title,
          artist: item.snippet?.videoOwnerChannelTitle || '',
          duration: 0,
          thumbnail,
          position: tracks.length,
          requested_by: 'system',
          added_at: new Date().toISOString()
        });
      }

      nextPageToken = json.nextPageToken || '';
      if (!nextPageToken) break;
    }

    // Update playlist document in Appwrite (upsert behavior)
    try {
      const dbId = process.env.APPWRITE_DATABASE_ID;
      const colId = process.env.APPWRITE_PLAYLISTS_COLLECTION_ID;
  // Upsert behavior: try update first (fast-path). If update fails because the
  // document doesn't exist, attempt to create it. If create fails due to a
  // race (document already exists), retry update once.
      const docData = {
        user_id: 'system',
        name: 'Global Default Playlist',
        // Keep `tracks` as legacy JSON string for compatibility
        tracks: JSON.stringify(tracks),
        // New attribute: array of stringified track objects
        tracks_array: tracks.map(t => JSON.stringify(t)),
        is_public: false,
        thumbnail: ''
      };

      let didWrite = false;
      try {
  // Try update first. Update both legacy `tracks` and new `tracks_array` if attribute exists.
  const updatePayload = { tracks: JSON.stringify(tracks) };
  try { updatePayload.tracks_array = tracks.map(t => JSON.stringify(t)); } catch (e) { /* ignore */ }
  if (VERBOSE) console.log('Update payload prepared, tracks_array length:', (updatePayload.tracks_array || []).length);
  if (VERBOSE && (updatePayload.tracks_array || []).length > 0) console.log('First tracks_array item preview:', (updatePayload.tracks_array || [])[0].slice(0,200));
  await databases.updateDocument(dbId, colId, playlistId, updatePayload);
  console.log(`Updated ${tracks.length} tracks into playlist ${playlistId}`);
        didWrite = true;
      } catch (updateErr) {
        if (VERBOSE) console.log('Update failed, will attempt to create document:', updateErr && updateErr.message);
        try {
          if (VERBOSE) console.log('Create payload tracks_array length:', (docData.tracks_array || []).length);
          await databases.createDocument(dbId, colId, playlistId, docData, [], []);
          console.log(`Created playlist ${playlistId} with ${tracks.length} tracks`);
          didWrite = true;
        } catch (createErr) {
          // If create failed because the document already exists (race), try update again.
          const msg = (createErr && createErr.message) || '';
          if (VERBOSE) console.log('Create attempt failed:', msg);
          if (msg.includes('already exists') || msg.includes('Document with the requested ID')) {
            if (VERBOSE) console.log('Detected existing document after failed create, retrying update');
            await databases.updateDocument(dbId, colId, playlistId, { tracks: JSON.stringify(tracks) });
            console.log(`Updated ${tracks.length} tracks into playlist ${playlistId} (after race)`);
            didWrite = true;
          } else {
            throw createErr;
          }
        }
      }

      if (!didWrite) throw new Error('Did not write playlist document');

      return sendJson({ success: true, count: tracks.length });
    } catch (e) {
      console.log('Failed to upsert playlist document:', e && e.message, e);
      return sendJson({ error: 'Failed to upsert playlist document', detail: (e && e.message) || String(e) }, 500);
    }
  } catch (err) {
    console.log('Unexpected error in import-playlist function', err);
    return sendJson({ error: 'Unexpected error', detail: err.message }, 500);
  }
};
