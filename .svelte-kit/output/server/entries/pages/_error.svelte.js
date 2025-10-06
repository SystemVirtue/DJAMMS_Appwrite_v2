import { g as getContext, c as create_ssr_component, a as subscribe, v as validate_component, e as escape } from "../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
import { A as Alert_triangle } from "../../chunks/alert-triangle.js";
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
const Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const params = {};
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) $$bindings.params(params);
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-oxtusn_START -->${$$result.title = `<title>Error - DJAMMS</title>`, ""}<!-- HEAD_svelte-oxtusn_END -->`, ""} <main class="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-pink text-white"><div class="max-w-md text-center"><div class="w-20 h-20 mx-auto mb-6 bg-red-600/20 rounded-full flex items-center justify-center">${validate_component(Alert_triangle, "AlertTriangle").$$render($$result, { class: "w-10 h-10 text-red-400" }, {}, {})}</div> <h1 class="text-3xl font-bold mb-4" data-svelte-h="svelte-z9lah2">Something went wrong</h1> <p class="text-gray-400 mb-6" data-svelte-h="svelte-1jny686">We encountered an error while loading this page.</p> <div class="space-y-3" data-svelte-h="svelte-8p7w6o"><a href="/dashboard" class="inline-block px-6 py-3 bg-gradient-to-r from-music-purple to-purple-700 text-white rounded-full font-medium hover:shadow-lg transition-all">Return to Dashboard</a> <br> <a href="/" class="inline-block px-4 py-2 text-gray-400 hover:text-white transition-colors">Go Home</a></div> ${$page.error ? `<details class="mt-8 p-4 bg-red-600/10 rounded-lg border border-red-600/20 text-left"><summary class="cursor-pointer text-red-400 font-medium" data-svelte-h="svelte-i20mja">Error Details</summary> <pre class="mt-2 text-xs text-gray-300 overflow-auto">${escape($page.error.message)}</pre></details>` : ``}</div></main>`;
});
export {
  Error$1 as default
};
