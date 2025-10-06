import { Client, Account, Databases, Functions } from "appwrite";
const client = new Client();
new Account(client);
const rawDatabases = new Databases(client);
new Functions(client);
function deepRemovePreferences(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    const copy = JSON.parse(JSON.stringify(obj));
    (function recurse(o) {
      if (!o || typeof o !== "object") return;
      if (Object.prototype.hasOwnProperty.call(o, "preferences")) {
        delete o.preferences;
      }
      for (const k of Object.keys(o)) {
        if (o[k] && typeof o[k] === "object") recurse(o[k]);
      }
    })(copy);
    return copy;
  } catch (e) {
    if (obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "preferences")) {
      const shallow = { ...obj };
      delete shallow.preferences;
      return shallow;
    }
    return obj;
  }
}
const databases = new Proxy(rawDatabases, {
  get(target, prop, receiver) {
    if (prop === "createDocument" || prop === "updateDocument") {
      const orig = target[prop];
      return function(...args) {
        if (args.length >= 4 && args[3] && typeof args[3] === "object") {
          args[3] = deepRemovePreferences(args[3]);
        }
        return orig.apply(target, args);
      };
    }
    if (prop === "getDocument") {
      const orig = target[prop];
      return async function(...args) {
        const res = await orig.apply(target, args);
        try {
          return deepRemovePreferences(res);
        } catch (e) {
          return res;
        }
      };
    }
    if (prop === "listDocuments" || prop === "list") {
      const orig = target[prop];
      return async function(...args) {
        const res = await orig.apply(target, args);
        try {
          if (res && Array.isArray(res.documents)) {
            res.documents = res.documents.map((d) => deepRemovePreferences(d));
          }
          return res;
        } catch (e) {
          return res;
        }
      };
    }
    const value = target[prop];
    if (typeof value === "function") return value.bind(target);
    return value;
  }
});
const DATABASE_ID = "68cc92d30024e1b6eeb6";
export {
  DATABASE_ID as D,
  databases as d
};
