import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Wifi = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M12 20h.01" }],
    ["path", { "d": "M2 8.82a15 15 0 0 1 20 0" }],
    ["path", { "d": "M5 12.859a10 10 0 0 1 14 0" }],
    ["path", { "d": "M8.5 16.429a5 5 0 0 1 7 0" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "wifi" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Wifi as W
};
