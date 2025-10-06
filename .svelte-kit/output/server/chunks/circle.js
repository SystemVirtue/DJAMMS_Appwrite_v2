import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Circle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["circle", { "cx": "12", "cy": "12", "r": "10" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "circle" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Circle as C
};
