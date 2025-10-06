import { c as create_ssr_component } from "../../chunks/ssr.js";
import "../../chunks/djamms.js";
import "../../chunks/appwrite.js";
const css = {
  code: "body{margin:0;padding:0;font-family:'Roboto', 'Arial', sans-serif}",
  map: `{"version":3,"file":"+layout.svelte","sources":["+layout.svelte"],"sourcesContent":["<script lang=\\"ts\\">import \\"../app.postcss\\";\\nimport { onMount } from \\"svelte\\";\\nimport { djammsStore } from \\"$lib/stores/djamms\\";\\nimport { account } from \\"$lib/utils/appwrite\\";\\nexport const data = void 0;\\nonMount(() => {\\n  djammsStore.initializeAuth();\\n});\\n<\/script>\\n\\n<div class=\\"relative flex flex-col h-screen overflow-hidden bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple\\">\\n\\t<slot />\\n</div>\\n\\n<style>\\n\\t:global(body) {\\n\\t\\tmargin: 0;\\n\\t\\tpadding: 0;\\n\\t\\tfont-family: 'Roboto', 'Arial', sans-serif;\\n\\t}\\n</style>"],"names":[],"mappings":"AAeS,IAAM,CACb,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,CAAC,CACV,WAAW,CAAE,QAAQ,CAAC,CAAC,OAAO,CAAC,CAAC,UACjC"}`
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const data = void 0;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) ;
  $$result.css.add(css);
  return `<div class="relative flex flex-col h-screen overflow-hidden bg-gradient-to-br from-youtube-dark via-youtube-darker to-music-purple">${slots.default ? slots.default({}) : ``} </div>`;
});
export {
  Layout as default
};
