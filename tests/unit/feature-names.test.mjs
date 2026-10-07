// The Foundry names a Pathbuilder feature name is also looked up under.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FEAT_RENAME_MAP } from "../../src/data/features.js";

const foundryNames = (pbName) => FEAT_RENAME_MAP(pbName).filter((e) => e.pbName === pbName).map((e) => e.foundryName);

describe("FEAT_RENAME_MAP", () => {
  it("drops the suffix Pathbuilder adds to a class feature's choice", () => {
    // Necromancer's Grim Fascination offers pf2e items named "Bone", "Blood", "Flesh" and "Spirit"
    assert.deepEqual(foundryNames("Bone Fascination"), ["Bone"]);
    assert.deepEqual(foundryNames("Wealth Mystery"), ["Wealth"]);
    assert.deepEqual(foundryNames("Gold Patron"), ["Gold"]);
  });

  it("uses the static map instead of the patterns when it has an entry", () => {
    assert.deepEqual(foundryNames("Air Element"), ["Air Gate"]);
  });
});
