import { c as create_ssr_component, v as validate_component, a as subscribe, o as onDestroy, e as escape } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
import { d as djammsStore, c as currentTrack, v as venueStatus } from "../../../chunks/djamms.js";
import { I as InstanceIds } from "../../../chunks/idGenerator.js";
import "../../../chunks/appwrite.js";
import { L as Log_out, S as Server, A as Activity, a as Check_circle, C as Cpu } from "../../../chunks/server.js";
import { M as Monitor, S as Settings } from "../../../chunks/settings.js";
import { W as Wifi } from "../../../chunks/wifi.js";
import { W as Wifi_off } from "../../../chunks/wifi-off.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { V as Volume_2 } from "../../../chunks/volume-2.js";
import { P as Play } from "../../../chunks/play.js";
import { M as Music } from "../../../chunks/music.js";
const Eye = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
      }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "eye" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Globe = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    [
      "path",
      {
        "d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
      }
    ],
    ["path", { "d": "M2 12h20" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "globe" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Video = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "m22 8-6 4 6 4V8Z" }],
    [
      "rect",
      {
        "width": "14",
        "height": "12",
        "x": "2",
        "y": "6",
        "rx": "2",
        "ry": "2"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "video" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const X_circle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "m15 9-6 6" }],
    ["path", { "d": "m9 9 6 6" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "x-circle" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
function getActiveWindowsCount() {
  return 1;
}
function getStatusColor(status) {
  switch (status) {
    case "connected":
    case "authenticated":
    case "online":
    case "good":
    case "sufficient":
      return "text-green-400 bg-green-400/10 border-green-400/20";
    case "disconnected":
    case "unauthenticated":
    case "offline":
    case "poor":
    case "limited":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "warning":
    case "fair":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}
function getResourceColor(percentage) {
  if (percentage > 80) return "text-red-400";
  if (percentage > 60) return "text-yellow-400";
  return "text-green-400";
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let playerStatus;
  let serverStatus;
  let instanceStatus;
  let networkStatus;
  let systemResources;
  let $djammsStore, $$unsubscribe_djammsStore;
  let $currentTrack, $$unsubscribe_currentTrack;
  let $venueStatus, $$unsubscribe_venueStatus;
  $$unsubscribe_djammsStore = subscribe(djammsStore, (value) => $djammsStore = value);
  $$unsubscribe_currentTrack = subscribe(currentTrack, (value) => $currentTrack = value);
  $$unsubscribe_venueStatus = subscribe(venueStatus, (value) => $venueStatus = value);
  let instanceId = InstanceIds.dashboard();
  let selectedLogFilter = "all";
  let activityLogs = [];
  let startTime = Date.now();
  function getUptime() {
    const uptime = Date.now() - startTime;
    const minutes = Math.floor(uptime / 6e4);
    const seconds = Math.floor(uptime % 6e4 / 1e3);
    return `${minutes}m ${seconds}s`;
  }
  onDestroy(() => {
    console.log("🎵 DJAMMS Dashboard: Disconnecting...");
    addLog("info", "system", "DJAMMS Dashboard disconnecting");
  });
  function addLog(level, source, message) {
    const newLog = {
      timestamp: /* @__PURE__ */ (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      level,
      source,
      message
    };
    activityLogs = [newLog, ...activityLogs].slice(0, 100);
  }
  playerStatus = {
    status: $djammsStore.playerState.status,
    isConnected: $venueStatus.isConnected,
    currentTrack: $currentTrack?.title || "None",
    position: $djammsStore.playerState.position,
    duration: $currentTrack?.duration || 0
  };
  serverStatus = {
    appwrite: "connected",
    // TODO: Implement actual server health check
    database: "connected",
    realtime: $djammsStore.connectionStatus === "connected" ? "connected" : "disconnected",
    auth: $djammsStore.isAuthenticated ? "authenticated" : "unauthenticated"
  };
  instanceStatus = {
    id: instanceId.slice(-8),
    initialized: true,
    activeWindows: getActiveWindowsCount(),
    uptime: getUptime()
  };
  networkStatus = {
    connection: navigator.onLine ? "online" : "offline",
    latency: "good",
    // TODO: Implement ping test
    bandwidth: "sufficient"
  };
  systemResources = {
    cpu: Math.floor(Math.random() * 30 + 10),
    // 10-40%
    memory: Math.floor(Math.random() * 20 + 30),
    // 30-50%
    storage: Math.floor(Math.random() * 10 + 60)
  };
  activityLogs.filter((log) => {
    switch (selectedLogFilter) {
      case "all":
        return true;
      case "player-queue":
        return ["player", "queue-manager"].includes(log.source);
      case "jukebox-kiosk":
        return log.source === "jukebox-kiosk";
      case "admin-console":
        return log.source === "admin-console";
      case "errors":
        return log.level === "error";
      default:
        return true;
    }
  });
  $$unsubscribe_djammsStore();
  $$unsubscribe_currentTrack();
  $$unsubscribe_venueStatus();
  return `<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"> <header class="bg-black/20 backdrop-blur-sm border-b border-white/10"><div class="max-w-7xl mx-auto px-6 py-4"><div class="flex items-center justify-between"><div class="flex items-center space-x-3" data-svelte-h="svelte-tfz7tc"><div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center"><span class="text-white font-bold text-sm">DJ</span></div> <div><h1 class="text-xl font-bold text-white">DJAMMS Control Center</h1> <p class="text-sm text-gray-400">Digital Jukebox and Media Management System</p></div></div> <div class="flex items-center space-x-4"> <div class="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30"><span class="text-sm text-purple-300">Instance: ${escape(instanceStatus.id)}</span></div>  ${$djammsStore.isAuthenticated ? `<div class="flex items-center space-x-3"><span class="text-sm text-gray-300">Welcome, ${escape($djammsStore.currentUser?.username || $djammsStore.currentUser?.email)}</span> <button class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Logout">${validate_component(Log_out, "LogOut").$$render($$result, { class: "w-5 h-5" }, {}, {})}</button></div>` : ``}</div></div></div></header> <div class="max-w-7xl mx-auto p-6"> <div class="h-[50vh] mb-6"><div class="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 h-full"><div class="p-6 border-b border-white/10" data-svelte-h="svelte-1ahdw49"><h2 class="text-2xl font-bold text-white">System Status</h2> <p class="text-gray-400 mt-1">Real-time monitoring of all DJAMMS components</p></div> <div class="p-6 h-[calc(100%-80px)] overflow-y-auto"> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"> <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-1662csw">PLAYER STATUS</h3> ${validate_component(Monitor, "Monitor").$$render($$result, { class: "w-4 h-4 text-blue-400" }, {}, {})}</div> <div class="space-y-2"><div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-1izb756">Status:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(playerStatus.status), true)}">${escape(playerStatus.status.toUpperCase())}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-1n295ek">Connection:</span> <div class="flex items-center space-x-1">${playerStatus.isConnected ? `${validate_component(Wifi, "Wifi").$$render($$result, { class: "w-3 h-3 text-green-400" }, {}, {})}` : `${validate_component(Wifi_off, "WifiOff").$$render($$result, { class: "w-3 h-3 text-red-400" }, {}, {})}`} <span class="text-xs text-white">${escape(playerStatus.isConnected ? "Connected" : "Disconnected")}</span></div></div> ${playerStatus.currentTrack !== "None" ? `<div class="mt-2 pt-2 border-t border-slate-600/50"><p class="text-xs text-gray-300 truncate">${escape(playerStatus.currentTrack)}</p></div>` : ``}</div></div>  <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-1awuq0a">SERVER STATUS</h3> ${validate_component(Server, "Server").$$render($$result, { class: "w-4 h-4 text-green-400" }, {}, {})}</div> <div class="space-y-2"><div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-lppk06">Appwrite:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(serverStatus.appwrite), true)}">${escape(serverStatus.appwrite.toUpperCase())}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-xbkz6t">Database:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(serverStatus.database), true)}">${escape(serverStatus.database.toUpperCase())}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-13xed61">Realtime:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(serverStatus.realtime), true)}">${escape(serverStatus.realtime.toUpperCase())}</span></div></div></div>  <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-1ecj08i">INSTANCE STATUS</h3> ${validate_component(Activity, "Activity").$$render($$result, { class: "w-4 h-4 text-purple-400" }, {}, {})}</div> <div class="space-y-2"><div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-clbtqs">Instance ID:</span> <span class="text-xs text-white font-mono">${escape(instanceStatus.id)}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-48om8m">Initialized:</span> <div class="flex items-center space-x-1">${instanceStatus.initialized ? `${validate_component(Check_circle, "CheckCircle").$$render($$result, { class: "w-3 h-3 text-green-400" }, {}, {})}` : `${validate_component(X_circle, "XCircle").$$render($$result, { class: "w-3 h-3 text-red-400" }, {}, {})}`} <span class="text-xs text-white">${escape(instanceStatus.initialized ? "Yes" : "No")}</span></div></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-628m7c">Uptime:</span> <span class="text-xs text-white">${escape(instanceStatus.uptime)}</span></div></div></div>  <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-1du07sv">NETWORK STATUS</h3> ${validate_component(Globe, "Globe").$$render($$result, { class: "w-4 h-4 text-blue-400" }, {}, {})}</div> <div class="space-y-2"><div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-1n295ek">Connection:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(networkStatus.connection), true)}">${escape(networkStatus.connection.toUpperCase())}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-1y4wc8a">Latency:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(networkStatus.latency), true)}">${escape(networkStatus.latency.toUpperCase())}</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400" data-svelte-h="svelte-dqas7b">Bandwidth:</span> <span class="${"text-xs px-2 py-1 rounded " + escape(getStatusColor(networkStatus.bandwidth), true)}">${escape(networkStatus.bandwidth.toUpperCase())}</span></div></div></div></div>  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"> <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-1lwjx8b">SYSTEM RESOURCES</h3> ${validate_component(Cpu, "Cpu").$$render($$result, { class: "w-4 h-4 text-orange-400" }, {}, {})}</div> <div class="space-y-3"><div><div class="flex justify-between items-center mb-1"><span class="text-xs text-gray-400" data-svelte-h="svelte-1vvzx4f">CPU Usage:</span> <span class="${"text-xs font-mono " + escape(getResourceColor(systemResources.cpu), true)}">${escape(systemResources.cpu)}%</span></div> <div class="w-full bg-gray-700 rounded-full h-2"><div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" style="${"width: " + escape(systemResources.cpu, true) + "%"}"></div></div></div> <div><div class="flex justify-between items-center mb-1"><span class="text-xs text-gray-400" data-svelte-h="svelte-c31pvk">Memory Usage:</span> <span class="${"text-xs font-mono " + escape(getResourceColor(systemResources.memory), true)}">${escape(systemResources.memory)}%</span></div> <div class="w-full bg-gray-700 rounded-full h-2"><div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" style="${"width: " + escape(systemResources.memory, true) + "%"}"></div></div></div> <div><div class="flex justify-between items-center mb-1"><span class="text-xs text-gray-400" data-svelte-h="svelte-jp86nm">Storage Usage:</span> <span class="${"text-xs font-mono " + escape(getResourceColor(systemResources.storage), true)}">${escape(systemResources.storage)}%</span></div> <div class="w-full bg-gray-700 rounded-full h-2"><div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-300" style="${"width: " + escape(systemResources.storage, true) + "%"}"></div></div></div></div></div>  <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-m04by2">AUDIO/VIDEO OUTPUT</h3> <div class="flex space-x-1">${validate_component(Volume_2, "Volume2").$$render($$result, { class: "w-4 h-4 text-green-400" }, {}, {})} ${validate_component(Video, "Video").$$render($$result, { class: "w-4 h-4 text-blue-400" }, {}, {})}</div></div> <div class="space-y-2" data-svelte-h="svelte-1n2euh5"><div class="flex justify-between items-center"><span class="text-xs text-gray-400">Audio Device:</span> <span class="text-xs text-white">Default Output</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400">Video Output:</span> <span class="text-xs text-white">Primary Display</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400">Volume Level:</span> <span class="text-xs text-white">85%</span></div> <div class="flex justify-between items-center"><span class="text-xs text-gray-400">Quality:</span> <span class="text-xs px-2 py-1 rounded text-green-400 bg-green-400/10 border-green-400/20">HD</span></div></div></div></div>  <div class="bg-slate-800/50 rounded-lg border border-slate-700/50"><div class="flex items-center justify-between p-4 border-b border-slate-700/50"><h3 class="text-sm font-semibold text-white" data-svelte-h="svelte-gl6fmd">ACTIVITY LOGS</h3> <div class="flex items-center space-x-3"><select class="text-xs bg-slate-700 text-white rounded px-2 py-1 border border-slate-600"><option value="all" data-svelte-h="svelte-1owtbcz">All Activity</option><option value="player-queue" data-svelte-h="svelte-1po8sbd">Player &amp; Queue-Manager</option><option value="jukebox-kiosk" data-svelte-h="svelte-1ozh83i">Jukebox-Kiosk</option><option value="admin-console" data-svelte-h="svelte-1g3s9i4">Admin-Console</option><option value="errors" data-svelte-h="svelte-1drd6hm">Errors and Faults</option></select> <button class="p-1 text-gray-400 hover:text-white transition-colors" title="${escape("Show", true) + " Activity Logs"}">${`${validate_component(Eye, "Eye").$$render($$result, { class: "w-4 h-4" }, {}, {})}`}</button></div></div> ${``}</div></div></div></div>  <div class="h-[40vh]"><div class="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 h-full"><div class="p-6 border-b border-white/10" data-svelte-h="svelte-1a6wpfb"><h2 class="text-2xl font-bold text-white">Application Launcher</h2> <p class="text-gray-400 mt-1">Open DJAMMS components and manage system endpoints</p></div> <div class="p-6 h-[calc(100%-80px)] flex items-center"><div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"> <div class="group relative"><button ${""} class="w-full h-32 bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-sm rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600/20 disabled:border-gray-500/20"><div class="p-6 h-full flex flex-col items-center justify-center">${`${validate_component(Play, "Play").$$render(
    $$result,
    {
      class: "w-12 h-12 text-blue-400 mb-3 group-hover:text-blue-300 transition-colors"
    },
    {},
    {}
  )}`} <h3 class="text-lg font-semibold text-white mb-2">${escape("Open Video Player")}</h3> <div class="text-sm text-center">${`${`<span class="text-gray-400" data-svelte-h="svelte-14jh03h">No Active Player</span>`}`}</div></div></button></div>  <div class="group"><button class="w-full h-32 bg-gradient-to-br from-purple-600/20 to-purple-700/20 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300"><div class="p-6 h-full flex flex-col items-center justify-center">${validate_component(Settings, "Settings").$$render(
    $$result,
    {
      class: "w-12 h-12 text-purple-400 mb-3 group-hover:text-purple-300 transition-colors"
    },
    {},
    {}
  )} <h3 class="text-lg font-semibold text-white mb-2" data-svelte-h="svelte-sbb0tf">Open Admin Dashboard</h3> <span class="text-sm text-gray-400" data-svelte-h="svelte-wwxxuo">System configuration and control</span></div></button></div>  <div class="group"><button class="w-full h-32 bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-sm rounded-xl border border-green-500/20 hover:border-green-400/40 transition-all duration-300"><div class="p-6 h-full flex flex-col items-center justify-center">${validate_component(Music, "Music").$$render(
    $$result,
    {
      class: "w-12 h-12 text-green-400 mb-3 group-hover:text-green-300 transition-colors"
    },
    {},
    {}
  )} <h3 class="text-lg font-semibold text-white mb-2" data-svelte-h="svelte-gk9imw">Open Jukebox-Kiosk</h3> <span class="text-sm text-gray-400" data-svelte-h="svelte-ftezdb">Public music request interface</span></div></button></div></div></div></div></div></div></div>`;
});
export {
  Page as default
};
