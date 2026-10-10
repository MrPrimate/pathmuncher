// Runs the Foundry integration tests in a live pf2e world through the Chrome DevTools protocol.
//
//   CDP_PORT=9222 FVTT_URL=http://127.0.0.1:30000 FVTT_USER=Gamemaster npm run test:foundry [-- filter]
//
// Needs: a running Foundry world (pf2e) with pathmuncher enabled, and a Chrome started with
// --remote-debugging-port=$CDP_PORT. The runner joins the world as FVTT_USER (a GM without a
// password) if the tab is not already in it, reloads so the current module code is used, then
// evaluates lib.js, every *.test.js file here and the fixtures, and runs the tests one at a time.
// PMT_KEEP=1 keeps the test actors for inspection. PMT_SURVEY=1 runs survey.test.js over the
// generated builds. PMT_UPDATE_SNAPSHOTS=1 rewrites the snapshots in fixtures/snapshots from this
// run, and PMT_SNAPSHOT_ALL=1 snapshots every generated build. PMT_CHUNK=2/4 runs one quarter of the
// matching tests (every 4th, from the 2nd), to split long runs. See tests/README.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CDP_PORT ?? 9222);
const FVTT_URL = (process.env.FVTT_URL ?? "http://127.0.0.1:30000").replace(/\/$/, "");
const FVTT_USER = process.env.FVTT_USER ?? "Gamemaster";
const filter = process.argv[2] ?? "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
let target = targets.find((t) => t.type === "page" && t.url.startsWith(FVTT_URL)) ?? targets.find((t) => t.type === "page");
if (!target) target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
const pageErrors = [];
let listening = false;
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (listening && m.method === "Runtime.exceptionThrown") {
    pageErrors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? "").split("\n")[0]);
  }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression, timeout = 60000) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
  }
  return r.result?.result?.value;
};
const waitReady = async () => {
  for (let i = 0; i < 120; i++) {
    const state = await evaluate(`({ path: location.pathname, ready: !!globalThis.game?.ready })`).catch(() => null);
    if (state?.path === "/game" && state.ready) return true;
    if (state?.path === "/join") return false;
    await sleep(1000);
  }
  throw new Error("Foundry did not become ready");
};

await send("Page.enable");
await send("Runtime.enable");

// join (or reload, so the module code under test is current)
await send("Page.navigate", { url: `${FVTT_URL}/game` });
await sleep(3000);
if (!(await waitReady())) {
  await evaluate(`(() => {
    const user = ${JSON.stringify(FVTT_USER)};
    const select = document.querySelector("select[name=userid]");
    if (select) select.value = [...select.options].find((o) => o.textContent.trim() === user)?.value;
    else document.querySelector("#join-username").value = user;
    const form = (select ?? document.querySelector("#join-username")).closest("form");
    form.querySelector('button[name="join"], button[type="submit"]').click();
  })()`);
  await sleep(3000);
  if (!(await waitReady())) throw new Error(`could not join ${FVTT_URL} as ${FVTT_USER}`);
}
await sleep(2000);

const env = await evaluate(`({
  system: game.system.id + " " + game.system.version,
  core: game.version,
  pathmuncher: game.modules.get("pathmuncher")?.active ? game.modules.get("pathmuncher").version : null,
  user: game.user.name,
  isGM: game.user.isGM,
})`);
console.log(`# ${env.user} in ${FVTT_URL}: Foundry ${env.core}, ${env.system}, pathmuncher ${env.pathmuncher}`);
if (!env.pathmuncher || !env.isGM) throw new Error("pathmuncher must be active and the user a GM");

