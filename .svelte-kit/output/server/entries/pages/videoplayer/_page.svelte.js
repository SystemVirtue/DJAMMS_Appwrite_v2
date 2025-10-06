import { c as create_ssr_component, v as validate_component, a as subscribe, o as onDestroy, b as add_attribute } from "../../../chunks/ssr.js";
import { d as djammsStore, a as playerControls, c as currentTrack } from "../../../chunks/djamms.js";
import { I as InstanceIds } from "../../../chunks/idGenerator.js";
import { g as getDJAMMSService } from "../../../chunks/serviceInit.js";
import "../../../chunks/appwrite.js";
import { U as Users } from "../../../chunks/users.js";
import { S as Skip_back, P as Pause, a as Skip_forward } from "../../../chunks/skip-forward.js";
import { P as Play } from "../../../chunks/play.js";
import { V as Volume_2 } from "../../../chunks/volume-2.js";
import { I as Icon } from "../../../chunks/Icon.js";
const Maximize_2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["polyline", { "points": "15 3 21 3 21 9" }],
    ["polyline", { "points": "9 21 3 21 3 15" }],
    [
      "line",
      {
        "x1": "21",
        "x2": "14",
        "y1": "3",
        "y2": "10"
      }
    ],
    [
      "line",
      {
        "x1": "3",
        "x2": "10",
        "y1": "21",
        "y2": "14"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "maximize-2" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $djammsStore, $$unsubscribe_djammsStore;
  let $playerControls, $$unsubscribe_playerControls;
  let $$unsubscribe_currentTrack;
  $$unsubscribe_djammsStore = subscribe(djammsStore, (value) => $djammsStore = value);
  $$unsubscribe_playerControls = subscribe(playerControls, (value) => $playerControls = value);
  $$unsubscribe_currentTrack = subscribe(currentTrack, (value) => value);
  const data = void 0;
  let playerContainer;
  let player;
  InstanceIds.player();
  getDJAMMSService();
  onDestroy(() => {
    try {
      if (player && player.destroy) ;
    } catch (error) {
      console.error("🎵 VideoPlayer: Error destroying player:", error);
    }
  });
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) ;
  $$unsubscribe_djammsStore();
  $$unsubscribe_playerControls();
  $$unsubscribe_currentTrack();
  return ` ${$$result.head += `<!-- HEAD_svelte-1pbsqsz_START -->${$$result.title = `<title>Video Player - DJAMMS</title>`, ""}<!-- HEAD_svelte-1pbsqsz_END -->`, ""} <main class="youtube-player"> ${$djammsStore.isLoading ? ` <div class="absolute inset-0 bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple flex items-center justify-center" data-svelte-h="svelte-1u6z3mn"><div class="text-center p-8 max-w-2xl"><div class="w-16 h-16 border-4 border-youtube-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div> <h2 class="text-white text-xl font-semibold mb-2">Checking Authentication...</h2> <p class="text-gray-400">Verifying your login status</p></div></div>` : `${!$djammsStore.isAuthenticated ? `<div class="absolute inset-0 bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple flex items-center justify-center"><div class="text-center p-8 max-w-2xl">${validate_component(Users, "Users").$$render(
    $$result,
    {
      class: "w-20 h-20 text-red-400 mx-auto mb-6"
    },
    {},
    {}
  )} <h2 class="text-white text-3xl font-bold mb-4" data-svelte-h="svelte-1f6nhhb">Authentication Required</h2> <p class="text-red-300 text-xl mb-6" data-svelte-h="svelte-sm1e96">You need to be signed in to access the DJAMMS video player.</p> <p class="text-gray-400 mb-8" data-svelte-h="svelte-l9zltp">Please sign in to continue using DJAMMS.</p> <div class="flex gap-4 justify-center"><button class="px-6 py-3 bg-youtube-red hover:bg-red-700 text-white rounded-lg font-semibold transition-colors" data-svelte-h="svelte-ezq80s">Return to Dashboard</button></div></div></div>` : ` <div class="absolute inset-0"${add_attribute("this", playerContainer, 0)}></div>  ${`<div class="absolute inset-0 bg-black flex items-center justify-center" data-svelte-h="svelte-1q0q0nq"><div class="text-center"><div class="w-16 h-16 border-4 border-youtube-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div> <h2 class="text-white text-xl font-semibold mb-2">Loading Player...</h2> <p class="text-gray-400">Initializing YouTube video player</p></div></div>`}  <div class="floating-controls"><div class="glass-morphism rounded-full px-6 py-3 flex items-center gap-4"><button class="p-2 text-white hover:text-youtube-red transition-colors" title="Skip backward 10s (←)">${validate_component(Skip_back, "SkipBack").$$render($$result, { class: "w-6 h-6" }, {}, {})}</button> <button class="p-3 bg-youtube-red hover:bg-youtube-red/80 rounded-full text-white transition-colors" title="Play/Pause (Space)">${$playerControls.canPause ? `${validate_component(Pause, "Pause").$$render($$result, { class: "w-8 h-8" }, {}, {})}` : `${validate_component(Play, "Play").$$render($$result, { class: "w-8 h-8 ml-1" }, {}, {})}`}</button> <button class="p-2 text-white hover:text-youtube-red transition-colors" title="Skip forward 10s (→)">${validate_component(Skip_forward, "SkipForward").$$render($$result, { class: "w-6 h-6" }, {}, {})}</button> <div class="w-px h-8 bg-white/20 mx-2"></div> <button class="p-2 text-white hover:text-youtube-red transition-colors" title="Volume down (↓)">${validate_component(Volume_2, "Volume2").$$render($$result, { class: "w-5 h-5" }, {}, {})}</button> <button class="p-2 text-white hover:text-youtube-red transition-colors" title="Volume up (↑)">${validate_component(Volume_2, "Volume2").$$render($$result, { class: "w-5 h-5" }, {}, {})}</button> <button class="p-2 text-white hover:text-youtube-red transition-colors" title="Fullscreen (F)">${validate_component(Maximize_2, "Maximize2").$$render($$result, { class: "w-5 h-5" }, {}, {})}</button></div></div>  ${``}  ${$djammsStore.isAuthenticated ? `<div class="absolute top-4 right-4" data-svelte-h="svelte-5c4tro"><div class="glass-morphism rounded-lg p-3 text-white text-sm opacity-75"><div class="font-semibold mb-2">Keyboard Shortcuts</div> <div class="space-y-1 text-xs"><div><kbd class="bg-white/20 px-1 rounded">Space</kbd> Play/Pause</div> <div><kbd class="bg-white/20 px-1 rounded">←→</kbd> Skip 10s</div> <div><kbd class="bg-white/20 px-1 rounded">Shift+←→</kbd> Seek 30s</div> <div><kbd class="bg-white/20 px-1 rounded">↑↓</kbd> Volume</div> <div><kbd class="bg-white/20 px-1 rounded">Home/End</kbd> Start/End</div> <div><kbd class="bg-white/20 px-1 rounded">F</kbd> Fullscreen</div></div></div></div>` : ``}`}`}</main>`;
});
export {
  Page as default
};
