import { c as create_ssr_component, v as validate_component } from "./ssr.js";
import { I as Icon } from "./Icon.js";
const Database = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "ellipse",
      {
        "cx": "12",
        "cy": "5",
        "rx": "9",
        "ry": "3"
      }
    ],
    ["path", { "d": "M3 5V19A9 3 0 0 0 21 19V5" }],
    ["path", { "d": "M3 12A9 3 0 0 0 21 12" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "database" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const List_music = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M21 15V6" }],
    [
      "path",
      {
        "d": "M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      }
    ],
    ["path", { "d": "M12 12H3" }],
    ["path", { "d": "M16 6H3" }],
    ["path", { "d": "M12 18H3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "list-music" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Palette = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "circle",
      {
        "cx": "13.5",
        "cy": "6.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "17.5",
        "cy": "10.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "8.5",
        "cy": "7.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "6.5",
        "cy": "12.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "path",
      {
        "d": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "palette" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Rotate_ccw = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
      }
    ],
    ["path", { "d": "M3 3v5h5" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "rotate-ccw" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Save = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
      }
    ],
    ["polyline", { "points": "17 21 17 13 7 13 7 21" }],
    ["polyline", { "points": "7 3 7 8 15 8" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "save" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
export {
  Database as D,
  List_music as L,
  Palette as P,
  Rotate_ccw as R,
  Save as S
};
