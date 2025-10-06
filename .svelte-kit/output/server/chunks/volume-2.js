import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Volume_2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "polygon",
      {
        "points": "11 5 6 9 2 9 2 15 6 15 11 19 11 5"
      }
    ],
    ["path", { "d": "M15.54 8.46a5 5 0 0 1 0 7.07" }],
    ["path", { "d": "M19.07 4.93a10 10 0 0 1 0 14.14" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "volume-2" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Volume_2 as V
};
