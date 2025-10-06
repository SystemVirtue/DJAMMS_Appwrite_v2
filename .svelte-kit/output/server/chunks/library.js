import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Chevron_down = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "chevron-down" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Library = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "m16 6 4 14" }],
    ["path", { "d": "M12 6v14" }],
    ["path", { "d": "M8 8v12" }],
    ["path", { "d": "M4 4v16" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "library" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Chevron_down as C,
  Library as L
};
