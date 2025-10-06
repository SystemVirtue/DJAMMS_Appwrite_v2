import { c as create_ssr_component, v as validate_component, a as subscribe } from "../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
import { d as djammsStore } from "../../chunks/djamms.js";
import "../../chunks/appwrite.js";
import { P as Play } from "../../chunks/play.js";
import { M as Music } from "../../chunks/music.js";
import { I as Icon } from "../../chunks/Icon.js";
import { Z as Zap } from "../../chunks/zap.js";
function goto(url, opts = {}) {
  {
    throw new Error("Cannot call goto(...) on the server");
  }
}
const Headphones = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "headphones" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $djammsStore, $$unsubscribe_djammsStore;
  $$unsubscribe_djammsStore = subscribe(djammsStore, (value) => $djammsStore = value);
  const data = void 0;
  const params = void 0;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) ;
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) ;
  {
    if ($djammsStore.isAuthenticated) {
      goto();
    }
  }
  $$unsubscribe_djammsStore();
  return `${$$result.head += `<!-- HEAD_svelte-1uue077_START -->${$$result.title = `<title>DJAMMS - Digital Jukebox &amp; Media Manager</title>`, ""}<meta name="description" content="Your personal YouTube music video player and media management system"><!-- HEAD_svelte-1uue077_END -->`, ""} <main class="flex items-center justify-center min-h-screen p-4 gradient-background"><div class="relative max-w-4xl mx-auto"> <div class="absolute inset-0 overflow-hidden pointer-events-none" data-svelte-h="svelte-1v1m1hq"><div class="absolute top-10 left-10 w-20 h-20 bg-youtube-red/20 rounded-full blur-xl animate-float"></div> <div class="absolute top-32 right-20 w-16 h-16 bg-music-purple/20 rounded-full blur-xl animate-float" style="animation-delay: 1s;"></div> <div class="absolute bottom-20 left-1/4 w-24 h-24 bg-music-pink/20 rounded-full blur-xl animate-float" style="animation-delay: 2s;"></div></div>  <div class="relative glass-morphism rounded-3xl p-8 md:p-12 text-center"> <div class="mb-8"><div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-youtube-red to-music-purple rounded-2xl shadow-2xl">${validate_component(Play, "Play").$$render($$result, { class: "w-10 h-10 text-white" }, {}, {})}</div> <h1 class="text-5xl md:text-6xl font-bold text-white mb-4" data-svelte-h="svelte-3oow0h"><span class="bg-gradient-to-r from-youtube-red via-music-purple to-music-pink bg-clip-text text-transparent">DJAMMS</span></h1> <p class="text-xl text-gray-300 max-w-2xl mx-auto" data-svelte-h="svelte-1553fh7">Digital Jukebox &amp; Media Management System</p> <p class="text-gray-400 mt-2" data-svelte-h="svelte-zlu16k">Your personal YouTube music video player with multi-window management</p></div>  <div class="grid md:grid-cols-3 gap-6 mb-8"><div class="p-6 bg-white/5 rounded-xl border border-white/10">${validate_component(Music, "Music").$$render(
    $$result,
    {
      class: "w-8 h-8 text-youtube-red mx-auto mb-3"
    },
    {},
    {}
  )} <h3 class="text-white font-semibold mb-2" data-svelte-h="svelte-xd3qw8">Multi-Window Player</h3> <p class="text-gray-400 text-sm" data-svelte-h="svelte-1tsxq4p">Separate video player, queue manager, and playlist library windows</p></div> <div class="p-6 bg-white/5 rounded-xl border border-white/10">${validate_component(Headphones, "Headphones").$$render(
    $$result,
    {
      class: "w-8 h-8 text-music-purple mx-auto mb-3"
    },
    {},
    {}
  )} <h3 class="text-white font-semibold mb-2" data-svelte-h="svelte-1lncqnp">Smart Playlists</h3> <p class="text-gray-400 text-sm" data-svelte-h="svelte-izvcw5">Create, manage, and sync playlists across all your devices</p></div> <div class="p-6 bg-white/5 rounded-xl border border-white/10">${validate_component(Zap, "Zap").$$render(
    $$result,
    {
      class: "w-8 h-8 text-music-pink mx-auto mb-3"
    },
    {},
    {}
  )} <h3 class="text-white font-semibold mb-2" data-svelte-h="svelte-1vq602w">Real-time Sync</h3> <p class="text-gray-400 text-sm" data-svelte-h="svelte-1t5lsx6">Instant synchronization across all connected windows</p></div></div>  <div class="space-y-4"><button ${$djammsStore.isLoading ? "disabled" : ""} class="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-youtube-red to-music-purple hover:from-youtube-red/90 hover:to-music-purple/90 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed">${$djammsStore.isLoading ? `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Signing in...` : `<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>
						Continue with Google`}</button> <p class="text-gray-400 text-sm" data-svelte-h="svelte-1gtjx7m">Sign in to access your personal jukebox and media library</p></div>  <div class="mt-8 pt-6 border-t border-white/10" data-svelte-h="svelte-tz6w7q"><p class="text-gray-500 text-xs">DJAMMS v2.0 • Built with SvelteKit &amp; Appwrite</p></div></div></div></main>`;
});
export {
  Page as default
};
