import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Play = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["polygon", { "points": "5 3 19 12 5 21 5 3" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "play" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Play as P
};
