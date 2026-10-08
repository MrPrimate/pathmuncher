// Minimal Foundry globals so the module's pure logic can be imported and run under `node --test`.
// Only what is touched at import time or by the functions under test; extend as tests need more.

globalThis.window = globalThis;

const getProperty = (object, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), object);

const setProperty = (object, key, value) => {
  const parts = key.split(".");
  const last = parts.pop();
  let target = object;
  for (const part of parts) {
    if (typeof target[part] !== "object" || target[part] === null) target[part] = {};
    target = target[part];
  }
  target[last] = value;
  return true;
};

globalThis.foundry = {
  utils: {
    debounce: (fn) => fn,
    deepClone: (value) => structuredClone(value),
    duplicate: (value) => JSON.parse(JSON.stringify(value)),
    getProperty,
    setProperty,
    hasProperty: (object, key) => getProperty(object, key) !== undefined,
    randomID: () => Math.random().toString(36).slice(2, 18).padEnd(16, "0"),
  },
};

globalThis.game = {
  i18n: {
    localize: (key) => key,
    format: (key, data) => `${key} ${JSON.stringify(data)}`,
  },
  settings: { get: () => undefined },
  system: { id: "pf2e" },
  modules: new Map(),
  packs: new Map(),
  // a simpler sluggify than the system's: enough for the names the tests use
  pf2e: {
    system: {
      sluggify: (text, { camel = null } = {}) => {
        const slug = String(text).toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return camel === "dromedary" ? slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()) : slug;
      },
    },
  },
};

const notifications = [];
globalThis.ui = {
  notifications: {
    log: notifications,
    info: (message) => notifications.push({ type: "info", message }),
    warn: (message) => notifications.push({ type: "warn", message }),
    error: (message) => notifications.push({ type: "error", message }),
  },
};
