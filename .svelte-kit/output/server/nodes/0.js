import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.7TRVf0zd.js","_app/immutable/chunks/BdqU9rtY.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/zxdJXzVg.js","_app/immutable/chunks/D5ArTlll.js"];
export const stylesheets = ["_app/immutable/assets/0.B6TD9Lh3.css"];
export const fonts = [];
