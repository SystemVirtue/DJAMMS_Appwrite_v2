export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["demo-sync.js","demo.html","favicon.png","icon.png","window-demo.html"]),
	mimeTypes: {".js":"text/javascript",".html":"text/html",".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.DoYvCxuT.js",app:"_app/immutable/entry/app.BhGdbi9e.js",imports:["_app/immutable/entry/start.DoYvCxuT.js","_app/immutable/chunks/BU5DpWBZ.js","_app/immutable/chunks/BdqU9rtY.js","_app/immutable/chunks/CvOGTjSd.js","_app/immutable/chunks/D5ArTlll.js","_app/immutable/entry/app.BhGdbi9e.js","_app/immutable/chunks/BdqU9rtY.js","_app/immutable/chunks/IHki7fMi.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/adminconsole",
				pattern: /^\/adminconsole\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/admin/user-sync",
				pattern: /^\/api\/admin\/user-sync\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/user-sync/_server.ts.js'))
			},
			{
				id: "/api/playlists",
				pattern: /^\/api\/playlists\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/playlists/_server.ts.js'))
			},
			{
				id: "/api/ui-command",
				pattern: /^\/api\/ui-command\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ui-command/_server.ts.js'))
			},
			{
				id: "/api/venues",
				pattern: /^\/api\/venues\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/venues/_server.ts.js'))
			},
			{
				id: "/auth/error",
				pattern: /^\/auth\/error\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/djamms-dashboard",
				pattern: /^\/djamms-dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/jukebox-kiosk",
				pattern: /^\/jukebox-kiosk\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/playlistlibrary",
				pattern: /^\/playlistlibrary\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/queuemanager",
				pattern: /^\/queuemanager\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/videoplayer",
				pattern: /^\/videoplayer\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
