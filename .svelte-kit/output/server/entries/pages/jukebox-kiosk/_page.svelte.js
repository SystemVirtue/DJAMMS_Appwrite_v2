import { c as create_ssr_component, v as validate_component, b as add_attribute } from "../../../chunks/ssr.js";
import { M as Music } from "../../../chunks/music.js";
import { S as Search } from "../../../chunks/search.js";
import { C as Clock } from "../../../chunks/clock.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let searchQuery = "";
  return `<div class="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-green-900"> <header class="bg-black/30 backdrop-blur-sm border-b border-white/10"><div class="max-w-4xl mx-auto px-6 py-6"><div class="text-center"><div class="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">${validate_component(Music, "Music").$$render($$result, { class: "w-8 h-8 text-white" }, {}, {})}</div> <h1 class="text-3xl font-bold text-white mb-2" data-svelte-h="svelte-1r7b2v5">Jukebox Kiosk</h1> <p class="text-green-200" data-svelte-h="svelte-192xttd">Request your favorite songs and see what&#39;s playing</p></div></div></header> <div class="max-w-4xl mx-auto p-6"> <div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6"><h2 class="text-xl font-bold text-white mb-4" data-svelte-h="svelte-qpp6p1">Now Playing</h2> <div class="text-center py-8"><div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">${validate_component(Music, "Music").$$render($$result, { class: "w-12 h-12 text-green-400" }, {}, {})}</div> <p class="text-gray-400" data-svelte-h="svelte-12i0dox">No song currently playing</p> <p class="text-sm text-gray-500 mt-2" data-svelte-h="svelte-z0q90i">Make a request to get the party started!</p></div></div>  <div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6"><h2 class="text-xl font-bold text-white mb-4" data-svelte-h="svelte-bvn6o4">Request a Song</h2> <div class="flex space-x-3 mb-6"><div class="flex-1"><input placeholder="Search for songs, artists, or albums..." class="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none"${add_attribute("value", searchQuery, 0)}></div> <button ${!searchQuery.trim() ? "disabled" : ""} class="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">${`${validate_component(Search, "Search").$$render($$result, { class: "w-5 h-5" }, {}, {})}`}</button></div> <div class="text-center py-12 text-gray-500">${validate_component(Search, "Search").$$render(
    $$result,
    {
      class: "w-16 h-16 mx-auto mb-4 opacity-50"
    },
    {},
    {}
  )} <p data-svelte-h="svelte-17553jt">Enter a search term to find songs</p></div></div>  <div class="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10"><h2 class="text-xl font-bold text-white mb-4" data-svelte-h="svelte-jmcwq3">Coming Up</h2> <div class="text-center py-8">${validate_component(Clock, "Clock").$$render(
    $$result,
    {
      class: "w-12 h-12 text-gray-500 mx-auto mb-4"
    },
    {},
    {}
  )} <p class="text-gray-400" data-svelte-h="svelte-p7pz3y">No songs in queue</p></div></div></div></div>`;
});
export {
  Page as default
};
