import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Pause = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "4",
        "height": "16",
        "x": "6",
        "y": "4"
      }
    ],
    [
      "rect",
      {
        "width": "4",
        "height": "16",
        "x": "14",
        "y": "4"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "pause" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Skip_back = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["polygon", { "points": "19 20 9 12 19 4 19 20" }],
    [
      "line",
      {
        "x1": "5",
        "x2": "5",
        "y1": "19",
        "y2": "5"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "skip-back" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Skip_forward = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["polygon", { "points": "5 4 15 12 5 20 5 4" }],
    [
      "line",
      {
        "x1": "19",
        "x2": "19",
        "y1": "5",
        "y2": "19"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "skip-forward" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Pause as P,
  Skip_back as S,
  Skip_forward as a
};
