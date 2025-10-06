import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.Dnn9u2Mv.js","_app/immutable/chunks/BdqU9rtY.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/BU5DpWBZ.js","_app/immutable/chunks/CvOGTjSd.js","_app/immutable/chunks/D5ArTlll.js","_app/immutable/chunks/zxdJXzVg.js","_app/immutable/chunks/OiUjXaK0.js","_app/immutable/chunks/Dp8WnmVE.js","_app/immutable/chunks/V5CP_TY7.js","_app/immutable/chunks/Amyys99I.js"];
export const stylesheets = [];
export const fonts = [];
