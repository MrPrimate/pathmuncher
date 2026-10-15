// Reading every Pathbuilder export the tests have into parsed entries, without Foundry.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BuildParser } from "../../src/app/BuildParser.js";
import { FeatureNames } from "../../src/app/FeatureNames.js";
import { ParsedEntry } from "../../src/app/ParsedEntry.js";
import { Seasoning } from "../../src/app/Seasoning.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/pathbuilder");
const exports = [fixtureDir, path.join(fixtureDir, "generated"), path.join(fixtureDir, "edge")].flatMap((dir) => fs.readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [path.relative(fixtureDir, path.join(dir, f)), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]));

/** Parses a build as an import does, with the build's names but nothing from Foundry. */
function parse(build) {
  const source = BuildParser.normaliseSource(structuredClone(build));
  const names = new FeatureNames({ className: source.class, ancestry: source.ancestry, heritage: source.heritage });
  const pm = {
    source,
    parsed: { specials: [], feats: [], equipment: [], armor: [], weapons: [] },
    getFoundryFeatureName: (pbName) => names.foundryName(pbName),
  };
  const parser = new BuildParser(pm);
  parser.nameMap();
  parser.fixUps();
  return pm.parsed;
}

describe("BuildParser", () => {
  it("has the exports to read", () => {
    assert.ok(exports.length > 200, `${exports.length} exports`);
  });

  for (const [name, exportJson] of exports) {
    it(`reads ${name}`, () => {
      const build = BuildParser.getBuildFromJson(exportJson);
      assert.ok(build, "a Pathbuilder build");
      const parsed = parse(build);
      const entries = Object.values(parsed).flat();
      assert.ok(entries.length > 0, "entries");
      for (const entry of entries) {
        assert.ok(entry instanceof ParsedEntry, `${entry.name} is a ParsedEntry`);
        assert.ok(entry.name || entry.foundryName || entry.pbName, "every entry has a name");
      }
      const named = new Set(parsed.feats.map((f) => f.originalName));
      for (const [feat] of build.feats.filter(([f]) => f && f !== "Not Selected")) {
        assert.ok(named.has(feat), `feat ${feat} is an entry`);
      }
    });
  }
});

describe("BuildParser with the mythic rules", () => {
  const build = BuildParser.getBuildFromJson(JSON.parse(fs.readFileSync(path.join(fixtureDir, "mythic-sorcerer12.json"), "utf8")));
  const parsed = parse(build);
  const location = (entry) => Seasoning.getFoundryFeatLocation(entry, { className: build.class });

  it("makes the calling, a special, a mythic feat for the calling's slot", () => {
    const calling = parsed.specials.find((s) => s.name === "Acrobat's Calling");
    assert.equal(calling.type, "Mythic Feat");
    assert.equal(calling.level, "calling");
    assert.equal(location(calling), "mythic-calling");
    assert.equal(Seasoning.getFeatLocationLevel(location(calling)), null);
  });

  it("puts mythic feats and the destiny in the mythic slots, taken at the slot's level", () => {
    const mythic = parsed.feats.filter((f) => ["Mythic Feat", "Destiny Mythic Feat"].includes(f.type));
    assert.deepEqual(mythic.map((f) => [f.originalName, location(f), Seasoning.getFeatLocationLevel(location(f))]), [
      ["Ears that Hear the Truth", "mythic-2", 2],
      ["Godspeed", "mythic-4", 4],
      ["Divert Destiny", "mythic-6", 6],
      ["Mythic Magic", "mythic-8", 8],
      ["Mythic Strike", "mythic-10", 10],
      ["Wildspell Dedication", "mythic-12", 12],
    ]);
  });
});
