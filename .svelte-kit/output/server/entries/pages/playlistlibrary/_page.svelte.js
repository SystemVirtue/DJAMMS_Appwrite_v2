import { c as create_ssr_component, a as subscribe, o as onDestroy, v as validate_component, b as add_attribute, e as escape, m as missing_component } from "../../../chunks/ssr.js";
import { d as djammsStore, v as venueStatus } from "../../../chunks/djamms.js";
import "../../../chunks/appwrite.js";
import "appwrite";
import { g as getDJAMMSService } from "../../../chunks/serviceInit.js";
import { L as Library, C as Chevron_down } from "../../../chunks/library.js";
import { S as Search } from "../../../chunks/search.js";
import { P as Plus } from "../../../chunks/plus.js";
import { W as Wifi } from "../../../chunks/wifi.js";
import { C as Circle } from "../../../chunks/circle.js";
import { W as Wifi_off } from "../../../chunks/wifi-off.js";
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
function getTotalDuration(playlists2) {
  return playlists2.reduce(
    (sum, p) => sum + (Array.isArray(p.tracks) ? p.tracks.reduce((trackSum, track) => trackSum + (track.duration || 0), 0) : 0),
    0
  );
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredPlaylists;
  let $djammsStore, $$unsubscribe_djammsStore;
  let $venueStatus, $$unsubscribe_venueStatus;
  $$unsubscribe_djammsStore = subscribe(djammsStore, (value) => $djammsStore = value);
  $$unsubscribe_venueStatus = subscribe(venueStatus, (value) => $venueStatus = value);
  let playlists = [];
  getDJAMMSService();
  let searchQuery = "";
  let sortBy = "recent";
  function getVenueStatusDisplay(status) {
    if (status.isConnected) {
      switch ($djammsStore.playerState.status) {
        case "playing":
          return {
            icon: Circle,
            text: "CONNECTED, PLAYING",
            class: "status-connected-playing"
          };
        case "paused":
          return {
            icon: Circle,
            text: "CONNECTED, PAUSED",
            class: "status-connected-paused"
          };
        default:
          return {
            icon: Wifi,
            text: "CONNECTED, IDLE",
            class: "status-connected-paused"
          };
      }
    } else {
      return {
        icon: Wifi_off,
        text: "DISCONNECTED",
        class: "status-disconnected"
      };
    }
  }
  onDestroy(() => {
  });
  filteredPlaylists = playlists.filter((playlist) => {
    const currentUserId = $djammsStore.currentUser?.$id;
    const hasAccess = playlist.is_public || currentUserId && playlist.owner_id === currentUserId;
    if (!hasAccess) return false;
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) || playlist.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = true;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "tracks":
        return (Array.isArray(b.tracks) ? b.tracks.length : 0) - (Array.isArray(a.tracks) ? a.tracks.length : 0);
      case "duration":
        const aTracks = Array.isArray(a.tracks) ? a.tracks : [];
        const bTracks = Array.isArray(b.tracks) ? b.tracks : [];
        const aDuration = aTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const bDuration = bTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        return bDuration - aDuration;
      case "recent":
      default:
        return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
    }
  });
  $$unsubscribe_djammsStore();
  $$unsubscribe_venueStatus();
  return `${$$result.head += `<!-- HEAD_svelte-16rf822_START -->${$$result.title = `<title>Playlist Library - DJAMMS</title>`, ""}<!-- HEAD_svelte-16rf822_END -->`, ""} <main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-pink"> <header class="flex justify-between items-center p-4 glass-morphism border-b border-white/10"><div class="flex items-center gap-4"><div class="w-10 h-10 bg-gradient-to-br from-music-pink to-pink-700 rounded-xl flex items-center justify-center">${validate_component(Library, "Library").$$render($$result, { class: "w-6 h-6 text-white" }, {}, {})}</div> <div data-svelte-h="svelte-usfr9d"><h1 class="text-xl font-bold text-white">Playlist Library</h1> <p class="text-gray-400 text-sm">Create, organize, and manage your playlists</p></div></div> <div class="flex items-center gap-4"> ${$venueStatus ? (() => {
    let statusDisplay = getVenueStatusDisplay($venueStatus);
    return ` <div class="${"status-indicator " + escape(statusDisplay.class, true)}">${validate_component(statusDisplay.icon || missing_component, "svelte:component").$$render($$result, { class: "w-4 h-4" }, {}, {})} <span class="hidden sm:inline">${escape(statusDisplay.text)}</span></div>`;
  })() : ``}  <div class="flex items-center gap-2"><img${add_attribute("src", `https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.email || "User")}&background=EC4899&color=fff`, 0)} alt="User Avatar" class="w-8 h-8 rounded-full"> <span class="text-white text-sm font-medium hidden sm:block">${escape($djammsStore.currentUser?.email)}</span></div></div></header>  <div class="p-4 border-b border-white/10 bg-white/5"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><span class="text-white font-medium" data-svelte-h="svelte-1vb03rh">Current Venue:</span> <div class="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg"><span class="text-white font-medium">${escape($djammsStore.currentVenue?.venue_name || "No venue selected")}</span></div></div>  <div class="relative playlist-selector"><button class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-music-pink to-pink-700 text-white rounded-lg hover:from-music-pink/90 hover:to-pink-700/90 transition-all"><span data-svelte-h="svelte-utcfac">Load Playlist</span> <div class="${"w-4 h-4 transition-transform " + escape("", true)}">${validate_component(Chevron_down, "ChevronDown").$$render($$result, { class: "w-4 h-4" }, {}, {})}</div></button>  ${``}</div></div></div>  <div class="p-6 border-b border-white/10"><div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"> <div class="flex gap-4 flex-1"><div class="relative flex-1 max-w-md">${validate_component(Search, "Search").$$render(
    $$result,
    {
      class: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
    },
    {},
    {}
  )} <input type="text" placeholder="Search playlists..." class="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-music-pink focus:bg-white/15 transition-all"${add_attribute("value", searchQuery, 0)}></div> <button class="px-6 py-3 bg-gradient-to-r from-music-pink to-pink-700 hover:from-music-pink/90 hover:to-pink-700/90 text-white rounded-xl font-medium transition-all flex items-center gap-2">${validate_component(Plus, "Plus").$$render($$result, { class: "w-5 h-5" }, {}, {})}
					Create Playlist</button></div>  <div class="flex gap-4 items-center"> <div class="flex bg-white/10 rounded-xl border border-white/20"><button class="${[
    "px-4 py-2 rounded-l-xl text-sm font-medium transition-colors",
    "bg-music-pink text-white "
  ].join(" ").trim()}" data-svelte-h="svelte-1czytdv">All</button> <button class="${[
    "px-4 py-2 text-sm font-medium transition-colors",
    "  text-gray-400"
  ].join(" ").trim()}" data-svelte-h="svelte-10khqfy">Public</button> <button class="${[
    "px-4 py-2 rounded-r-xl text-sm font-medium transition-colors",
    "  text-gray-400"
  ].join(" ").trim()}" data-svelte-h="svelte-aa2lgh">Private</button></div>  <select class="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-music-pink"><option value="recent" data-svelte-h="svelte-pj75jm">Recently Played</option><option value="name" data-svelte-h="svelte-8o3xma">Name</option><option value="tracks" data-svelte-h="svelte-n1dh54">Track Count</option><option value="duration" data-svelte-h="svelte-jl9efy">Duration</option></select>  <div class="flex bg-white/10 rounded-xl border border-white/20"><button class="${[
    "p-2 rounded-l-xl transition-colors",
    "bg-music-pink text-white "
  ].join(" ").trim()}" data-svelte-h="svelte-e34mj"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg></button> <button class="${[
    "p-2 rounded-r-xl transition-colors",
    "  text-gray-400"
  ].join(" ").trim()}" data-svelte-h="svelte-1dlwvzz"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg></button></div></div></div></div>  <div class="flex-1 overflow-auto p-6">${` <div class="text-center py-16"><div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">${validate_component(Library, "Library").$$render($$result, { class: "w-8 h-8 text-gray-400" }, {}, {})}</div> <h3 class="text-lg font-semibold text-white mb-2" data-svelte-h="svelte-gl20t3">Loading Playlists...</h3> <p class="text-gray-400" data-svelte-h="svelte-hr199j">Fetching your music collection from the cloud</p></div>`}</div>  <footer class="p-4 border-t border-white/10 text-center text-gray-400 text-sm">Showing ${escape(filteredPlaylists.length)} of ${escape(playlists.length)} playlists • 
		Total: ${escape(playlists.reduce((sum, p) => sum + (p.tracks?.length || 0), 0))} tracks • 
		${escape(formatTime(getTotalDuration(playlists)))} of music</footer></main>`;
});
export {
  Page as default
};
