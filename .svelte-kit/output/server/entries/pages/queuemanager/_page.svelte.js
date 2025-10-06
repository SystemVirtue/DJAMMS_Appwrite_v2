import { c as create_ssr_component, v as validate_component, a as subscribe, o as onDestroy, b as add_attribute, e as escape, d as each, m as missing_component } from "../../../chunks/ssr.js";
import { d as djammsStore, c as currentTrack, a as playerControls, v as venueStatus } from "../../../chunks/djamms.js";
import { I as InstanceIds } from "../../../chunks/idGenerator.js";
import "../../../chunks/appwrite.js";
import "appwrite";
import { g as getDJAMMSService } from "../../../chunks/serviceInit.js";
import { P as Play } from "../../../chunks/play.js";
import { S as Shuffle, R as Repeat } from "../../../chunks/shuffle.js";
import { S as Skip_back, P as Pause, a as Skip_forward } from "../../../chunks/skip-forward.js";
import { V as Volume_2 } from "../../../chunks/volume-2.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { P as Plus } from "../../../chunks/plus.js";
import { S as Search } from "../../../chunks/search.js";
import { W as Wifi } from "../../../chunks/wifi.js";
import { C as Circle } from "../../../chunks/circle.js";
import { W as Wifi_off } from "../../../chunks/wifi-off.js";
const Heart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "heart" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let queue;
  let isPlaying;
  let $djammsStore, $$unsubscribe_djammsStore;
  let $currentTrack, $$unsubscribe_currentTrack;
  let $playerControls, $$unsubscribe_playerControls;
  let $venueStatus, $$unsubscribe_venueStatus;
  $$unsubscribe_djammsStore = subscribe(djammsStore, (value) => $djammsStore = value);
  $$unsubscribe_currentTrack = subscribe(currentTrack, (value) => $currentTrack = value);
  $$unsubscribe_playerControls = subscribe(playerControls, (value) => $playerControls = value);
  $$unsubscribe_venueStatus = subscribe(venueStatus, (value) => $venueStatus = value);
  InstanceIds.queue();
  let searchQuery = "";
  let volume = 75;
  getDJAMMSService();
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
  queue = $djammsStore.activeQueue || [];
  isPlaying = $playerControls.canPause;
  $djammsStore.playerState.position || 0;
  $currentTrack?.duration || 0;
  queue.filter((track) => track.title.toLowerCase().includes(searchQuery.toLowerCase()) || track.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  $$unsubscribe_djammsStore();
  $$unsubscribe_currentTrack();
  $$unsubscribe_playerControls();
  $$unsubscribe_venueStatus();
  return `${$$result.head += `<!-- HEAD_svelte-1qylz11_START -->${$$result.title = `<title>Queue Manager - DJAMMS</title>`, ""}<!-- HEAD_svelte-1qylz11_END -->`, ""} <main class="flex flex-col h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple"> <header class="flex justify-between items-center p-4 glass-morphism border-b border-white/10"><div class="flex items-center gap-4"><div class="w-10 h-10 bg-gradient-to-br from-music-purple to-purple-700 rounded-xl flex items-center justify-center">${validate_component(Play, "Play").$$render($$result, { class: "w-6 h-6 text-white" }, {}, {})}</div> <div data-svelte-h="svelte-12gv8il"><h1 class="text-xl font-bold text-white">Queue Manager</h1> <p class="text-gray-400 text-sm">Manage your music queue and playback</p></div></div> <div class="flex items-center gap-4"> ${$venueStatus ? (() => {
    let statusDisplay = getVenueStatusDisplay($venueStatus);
    return ` <div class="${"status-indicator " + escape(statusDisplay.class, true)}">${validate_component(statusDisplay.icon || missing_component, "svelte:component").$$render($$result, { class: "w-4 h-4" }, {}, {})} <span class="hidden sm:inline">${escape(statusDisplay.text)}</span></div>`;
  })() : ``}  <div class="flex items-center gap-2"><img${add_attribute("src", `https://ui-avatars.com/api/?name=${encodeURIComponent($djammsStore.currentUser?.email || "User")}&background=7C3AED&color=fff`, 0)} alt="User Avatar" class="w-8 h-8 rounded-full"> <span class="text-white text-sm font-medium hidden sm:block">${escape($djammsStore.currentUser?.email)}</span></div></div></header>  <div class="px-4 py-3 bg-surface-50-900-token border-b border-white/10"><div class="flex items-center justify-between"><div class="text-center flex-1"><span class="text-sm text-gray-400" data-svelte-h="svelte-13qswol">Venue Queue:</span> <span class="text-white font-medium">${escape($djammsStore.currentVenue?.venue_name || "No venue selected")}</span></div>  ${``}</div></div> <div class="flex-1 flex overflow-hidden"> <div class="w-1/3 border-r border-white/10 flex flex-col"> <div class="p-6 border-b border-white/10"><h2 class="text-lg font-semibold text-white mb-4" data-svelte-h="svelte-vgvofq">Now Playing</h2> ${` <div class="text-center mb-6" data-svelte-h="svelte-1meyhq0"><div class="w-48 h-48 mx-auto rounded-2xl bg-white/10 animate-pulse mb-4"></div> <div class="h-6 bg-white/10 rounded mb-2 animate-pulse"></div> <div class="h-4 bg-white/10 rounded w-2/3 mx-auto animate-pulse"></div></div>`}  <div class="flex justify-center items-center gap-4 mb-6"><button class="${[
    "p-2 text-gray-400 hover:text-white transition-colors",
    ""
  ].join(" ").trim()}">${validate_component(Shuffle, "Shuffle").$$render($$result, { class: "w-5 h-5" }, {}, {})}</button> <button class="p-3 text-white hover:text-gray-300 transition-colors">${validate_component(Skip_back, "SkipBack").$$render($$result, { class: "w-6 h-6" }, {}, {})}</button> <button class="p-4 bg-gradient-to-r from-youtube-red to-music-purple hover:from-youtube-red/90 hover:to-music-purple/90 rounded-full text-white transition-all transform hover:scale-105">${isPlaying ? `${validate_component(Pause, "Pause").$$render($$result, { class: "w-8 h-8" }, {}, {})}` : `${validate_component(Play, "Play").$$render($$result, { class: "w-8 h-8 ml-1" }, {}, {})}`}</button> <button class="p-3 text-white hover:text-gray-300 transition-colors">${validate_component(Skip_forward, "SkipForward").$$render($$result, { class: "w-6 h-6" }, {}, {})}</button> <button class="${[
    "p-2 text-gray-400 hover:text-white transition-colors",
    ""
  ].join(" ").trim()}">${validate_component(Repeat, "Repeat").$$render($$result, { class: "w-5 h-5" }, {}, {})} ${``}</button></div>  <div class="flex items-center gap-3">${validate_component(Volume_2, "Volume2").$$render($$result, { class: "w-5 h-5 text-gray-400" }, {}, {})} <div class="flex-1"><input type="range" min="0" max="100" class="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer"${add_attribute("value", volume, 0)}></div> <span class="text-sm text-gray-400 w-10">${escape(volume)}%</span></div></div>  <div class="p-6"><div class="grid grid-cols-2 gap-3"><button class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-sm font-medium transition-colors">${validate_component(Heart, "Heart").$$render($$result, { class: "w-4 h-4 mx-auto mb-1" }, {}, {})}
						Like</button> <button class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-sm font-medium transition-colors">${validate_component(Plus, "Plus").$$render($$result, { class: "w-4 h-4 mx-auto mb-1" }, {}, {})}
						Add to Playlist</button></div></div></div>  <div class="flex-1 flex flex-col"> <div class="p-6 border-b border-white/10"><h2 class="text-lg font-semibold text-white mb-4" data-svelte-h="svelte-1aggl1h">Queue</h2> <div class="relative">${validate_component(Search, "Search").$$render(
    $$result,
    {
      class: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
    },
    {},
    {}
  )} <input type="text" placeholder="Search for songs to add to queue..." class="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-music-purple focus:bg-white/15 transition-all"${add_attribute("value", searchQuery, 0)}></div></div>  <div class="flex-1 overflow-auto p-6">${` <div class="space-y-3">${each(Array(3), (_) => {
    return `<div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10" data-svelte-h="svelte-1icqmik"><div class="w-8 h-8 bg-white/10 rounded-lg animate-pulse"></div> <div class="w-12 h-12 bg-white/10 rounded-lg animate-pulse"></div> <div class="flex-1"><div class="h-4 bg-white/10 rounded mb-2 animate-pulse"></div> <div class="h-3 bg-white/10 rounded w-2/3 animate-pulse"></div></div> </div>`;
  })}</div>`}</div></div></div></main>`;
});
export {
  Page as default
};
