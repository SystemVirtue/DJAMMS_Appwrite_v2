import { c as create_ssr_component, e as escape } from "../../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "../../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let errorMsg = "";
  return `${$$result.head += `<!-- HEAD_svelte-j1zb2_START -->${$$result.title = `<title>Authentication Error</title>`, ""}<!-- HEAD_svelte-j1zb2_END -->`, ""} <div class="flex flex-col items-center justify-center min-h-screen"><h1 class="text-2xl font-bold mb-4" data-svelte-h="svelte-s1loau">Authentication Error</h1> <p class="text-red-500">${escape(errorMsg)}</p> <a href="/" class="mt-6 text-blue-600 underline" data-svelte-h="svelte-rtnyck">Back to Login</a></div>`;
});
export {
  Page as default
};
