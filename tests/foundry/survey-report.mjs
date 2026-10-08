// Summarises a survey run (PMT_SURVEY=1 npm run test:foundry -- survey) as markdown: what pathmuncher
// left for the user across the generated builds, most frequent first.
//   node tests/foundry/survey-report.mjs run.log [more.log ...] > report.md
import fs from "node:fs";

const results = process.argv.slice(2).flatMap((file) => fs.readFileSync(file, "utf8").split("\n"))
  .map((line) => line.match(/# SURVEY (\{.*\})$/)?.[1]).filter(Boolean).map((json) => JSON.parse(json));

/** Counts each key across builds: key -> { count, builds }. */
function tally(entries) {
  const map = new Map();
  for (const [key, build] of entries) {
    const entry = map.get(key) ?? { count: 0, builds: new Set() };
    entry.count++;
    entry.builds.add(build);
    map.set(key, entry);
  }
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
}

function section(title, entries, { limit = 200, intro = "" } = {}) {
  const rows = tally(entries);
  const out = [`## ${title} (${rows.length})`, ""];
  if (intro) out.push(intro, "");
  if (!rows.length) return [...out, "None.", ""].join("\n");
  out.push("| Count | What | Builds |", "|---|---|---|");
  for (const [key, { count, builds }] of rows.slice(0, limit)) {
    const names = [...builds];
    out.push(`| ${count} | ${key.replace(/\|/g, "\\|")} | ${names.slice(0, 4).join(", ")}${names.length > 4 ? ` +${names.length - 4}` : ""} |`);
  }
  return [...out, ""].join("\n");
}

const lines = [
  "# Pathmuncher survey of generated builds",
  "",
  `${results.length} builds. ${results.filter((r) => r.failure).length} failed to import. `
    + `Median import ${results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length / 2)] ?? 0} ms.`,
  "",
  section("Import failures", results.filter((r) => r.failure).map((r) => [r.failure, r.name])),
  section("Prompts the build answers", results.flatMap((r) => r.prompts.filter((p) => p.matched).map((p) => [`${p.item} → ${p.picked}`, r.name])),
    { intro: "pf2e asked although the export names the choice: pathmuncher should have answered these." }),
  section("Prompts the build does not answer", results.flatMap((r) => r.prompts.filter((p) => !p.matched).map((p) => [p.item, r.name])),
    { intro: "pf2e asked and nothing in the export names an option (the test picked the first)." }),
  ...["class", "ancestry", "heritage", "background", "feat", "special", "equipment", "weapon", "armor", "spellcasting", "spell", "ritual", "formula", "familiar"]
    .map((type) => section(`Unmatched: ${type}`, results.flatMap((r) => (r.report[type] ?? []).map((n) => [n, r.name])))),
  section("Choices left unresolved on the actor", results.flatMap((r) => (r.unresolved ?? []).map((u) => [u, r.name])),
    { intro: "A ChoiceSet without a selection after the import (a prompt the user dismissed, or one never raised)." }),
  section("Specials found in other features", results.flatMap((r) => r.described.map((d) => [d, r.name])), { limit: 60 }),
  section("Differences from the build", results.flatMap((r) => r.problems.map((p) => [p.replace(/\[[^\]]*\]/g, "[…]"), r.name]))),
  section("Console errors and warnings", results.flatMap((r) => r.errors.map((e) => [e, r.name]))),
];
process.stdout.write(lines.join("\n"));
