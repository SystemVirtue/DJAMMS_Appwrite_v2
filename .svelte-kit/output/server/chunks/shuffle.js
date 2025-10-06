import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Repeat = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "m17 2 4 4-4 4" }],
    ["path", { "d": "M3 11v-1a4 4 0 0 1 4-4h14" }],
    ["path", { "d": "m7 22-4-4 4-4" }],
    ["path", { "d": "M21 13v1a4 4 0 0 1-4 4H3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "repeat" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Shuffle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"
      }
    ],
    ["path", { "d": "m18 2 4 4-4 4" }],
    ["path", { "d": "M2 6h1.9c1.5 0 2.9.9 3.6 2.2" }],
    [
      "path",
      {
        "d": "M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"
      }
    ],
    ["path", { "d": "m18 14 4 4-4 4" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "shuffle" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Repeat as R,
  Shuffle as S
};
