import { error, json } from "@sveltejs/kit";
import { d as databases, D as DATABASE_ID } from "../../../../chunks/appwrite.js";
const POST = async ({ request }) => {
  try {
    const { command, venueId, userId, data } = await request.json();
    if (!venueId || !userId) {
      throw error(400, "Missing venueId or userId");
    }
    const venue = await databases.getDocument(DATABASE_ID, "venues", venueId);
    let updateData = {};
    const now = (/* @__PURE__ */ new Date()).toISOString();
    switch (command) {
      case "play_track":
        console.log("🎵 UI Command: play_track", { venueId, userId, track: data?.track?.title });
        if (!data?.track) throw error(400, "Missing track data");
        updateData = {
          now_playing: JSON.stringify(data.track),
          state: "playing",
          current_time: 0,
          last_updated: now
        };
        break;
      case "pause":
        updateData = {
          state: "paused",
          last_updated: now
        };
        break;
      case "resume":
        updateData = {
          state: "playing",
          last_updated: now
        };
        break;
      case "skip_next":
        const activeQueue = venue.active_queue ? JSON.parse(venue.active_queue) : [];
        if (activeQueue.length > 0) {
          const nextTrack = activeQueue[0];
          const remainingQueue = activeQueue.slice(1);
          updateData = {
            now_playing: JSON.stringify(nextTrack),
            active_queue: JSON.stringify(remainingQueue),
            state: "playing",
            current_time: 0,
            last_updated: now
          };
        }
        break;
      case "add_to_queue":
        if (!data?.track) throw error(400, "Missing track data");
        const currentQueue = venue.active_queue ? JSON.parse(venue.active_queue) : [];
        const updatedQueue = [...currentQueue, data.track];
        updateData = {
          active_queue: JSON.stringify(updatedQueue),
          last_updated: now
        };
        break;
      case "remove_from_queue":
        if (!data?.index && data?.index !== 0) throw error(400, "Missing queue index");
        const queueToModify = venue.active_queue ? JSON.parse(venue.active_queue) : [];
        const modifiedQueue = queueToModify.filter((_, i) => i !== data.index);
        updateData = {
          active_queue: JSON.stringify(modifiedQueue),
          last_updated: now
        };
        break;
      case "reorder_queue":
        if (!data?.newQueue) throw error(400, "Missing new queue data");
        updateData = {
          active_queue: JSON.stringify(data.newQueue),
          last_updated: now
        };
        break;
      case "advance_queue":
        if (!data?.nowPlaying || !data?.activeQueue) throw error(400, "Missing nowPlaying or activeQueue data");
        console.log("🎵 UI Command: advance_queue", { venueId, nowPlaying: data.nowPlaying.title, queueLength: data.activeQueue.length });
        updateData = {
          now_playing: JSON.stringify(data.nowPlaying),
          active_queue: JSON.stringify(data.activeQueue),
          state: "playing",
          current_time: 0,
          last_updated: now
        };
        break;
      case "update_now_playing":
        if (!data?.track) throw error(400, "Missing track data");
        updateData = {
          now_playing: JSON.stringify(data.track),
          last_updated: now
        };
        break;
      case "update_progress":
        if (typeof data?.position !== "number") throw error(400, "Missing position");
        updateData = {
          current_time: data.position,
          last_updated: now
        };
        break;
      case "update_player_state":
        console.log("🎵 UI Command: update_player_state", { venueId, status: data?.status, position: data?.position });
        if (!data?.status) throw error(400, "Missing status");
        updateData = {
          state: data.status,
          current_time: data.position || 0,
          last_updated: now
        };
        break;
      case "update_player_position":
        console.log("🎵 UI Command: update_player_position", { venueId, position: data?.position });
        if (typeof data?.position !== "number") throw error(400, "Missing position");
        updateData = {
          current_time: data.position,
          last_updated: now
        };
        break;
      case "update_volume":
        if (typeof data?.volume !== "number") throw error(400, "Missing volume");
        updateData = {
          volume: data.volume,
          last_updated: now
        };
        break;
      case "logout":
        break;
      default:
        throw error(400, `Unknown command: ${command}`);
    }
    if (Object.keys(updateData).length > 0) {
      await databases.updateDocument(DATABASE_ID, "venues", venueId, updateData);
    }
    return json({
      success: true,
      command,
      venueId,
      timestamp: now
    });
  } catch (err) {
    console.error("UI Command error:", err);
    throw error(500, err.message || "Internal server error");
  }
};
export {
  POST
};