const fixtureDir = path.join(here, "../fixtures/pathbuilder");
const fixtures = Object.fromEntries(fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".json"))
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(fixtureDir, f), "utf8"))]));
await evaluate(`globalThis.__pmtFixtures = ${JSON.stringify(fixtures)}; globalThis.__pmtKeep = ${!!process.env.PMT_KEEP};`);
// the generated builds (pmt.generated), one evaluate each to keep them small; PMT_SURVEY=1 surveys them all
const generatedDir = path.join(fixtureDir, "generated");
await evaluate(`globalThis.__pmtGenerated = {}; globalThis.__pmtSurvey = ${!!process.env.PMT_SURVEY};`);
if (fs.existsSync(generatedDir)) {
  for (const f of fs.readdirSync(generatedDir).filter((f) => f.endsWith(".json")).sort()) {
    await evaluate(`globalThis.__pmtGenerated[${JSON.stringify(f.replace(/\.json$/, ""))}] = ${fs.readFileSync(path.join(generatedDir, f), "utf8")};`);
  }
}
// the edge-case builds (pmt.edge): older generated builds, made without Pathbuilder's rules, that tests use
// for input a player could produce but the legal generated set never does
const edgeDir = path.join(fixtureDir, "edge");
await evaluate(`globalThis.__pmtEdge = {};`);
if (fs.existsSync(edgeDir)) {
  for (const f of fs.readdirSync(edgeDir).filter((f) => f.endsWith(".json")).sort()) {
    await evaluate(`globalThis.__pmtEdge[${JSON.stringify(f.replace(/\.json$/, ""))}] = ${fs.readFileSync(path.join(edgeDir, f), "utf8")};`);
  }
}
// the saved snapshots, by fixture name ("142926-wizard20", "generated/cleric-01")
const snapshotDir = path.join(here, "../fixtures/snapshots");
const snapshotFiles = (dir, prefix = "") => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [])
  .flatMap((e) => (e.isDirectory()
    ? snapshotFiles(path.join(dir, e.name), `${prefix}${e.name}/`)
    : e.name.endsWith(".json") ? [[`${prefix}${e.name.replace(/\.json$/, "")}`, path.join(dir, e.name)]] : []));
const snapshots = Object.fromEntries(snapshotFiles(snapshotDir).map(([name, file]) => [name, JSON.parse(fs.readFileSync(file, "utf8"))]));
await evaluate(`globalThis.__pmtSnapshots = ${JSON.stringify(snapshots)};
  globalThis.__pmtUpdateSnapshots = ${!!process.env.PMT_UPDATE_SNAPSHOTS};
  globalThis.__pmtSnapshotAll = ${!!process.env.PMT_SNAPSHOT_ALL};`);
await evaluate(fs.readFileSync(path.join(here, "lib.js"), "utf8"));
for (const file of fs.readdirSync(here).filter((f) => f.endsWith(".test.js")).sort()) {
  await evaluate(fs.readFileSync(path.join(here, file), "utf8"));
}

listening = true;
const chunk = process.env.PMT_CHUNK ?? null;
if (chunk && !(/^\d+\/\d+$/).test(chunk)) throw new Error(`PMT_CHUNK should look like 2/4, not ${chunk}`);
const results = await evaluate(`pmt.run(${JSON.stringify(filter)}, ${JSON.stringify(chunk)})`, 3600000);
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "ok" : "not ok"} - ${r.name} (${r.ms} ms)`);
  if (!r.ok) console.log(r.error.split("\n").map((l) => `    ${l}`).join("\n"));
  for (const line of r.log) console.log(`    # ${line}`);
}
if (process.env.PMT_UPDATE_SNAPSHOTS) {
  const taken = await evaluate("globalThis.__pmtSnapshotResults ?? {}", 600000);
  for (const [name, snapshot] of Object.entries(taken)) {
    const file = path.join(snapshotDir, `${name}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  console.log(`# wrote ${Object.keys(taken).length} snapshots to ${path.relative(process.cwd(), snapshotDir)}`);
}
if (pageErrors.length) console.log(`# uncaught page errors:\n${pageErrors.map((e) => `#   ${e}`).join("\n")}`);
console.log(`# ${results.length - failed}/${results.length} passed`);
ws.close();
process.exit(failed || !results.length ? 1 : 0);
